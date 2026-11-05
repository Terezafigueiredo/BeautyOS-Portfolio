-- =========================================================
-- BeautyOS — Migration 001: estrutura segura do novo fluxo
-- de agendamento (Fase 0)
-- =========================================================
-- ESTA MIGRATION NÃO FOI EXECUTADA. Arquivo criado apenas para
-- revisão. Ver checklist de pré-voo no final deste arquivo antes
-- de sequer cogitar rodá-la contra o projeto Supabase real.
--
-- O QUE ESTA MIGRATION FAZ:
-- - Cria booking_requests, booking_request_contacts, payments,
--   payment_events e reschedule_requests, todas com RLS habilitado
--   e SEM nenhum grant/policy para "anon".
-- - Adiciona a "bookings" (tabela já existente e já com dados) as
--   colunas necessárias para o novo fluxo: booking_request_id,
--   payment_id, calendar_sync_status, google_calendar_event_id.
-- - Adiciona proteção real contra sobreposição de horários em
--   "bookings" (EXCLUDE constraint) e em "booking_requests"
--   ativas, usando ranges de tempo — não apenas comparação de
--   start_time.
-- - RECRIA a policy "bookings_public_insert" (já existente em
--   supabase/schema.sql) para impedir que o INSERT público/anônimo
--   preencha as colunas novas do fluxo seguro. Ver seção dedicada
--   "ATUALIZAÇÃO DE POLICY: bookings_public_insert" logo após as
--   alterações em "bookings", mais abaixo.
--
-- O QUE ESTA MIGRATION NÃO FAZ (de propósito, nesta etapa):
-- - NÃO revoga o INSERT público de "anon" em "bookings" — o
--   BookingModal.tsx atual continua funcionando exatamente como
--   hoje, criando o mesmo tipo de registro legado de sempre. Só a
--   REGRA da policy fica mais estrita (ver item acima): o mesmo
--   insert de sempre continua passando; um insert que tentasse
--   preencher as colunas novas seria rejeitado.
-- - NÃO mexe em nenhum dado existente de "bookings".
-- - NÃO implementa nada de Google Calendar nem PIX/Santander —
--   só prepara as colunas onde esses resultados vão pousar depois.
-- - NÃO cria Edge Functions.
--
-- CONTAGEM REAL DO SQL GERADO NESTA MIGRATION (conferida por
-- inspeção linha a linha do arquivo final, não estimada):
--   Tabelas novas ...................................... 5
--   Tipos enum novos ..................................... 2
--   Colunas novas em "bookings" .......................... 5
--     (booking_request_id, payment_id, google_calendar_event_id,
--      calendar_sync_status, time_range)
--   Índices via CREATE INDEX explícito ................... 9
--     (8 simples + 1 único parcial: payments_provider_reference_unique_idx)
--   Índices implícitos (de PRIMARY KEY / UNIQUE / EXCLUDE) ... 13
--     (5 de PRIMARY KEY das tabelas novas + 6 de UNIQUE
--      inline/table-level + 2 GiST criados pelos EXCLUDE)
--   EXCLUDE constraints ................................... 2
--     (booking_requests_no_overlap_active,
--      bookings_no_overlap_confirmed)
--   CHECK constraints ...................................... 8
--     (4 em booking_requests, 1 em payments, 1 em
--      reschedule_requests, 2 em bookings)
--   UNIQUE constraints além das PKs ........................ 6
--   Foreign keys novas ...................................... 8
--   Triggers novos (set_updated_at) ......................... 4
--     (booking_requests, booking_request_contacts, payments,
--      reschedule_requests — payment_events é log append-only,
--      propositalmente sem trigger de updated_at)
--   Policies novas (tabelas novas, admin-only) .............. 5
--   Policy recriada em tabela já existente ................... 1
--     (bookings_public_insert, em "bookings")
--   GRANTs novos ............................................... 5
--     (todos "to authenticated"; ZERO grants "to anon" em
--      qualquer uma das 5 tabelas novas)
--   RLS habilitada .......................................... 5 tabelas novas
--
-- SOBRE GENERATED COLUMNS E IMMUTABILIDADE (leia antes de alterar):
-- As colunas geradas "time_range" abaixo usam:
--   (event_date + start_time)                    -- date + time -> timestamp
--   + make_interval(mins => duration_minutes)     -- immutable
--   dentro de tsrange(...)                        -- construtor de tipo, immutable
--
-- Propositalmente NÃO usamos tstzrange nem qualquer cast para
-- "timestamptz": converter timestamp -> timestamptz depende do
-- fuso horário da sessão/servidor, o que torna a expressão STABLE
-- (não IMMUTABLE) e o PostgreSQL REJEITARIA a generated column (e
-- rejeitaria também um índice/EXCLUDE constraint com esse predicado).
-- Como o schema atual já trata event_date/start_time como horário
-- local "ingênuo" (sem timezone) em toda a tabela "bookings", usar
-- tsrange (timestamp sem timezone) é não só válido tecnicamente
-- como consistente com o resto do schema. Se no futuro o negócio
-- precisar operar em múltiplos fusos, isso exigirá um desenho
-- separado (guardar timezone explícito por registro), não apenas
-- trocar tsrange por tstzrange aqui.
--
-- Também NÃO usamos now() em nenhum predicado de índice ou EXCLUDE
-- constraint (now() é STABLE, não IMMUTABLE — o Postgres recusaria
-- a criação). Expiração de reservas temporárias é tratada por
-- UPDATEs explícitos de status (ver comentário em booking_requests),
-- nunca dentro da constraint.
--
-- Compatibilidade confirmada com os tipos EXATOS já usados hoje em
-- "bookings" (e replicados em "booking_requests"):
--   event_date        date
--   start_time        time            (sem timezone)
--   duration_minutes  integer
-- O operador "date + time" tem retorno "timestamp" (sem timezone) e
-- é IMMUTABLE; make_interval(mins => integer) é IMMUTABLE; o
-- construtor tsrange(timestamp, timestamp) é IMMUTABLE. Nenhuma das
-- três operações depende de configuração de sessão, então a cadeia
-- inteira da expressão é IMMUTABLE — pré-requisito do PostgreSQL
-- para aceitar STORED GENERATED COLUMN e para permitir a expressão
-- num predicado de EXCLUDE constraint. Não foi necessário recorrer
-- a uma alternativa por trigger.
-- =========================================================

begin;


-- =========================================================
-- TIPOS ENUMERADOS NOVOS
-- =========================================================

create type public.booking_request_status as enum (
  'aguardando_pagamento',
  'confirmado',
  'expirado',
  'cancelado',
  'conflito'
);

create type public.payment_status as enum (
  'pendente',
  'pago',
  'expirado',
  'cancelado',
  'estornado'
);


-- =========================================================
-- TABELA: booking_requests
-- Intenção/reserva temporária. Não contém dados pessoais (ver
-- booking_request_contacts) — só o necessário para calcular preço,
-- duração e checar disponibilidade/sobreposição.
-- =========================================================
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null references public.services(id),
  package_id uuid not null references public.packages(id),

  location public.booking_location not null,

  event_date date not null check (event_date >= current_date),
  ready_time time not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),

  -- Preço "congelado" no momento da criação, sempre calculado
  -- server-side a partir de packages — nunca aceito do frontend.
  -- Inteiro em centavos: evita qualquer ambiguidade de ponto
  -- flutuante em valor monetário.
  price_cents integer not null check (price_cents > 0),

  -- Intervalo [início, fim) usado para detectar sobreposição.
  -- Ver nota de immutabilidade no cabeçalho deste arquivo.
  time_range tsrange generated always as (
    tsrange(
      (event_date + start_time),
      (event_date + start_time) + make_interval(mins => duration_minutes)
    )
  ) stored,

  status public.booking_request_status not null default 'aguardando_pagamento',

  -- Prazo de expiração da reserva temporária. A constraint abaixo
  -- só garante expires_at > created_at; a TRANSIÇÃO de status para
  -- 'expirado' quando o prazo vence é responsabilidade de um job
  -- periódico (backend) e/ou de uma checagem "lazy" feita pelo
  -- próprio backend antes de tentar criar uma nova reserva para o
  -- mesmo horário — nunca da constraint em si, que não pode
  -- depender de now().
  expires_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (expires_at > created_at)
);

create index booking_requests_event_date_idx on public.booking_requests (event_date);
create index booking_requests_status_idx on public.booking_requests (status);
create index booking_requests_service_id_idx on public.booking_requests (service_id);
create index booking_requests_package_id_idx on public.booking_requests (package_id);

create trigger set_booking_requests_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();

-- Impede sobreposição de horário entre reservas temporárias ainda
-- ATIVAS (aguardando pagamento). Reservas expiradas/canceladas/
-- confirmadas/em conflito não entram nesta checagem — uma vez que
-- uma reserva sai do estado "aguardando_pagamento", ela para de
-- "segurar" o horário aqui (uma reserva confirmada passa a ser
-- protegida pela constraint equivalente em "bookings").
-- Não precisa da extensão btree_gist: um único range com o
-- operador && já é suportado nativamente pelo opclass gist de
-- tsrange. Se no futuro for preciso combinar com igualdade de
-- outra coluna (ex.: mais de uma profissional atendendo em
-- paralelo), btree_gist passa a ser necessária.
alter table public.booking_requests
  add constraint booking_requests_no_overlap_active
  exclude using gist (time_range with &&)
  where (status = 'aguardando_pagamento');


-- =========================================================
-- TABELA: booking_request_contacts
-- Dados pessoais da solicitação, separados em tabela própria de
-- propósito único: permite apagar SÓ os dados pessoais (retenção/
-- LGPD) de uma solicitação expirada/cancelada antiga sem precisar
-- tocar em booking_requests (que fica preservada para métricas/
-- auditoria). Relação 1:1 via chave primária compartilhada.
-- =========================================================
create table public.booking_request_contacts (
  booking_request_id uuid primary key
    references public.booking_requests(id) on delete cascade,

  client_name text not null,
  client_phone text not null,
  client_email text,

  -- Só relevante quando booking_requests.location = 'home'. Como
  -- CHECK constraints não podem referenciar outra tabela, essa
  -- regra (endereço obrigatório para atendimento a domicílio) fica
  -- a cargo do backend na criação — não é validada pelo banco.
  address text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_booking_request_contacts_updated_at
  before update on public.booking_request_contacts
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: payments
-- Cobrança PIX e seu estado. Modelada de forma agnóstica ao
-- provedor: nenhum campo aqui assume um mecanismo específico de
-- webhook/autenticação do Santander (isso ainda não foi confirmado
-- na documentação oficial da API que será usada).
-- =========================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),

  -- Uma solicitação tem no máximo uma cobrança ativa por vez.
  booking_request_id uuid not null unique
    references public.booking_requests(id),

  provider text not null default 'santander',

  -- Identificador retornado pelo provedor (ex.: txid ou equivalente).
  -- Nome e formato exatos a confirmar na documentação da API
  -- Santander antes de qualquer implementação. Fica nullable porque
  -- pode não estar disponível no instante da criação do registro.
  provider_reference text,

  -- Chave de idempotência gerada POR NÓS (não pelo provedor), usada
  -- na chamada de criação da cobrança para evitar cobrança duplicada
  -- em caso de retry do nosso próprio backend — não depende de o
  -- provedor suportar (ou de sabermos ainda) nenhum mecanismo
  -- específico de idempotência do lado dele.
  our_idempotency_key uuid not null unique default gen_random_uuid(),

  status public.payment_status not null default 'pendente',

  -- Inteiro em centavos — nunca float.
  amount_cents integer not null check (amount_cents > 0),

  qr_code_payload text,

  -- Preenchido quando o backend consulta o status da cobrança
  -- diretamente na API do provedor (fonte de verdade), não apenas
  -- quando um webhook chega.
  last_checked_at timestamptz,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_status_idx on public.payments (status);

-- Único quando presente; múltiplos NULL são permitidos (registro
-- criado antes de o provedor confirmar uma referência). Uma vez
-- preenchido, não pode se repetir entre pagamentos diferentes.
create unique index payments_provider_reference_unique_idx
  on public.payments (provider_reference)
  where provider_reference is not null;

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: payment_events
-- Log de eventos de webhook recebidos, usado apenas como DEFESA
-- ADICIONAL contra processamento duplicado (reentrega do mesmo
-- webhook). A confirmação real do pagamento sempre depende de o
-- backend validar o status diretamente com o provedor — este log
-- não substitui essa validação, só evita reprocessar o mesmo
-- payload mais de uma vez.
-- =========================================================
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,

  -- Hash (ex.: sha256) do payload bruto recebido. Usado para dedupe
  -- sem presumir que o provedor forneça um id de evento estável —
  -- isso ainda não foi confirmado na documentação Santander.
  payload_hash text not null,

  received_at timestamptz not null default now(),

  unique (payment_id, payload_hash)
);

create index payment_events_payment_id_idx on public.payment_events (payment_id);


-- =========================================================
-- TABELA: reschedule_requests
-- Aviso para a administradora quando o horário desejado já está
-- ocupado (ou um conflito é descoberto na revalidação pós-
-- pagamento). Não duplica dados pessoais: quando vinculada a uma
-- booking_request, o contato já está em booking_request_contacts.
-- =========================================================
create table public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),

  -- Nulo quando o conflito é detectado ANTES de existir uma
  -- reserva temporária (ex.: já na primeira checagem de
  -- disponibilidade, antes de gerar o PIX).
  booking_request_id uuid references public.booking_requests(id) on delete set null,

  event_date date not null,
  desired_time time not null,

  status text not null default 'aberto'
    check (status in ('aberto', 'resolvido', 'descartado')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reschedule_requests_booking_request_id_idx
  on public.reschedule_requests (booking_request_id);
create index reschedule_requests_status_idx on public.reschedule_requests (status);

create trigger set_reschedule_requests_updated_at
  before update on public.reschedule_requests
  for each row execute function public.set_updated_at();


-- =========================================================
-- ALTERAÇÕES EM: bookings (tabela existente, já com dados)
-- =========================================================
-- Todas as colunas novas são NULLABLE (ou têm DEFAULT compatível
-- com linhas existentes), então a linha de teste atual continua
-- válida sem nenhuma migração de dado. Bookings criados pelo fluxo
-- ATUAL (via bookings_public_insert) continuam não preenchendo
-- nenhuma dessas colunas novas — o CHECK abaixo só garante
-- consistência interna, não obriga preenchimento.

alter table public.bookings
  add column booking_request_id uuid unique references public.booking_requests(id),
  add column payment_id uuid unique references public.payments(id),
  add column google_calendar_event_id text unique,
  add column calendar_sync_status text not null default 'pendente'
    check (calendar_sync_status in ('pendente', 'sincronizado', 'falhou'));

-- Um booking do novo fluxo tem SEMPRE os dois vínculos juntos
-- (veio de uma booking_request paga); um booking legado/criado
-- manualmente pelo painel admin tem os dois nulos. Nunca um só.
alter table public.bookings
  add constraint bookings_request_and_payment_together
  check ((booking_request_id is null) = (payment_id is null));

-- Intervalo [início, fim) para detectar sobreposição — mesma lógica
-- e mesma justificativa de immutabilidade da tabela booking_requests
-- (ver cabeçalho do arquivo).
alter table public.bookings
  add column time_range tsrange generated always as (
    tsrange(
      (event_date + start_time),
      (event_date + start_time) + make_interval(mins => duration_minutes)
    )
  ) stored;

-- Impede sobreposição entre bookings que ainda "ocupam" a agenda.
-- status <> 'cancelado' (em vez de "= 'confirmado'") para já
-- cobrir de graça um eventual status futuro como 'concluido', que
-- também representa um intervalo que de fato aconteceu.
--
-- ATENÇÃO — pré-requisito antes de rodar isto de verdade: se já
-- existir mais de um registro de teste em "bookings" com status
-- diferente de 'cancelado' e horários sobrepostos, esta constraint
-- FALHARÁ ao ser criada. Ver checklist de pré-voo no final deste
-- arquivo.
alter table public.bookings
  add constraint bookings_no_overlap_confirmed
  exclude using gist (time_range with &&)
  where (status <> 'cancelado');


-- =========================================================
-- ATUALIZAÇÃO DE POLICY: bookings_public_insert
-- =========================================================
-- Esta policy já existe hoje (criada em supabase/schema.sql) e é o
-- único INSERT público de todo o banco — é o que o BookingModal.tsx
-- legado usa. Ela precisa ser RECRIADA aqui, não porque o insert
-- legado vá mudar de comportamento, mas porque as 4 colunas novas
-- adicionadas acima a "bookings" ficam, por padrão, ao alcance desse
-- mesmo INSERT: o GRANT table-level "insert on public.bookings to
-- anon" (definido no schema original) autoriza "anon" a enviar
-- QUALQUER coluna da tabela no payload, incluindo as novas — o
-- DEFAULT de calendar_sync_status só se aplica quando a coluna é
-- OMITIDA do INSERT; se o payload a enviar explicitamente com outro
-- valor, o default nunca entra em ação. Por isso a checagem certa é
-- na WITH CHECK da policy, não no default da coluna.
--
-- A nova WITH CHECK abaixo exige, além das duas condições que já
-- existiam (status = 'pendente' e client_id is null), que as 4
-- colunas novas estejam todas NULL/no valor neutro — ou seja, um
-- INSERT anônimo só pode continuar criando exatamente o mesmo tipo
-- de registro legado "solto" de sempre. Qualquer tentativa de
-- vincular o insert a uma booking_request, a um payment, a um
-- evento do Calendar, ou de declarar sincronismo de calendário, é
-- rejeitada pelo RLS antes mesmo de a linha ser gravada.
drop policy if exists "bookings_public_insert" on public.bookings;

create policy "bookings_public_insert"
  on public.bookings
  for insert
  to anon
  with check (
    status = 'pendente'
    and client_id is null
    and booking_request_id is null
    and payment_id is null
    and google_calendar_event_id is null
    and calendar_sync_status = 'pendente'
  );


-- =========================================================
-- ROW LEVEL SECURITY — tabelas novas
-- =========================================================
-- Mesmo padrão já usado em "clients" no schema original: NENHUM
-- grant para "anon" em nenhuma das cinco tabelas novas — o acesso
-- público fica bloqueado antes mesmo de qualquer política de RLS
-- ser avaliada. Escrita/leitura só para administradoras autenticadas
-- (is_admin() = true) ou para o backend via service_role (que
-- ignora RLS por definição do Supabase e não precisa de policy).

alter table public.booking_requests enable row level security;
alter table public.booking_request_contacts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.reschedule_requests enable row level security;

grant select, insert, update, delete on public.booking_requests to authenticated;
grant select, insert, update, delete on public.booking_request_contacts to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payment_events to authenticated;
grant select, insert, update, delete on public.reschedule_requests to authenticated;

create policy "booking_requests_admin_full_access"
  on public.booking_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "booking_request_contacts_admin_full_access"
  on public.booking_request_contacts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "payments_admin_full_access"
  on public.payments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "payment_events_admin_full_access"
  on public.payment_events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "reschedule_requests_admin_full_access"
  on public.reschedule_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


commit;


-- =========================================================
-- CHECKLIST DE PRÉ-VOO (antes de sequer cogitar executar isto
-- contra o projeto Supabase real — NÃO foi verificado nesta etapa)
-- =========================================================
-- 1. Rodar (só leitura, sem alterar nada) para confirmar que não há
--    dois bookings com status <> 'cancelado' e horário sobreposto
--    hoje — senão "bookings_no_overlap_confirmed" falha ao ser
--    criada:
--
--      select b1.id, b2.id
--      from public.bookings b1
--      join public.bookings b2
--        on b1.id < b2.id
--       and b1.status <> 'cancelado'
--       and b2.status <> 'cancelado'
--       and b1.event_date = b2.event_date
--       and (b1.event_date + b1.start_time,
--            b1.event_date + b1.start_time
--              + make_interval(mins => b1.duration_minutes))
--           overlaps
--           (b2.event_date + b2.start_time,
--            b2.event_date + b2.start_time
--              + make_interval(mins => b2.duration_minutes));
--
-- 2. Confirmar, em ambiente de homologação (nunca direto em
--    produção), que a migration inteira roda sem erro antes de
--    aplicar no projeto real.
--
-- 3. Depois de aplicada em homologação, testar com a chave
--    publishable (não com service_role) que um INSERT idêntico ao
--    payload que o BookingModal.tsx envia hoje continua sendo
--    aceito por "bookings_public_insert" — e que um INSERT que
--    tente preencher booking_request_id, payment_id,
--    google_calendar_event_id ou calendar_sync_status com valor
--    diferente de 'pendente' é rejeitado.
--
-- 4. Só depois disso — e só quando o backend estiver pronto para
--    passar a usar estas tabelas — considerar revogar
--    "bookings_public_insert" em uma migration separada.
-- =========================================================
