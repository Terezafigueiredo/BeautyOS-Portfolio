-- =========================================================
-- BeautyOS — Migration 002: fundações de backend da Fase 1
-- (idempotência, rate limiting, remanejamento com notificação,
-- esqueleto de create_booking_request)
-- =========================================================
-- ESTA MIGRATION NÃO FOI EXECUTADA. Arquivo criado apenas para
-- revisão local. Pressupõe que 001_secure_booking_architecture.sql
-- já foi aplicada com sucesso no projeto Supabase real.
--
-- DECISÕES DE NEGÓCIO JÁ ADOTADAS NESTA MIGRATION:
-- - Retenção de contato de remanejamento abandonado: 14 dias.
--   (a EXECUÇÃO dessa limpeza — um job periódico — NÃO está nesta
--   migration; aqui só deixamos o valor documentado como parâmetro
--   de referência para quando esse job for implementado.)
-- - notification_outbox.max_attempts: default 5.
-- - reschedule_requests.booking_request_id passa a ser NOT NULL —
--   o novo fluxo de conflito (ver função no final deste arquivo)
--   sempre cria a booking_request antes do reschedule_request; o
--   caso de vínculo nulo do desenho anterior deixou de existir.
--
-- REVISÃO DESTA VERSÃO (em relação à primeira): dois pontos
-- bloqueantes foram corrigidos antes da aprovação —
-- 1) rate limiting estava desconectado de create_booking_request e
--    o padrão óbvio (SELECT count, IF, INSERT) tem corrida entre
--    requisições concorrentes; agora há uma função dedicada,
--    check_and_record_rate_limit(...), que resolve isso com um
--    advisory lock transacional por identificador (ver seção 2b) —
--    explicado ANTES de ser conectado a create_booking_request,
--    exatamente como pedido.
-- 2) O TTL de 15 minutos deixou de estar fixo dentro da função —
--    agora é um parâmetro (p_reservation_ttl_minutes) que só o
--    BACKEND fornece; o navegador nunca tem esse parâmetro no
--    contrato de POST /booking-request, então nunca pode influenciá-lo.
-- 3) O pré-voo em produção revelou que o schema "public" deste
--    projeto tem uma regra de ALTER DEFAULT PRIVILEGES da própria
--    plataforma Supabase que concede automaticamente um conjunto
--    amplo de privilégios (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/
--    REFERENCES/TRIGGER, e MAINTAIN em Postgres 17+) a "anon" e
--    "authenticated" em TODA tabela nova — mesmo em tabelas para as
--    quais nenhuma linha "grant ... to anon" jamais existiu neste
--    projeto. Isso já afeta booking_requests/booking_request_contacts/
--    reschedule_requests (criadas na migration 001) e afetaria, pelo
--    mesmo motivo, rate_limit_attempts/notification_outbox no
--    instante em que seus CREATE TABLE rodassem. A seção 4b abaixo
--    adiciona hardening explícito por tabela para não depender dos
--    defaults da plataforma — sem alterá-los globalmente (isso fica
--    fora do escopo desta migration, por decisão explícita).
-- 4) O mesmo problema dos default privileges também afeta FUNÇÕES,
--    não só tabelas: um pós-voo em produção (contra uma versão
--    anterior desta migration, já aplicada) confirmou que
--    "REVOKE EXECUTE ... FROM PUBLIC" sozinho não impediu que
--    anon/authenticated/service_role recebessem EXECUTE direto em
--    ambas as funções no momento da criação. Corrigido aqui para
--    instalações futuras revogando explicitamente as quatro roles
--    (public, anon, authenticated, service_role) logo após cada
--    CREATE FUNCTION. Para a produção já existente (onde esta
--    migration já rodou sem essa correção), a correção real está em
--    supabase/migrations/003_lock_down_backend_functions.sql.
--
-- O QUE ESTA MIGRATION FAZ:
-- 1. Adiciona booking_requests.client_request_id (idempotência),
--    com backfill seguro para linhas pré-existentes antes de
--    torná-la NOT NULL + UNIQUE.
-- 2. Cria rate_limit_attempts (sem IP/telefone em texto puro) e a
--    função check_and_record_rate_limit(...) que aplica o limite de
--    forma atômica (advisory lock), sem PII e sem nenhum segredo.
-- 3. Cria o tipo notification_status e a tabela notification_outbox.
-- 4. Torna reschedule_requests.booking_request_id NOT NULL, com uma
--    verificação prévia que ABORTA a migration inteira (sem apagar
--    nada) se encontrar alguma linha NULL hoje.
-- 5. Cria a função public.create_booking_request(...) — a lógica
--    transacional completa (idempotência, rate limiting atômico,
--    catálogo como fonte de preço/duração, TTL controlado pelo
--    backend, conflito com booking_requests, conflito com bookings,
--    caminho de conflito com reschedule_request + notification_outbox)
--    — MAS sem conceder EXECUTE a ninguém.
-- 6. Aplica hardening explícito de privilégios (REVOKE ALL + GRANT
--    mínimo) em booking_requests, booking_request_contacts,
--    reschedule_requests, notification_outbox, rate_limit_attempts
--    e bookings — independente dos default privileges da
--    plataforma, preservando o único INSERT de anon que o
--    BookingModal atual precisa.
--
-- O QUE ESTA MIGRATION NÃO FAZ (de propósito):
-- - NÃO altera nenhuma EXCLUDE constraint existente (nem a de
--   booking_requests, nem a de bookings) — ver explicação na seção
--   dedicada, mais abaixo, sobre por que isso não é necessário.
-- - NÃO concede EXECUTE em create_booking_request nem em
--   check_and_record_rate_limit para anon, para authenticated, nem
--   para nenhuma role específica. Quem poderá chamar a função é uma
--   decisão separada, ainda pendente de revisão da documentação
--   atual do Supabase — ver checklist no final do arquivo.
-- - NÃO implementa Google Calendar, Santander/PIX ou WhatsApp.
-- - NÃO cria Edge Function nem Vercel Function.
-- - NÃO cria o job periódico de expurgo de 14 dias (só documenta o
--   valor decidido).
-- - NÃO expõe rate_limit_attempts para o painel/admin nesta etapa.
-- - Nenhum secret é adicionado neste arquivo — o segredo HMAC usado
--   para calcular p_ip_hash/p_phone_hash vive só no backend; o
--   Postgres nunca vê o segredo, nem o IP/telefone em texto puro,
--   só os hashes já calculados.
-- =========================================================

begin;


-- =========================================================
-- 1. booking_requests.client_request_id (idempotência)
-- =========================================================
-- Adicionada NULLABLE primeiro, para não quebrar linhas que já
-- existirem na tabela (mesmo sem nenhum backend escrevendo nela
-- ainda, tratamos essa possibilidade com segurança em vez de supor).
-- Cada linha pré-existente sem client_request_id recebe um UUID
-- sintético via backfill — não corresponde a nenhuma tentativa real
-- de cliente, é só o que torna seguro promover a coluna a NOT NULL
-- + UNIQUE logo em seguida, sem apagar ou rejeitar nenhuma linha.
alter table public.booking_requests
  add column client_request_id uuid;

update public.booking_requests
  set client_request_id = gen_random_uuid()
  where client_request_id is null;

alter table public.booking_requests
  alter column client_request_id set not null;

alter table public.booking_requests
  add constraint booking_requests_client_request_id_key unique (client_request_id);


-- =========================================================
-- 2. rate_limit_attempts
-- =========================================================
-- Nenhum IP ou telefone em texto puro: identifier_hash é um HMAC
-- calculado no backend com um segredo só de servidor (não guardado
-- aqui) — mesmo com acesso de leitura à tabela, não dá para
-- reverter para o valor original sem esse segredo.
create table public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('ip', 'phone')),
  identifier_hash text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_attempts_lookup_idx
  on public.rate_limit_attempts (scope, identifier_hash, created_at);

alter table public.rate_limit_attempts enable row level security;

-- Nenhum GRANT explícito é escrito aqui de propósito — mas o
-- pré-voo em produção confirmou que isso NÃO é suficiente: os
-- default privileges da plataforma concedem um ACL amplo a "anon"/
-- "authenticated" em toda tabela nova, independente do que este
-- arquivo escreve. A seção 4b, mais abaixo, revoga esse excesso
-- explicitamente para esta tabela (nem anon nem authenticated ficam
-- com nada — decisão explícita: não precisamos exibir estes
-- registros no BeautyOS nesta fase). A ÚNICA forma de gravar/ler
-- aqui, depois do hardening, é a função abaixo, SECURITY DEFINER.


-- =========================================================
-- 2b. check_and_record_rate_limit(...) — aplicação ATÔMICA do limite
-- =========================================================
-- POR QUE NÃO "SELECT count(...) / IF / INSERT":
-- Esses três passos, se forem três statements separados (ou mesmo
-- um SELECT seguido de um INSERT condicional dentro da mesma
-- função, sem nenhuma serialização entre os dois), NÃO são atômicos
-- entre si. Sob READ COMMITTED (o padrão do Postgres), duas chamadas
-- concorrentes para o MESMO identificador podem cada uma rodar seu
-- próprio SELECT count(...), ambas verem por exemplo count=4 num
-- limite de 5, ambas concluírem "pode passar" e ambas inserirem —
-- resultado: 6 tentativas gravadas onde só 5 deveriam ter sido
-- permitidas. Um SELECT não trava nada que impeça um INSERT
-- concorrente de outra sessão.
--
-- SOLUÇÃO ADOTADA: advisory lock transacional (pg_advisory_xact_lock)
-- derivado do próprio identificador (scope + identifier_hash). Duas
-- chamadas concorrentes para o MESMO identificador são serializadas
-- pelo lock — a segunda só executa seu SELECT depois que a primeira
-- já terminou (commit/rollback da transação que a chama), então
-- sempre enxerga o efeito da primeira antes de decidir. Chamadas
-- para identificadores DIFERENTES usam chaves de lock diferentes e
-- não se bloqueiam entre si — não vira gargalo para a tabela toda.
-- O lock é liberado automaticamente ao fim da transação chamadora
-- (não precisa de "unlock" manual, não sobrevive além da chamada).
--
-- Tentativas BLOQUEADAS (limite já atingido) não geram uma nova
-- linha em rate_limit_attempts — só as tentativas realmente
-- permitidas são gravadas. Isso mantém a leitura do limite correta
-- (mais linhas bloqueadas não mudariam a decisão) e evita que a
-- própria tabela de rate limit vire um vetor de crescimento
-- descontrolado sob abuso sustentado contra um único identificador.
--
-- Janela/limite são parâmetros da função, não valores fixos aqui —
-- quem decide os números é create_booking_request (ver comentário
-- de "valores propostos, ajustáveis" na declaração dessa função).
create or replace function public.check_and_record_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_lock_key bigint;
  v_count integer;
begin
  if p_scope not in ('ip', 'phone') then
    raise exception 'scope_invalido';
  end if;

  v_lock_key := hashtextextended(p_scope || ':' || p_identifier_hash, 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select count(*) into v_count
    from public.rate_limit_attempts
    where scope = p_scope
      and identifier_hash = p_identifier_hash
      and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_attempts (scope, identifier_hash)
    values (p_scope, p_identifier_hash);

  return true;
end;
$fn$;

-- O PostgreSQL concede EXECUTE a PUBLIC por padrão em toda função
-- nova — revogado abaixo. Um pós-voo em produção (numa versão
-- anterior desta migration, que só tinha o REVOKE de PUBLIC)
-- revelou que isso SOZINHO não basta: os default privileges deste
-- projeto Supabase também concedem EXECUTE DIRETO a anon,
-- authenticated e service_role no momento da criação de qualquer
-- função no schema public — independente de esta migration ter
-- escrito algum "grant execute" explícito (mesmo padrão já visto
-- nas tabelas, ver seção 4b). Por isso as quatro roles são
-- revogadas aqui, uma por uma, sempre com a assinatura exata da
-- função — nunca o nome sozinho — para não atingir um overload
-- diferente por engano. A chamada interna a partir de
-- create_booking_request continua funcionando mesmo assim, porque
-- ambas rodam como SECURITY DEFINER sob o mesmo dono/contexto, que
-- nunca é afetado por REVOKE de anon/authenticated/service_role.
-- Nenhuma delas recebe EXECUTE de volta nesta fase — nem
-- service_role, propositalmente: a estratégia de quem vai chamar
-- esta função ainda não foi decidida, e não queremos nenhum caminho
-- de chamada "por acidente" enquanto isso não for definido.
revoke execute on function public.check_and_record_rate_limit(
  text, text, integer, integer
) from public;
revoke execute on function public.check_and_record_rate_limit(
  text, text, integer, integer
) from anon;
revoke execute on function public.check_and_record_rate_limit(
  text, text, integer, integer
) from authenticated;
revoke execute on function public.check_and_record_rate_limit(
  text, text, integer, integer
) from service_role;


-- =========================================================
-- 3. notification_status + notification_outbox
-- =========================================================
create type public.notification_status as enum ('pending', 'sent', 'failed');

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),

  reschedule_request_id uuid not null
    references public.reschedule_requests(id) on delete cascade,

  -- canal preparado para extensão futura; nenhum provedor decidido.
  channel text not null default 'whatsapp_admin',

  status public.notification_status not null default 'pending',

  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,

  -- Mensagem de erro SANITIZADA pela aplicação antes de gravar aqui
  -- (nunca stack trace bruto, nunca token/segredo do provedor). O
  -- limite de tamanho abaixo é só uma proteção adicional contra
  -- registro acidental de algo muito maior do que deveria.
  last_error text check (char_length(last_error) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Evita duas linhas de alerta para o mesmo evento/canal.
  unique (reschedule_request_id, channel)
);

create index notification_outbox_status_idx on public.notification_outbox (status);

create trigger set_notification_outbox_updated_at
  before update on public.notification_outbox
  for each row execute function public.set_updated_at();

alter table public.notification_outbox enable row level security;

create policy "notification_outbox_admin_full_access"
  on public.notification_outbox
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- O GRANT para authenticated (e o REVOKE explícito do excesso vindo
-- dos default privileges da plataforma, incluindo qualquer acesso
-- residual de anon) fica centralizado na seção 4b, junto com o
-- hardening das outras tabelas — não repetido aqui, para não deixar
-- dois lugares diferentes decidindo o mesmo ACL. O worker de envio
-- (futuro, não criado agora) terá sua própria role dedicada e suas
-- próprias RPCs, mesmo padrão de menor privilégio já usado em
-- create_booking_request mais abaixo — não detalhado nesta migration.


-- =========================================================
-- 4. reschedule_requests.booking_request_id -> NOT NULL
-- =========================================================
-- Verificação prévia OBRIGATÓRIA: aborta a migration inteira (sem
-- apagar nada, já que estamos dentro de begin/commit) se encontrar
-- qualquer linha com booking_request_id NULL hoje. Isso transforma
-- uma suposição não verificada num erro claro e seguro, em vez de
-- uma tentativa cega de "alter column set not null" que falharia
-- de forma menos informativa (ou, pior, que teria que ser forçada
-- apagando/alterando dado existente).
do $$
declare
  v_null_count integer;
begin
  select count(*) into v_null_count
  from public.reschedule_requests
  where booking_request_id is null;

  if v_null_count > 0 then
    raise exception
      'Migration abortada: % linha(s) em reschedule_requests com booking_request_id NULL. '
      'Resolva manualmente (vincular a uma booking_request real, ou remover a linha) '
      'antes de aplicar esta migration.',
      v_null_count;
  end if;
end;
$$;

alter table public.reschedule_requests
  alter column booking_request_id set not null;

-- A constraint original tinha "on delete set null" — contraditório
-- com uma coluna agora NOT NULL (se algum dia se tentasse apagar a
-- booking_request referenciada, o "set null" falharia em runtime
-- contra o NOT NULL, de um jeito confuso). Trocamos por comportamento
-- padrão (NO ACTION): apagar uma booking_request que ainda tenha uma
-- reschedule_request vinculada passa a ser bloqueado explicitamente,
-- em vez de silenciosamente tentado e falho.
--
-- O nome exato da constraint original não é assumido por adivinhação
-- da convenção de nomes do Postgres — é localizado dinamicamente no
-- catálogo do sistema (pg_constraint), que não é entrada de usuário,
-- então não há risco de injeção aqui.
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att
    on att.attrelid = rel.oid
   and att.attnum = any(con.conkey)
  where rel.relname = 'reschedule_requests'
    and con.contype = 'f'
    and att.attname = 'booking_request_id';

  if v_constraint_name is not null then
    execute format(
      'alter table public.reschedule_requests drop constraint %I',
      v_constraint_name
    );
  end if;
end;
$$;

alter table public.reschedule_requests
  add constraint reschedule_requests_booking_request_id_fkey
  foreign key (booking_request_id) references public.booking_requests(id);


-- =========================================================
-- 4b. HARDENING EXPLÍCITO DE PRIVILÉGIOS
-- (independente dos default privileges da plataforma)
-- =========================================================
-- O pré-voo em produção confirmou uma regra de ALTER DEFAULT
-- PRIVILEGES da própria plataforma Supabase no schema "public",
-- que concede automaticamente um ACL amplo (SELECT, INSERT, UPDATE,
-- DELETE, TRUNCATE, REFERENCES, TRIGGER e, em Postgres 17+,
-- MAINTAIN) a "anon" e "authenticated" em toda tabela nova — mesmo
-- em tabelas para as quais NENHUMA linha "grant ... to anon" jamais
-- existiu neste projeto (foi assim que booking_requests,
-- booking_request_contacts e reschedule_requests, criadas na
-- migration 001 sem nenhum grant explícito a "anon", acabaram com
-- esse ACL amplo mesmo assim).
--
-- ESTA MIGRATION NÃO ALTERA os default privileges globais da
-- plataforma — isso é uma correção de escopo de projeto, tratada
-- separadamente, se e quando decidido. Em vez disso, cada tabela
-- sensível recebe aqui um REVOKE ALL explícito seguido do GRANT
-- mínimo necessário, para que o ACL final fique correto por si só,
-- independente do que os defaults da plataforma continuarem
-- concedendo por trás — e independente de esta migration rodar
-- antes ou depois de uma eventual correção dos defaults.
--
-- Por que "REVOKE ALL" em vez de listar TRUNCATE/REFERENCES/
-- TRIGGER/MAINTAIN um por um: "ALL" é resolvido pelo próprio
-- PostgreSQL para o conjunto de privilégios válido para tabelas
-- NESTA versão do servidor. Em Postgres anterior à versão 17 (sem
-- o privilégio MAINTAIN), "ALL" nunca inclui MAINTAIN, porque esse
-- privilégio simplesmente não existe nessa versão; em Postgres 17+,
-- "ALL" já inclui MAINTAIN automaticamente. Isso evita qualquer
-- suposição explícita sobre a versão do servidor, sem precisar de
-- nenhum bloco condicional — o comportamento correto emerge do
-- próprio "ALL". REVOKE também é seguro mesmo que o role não tenha
-- algum desses privilégios (não é erro revogar o que não existe).

-- --- booking_requests ---
revoke all on table public.booking_requests from anon;
revoke all on table public.booking_requests from authenticated;
grant select, insert, update, delete on public.booking_requests to authenticated;

-- --- booking_request_contacts ---
revoke all on table public.booking_request_contacts from anon;
revoke all on table public.booking_request_contacts from authenticated;
grant select, insert, update, delete on public.booking_request_contacts to authenticated;

-- --- reschedule_requests ---
revoke all on table public.reschedule_requests from anon;
revoke all on table public.reschedule_requests from authenticated;
grant select, insert, update, delete on public.reschedule_requests to authenticated;

-- --- notification_outbox ---
revoke all on table public.notification_outbox from anon;
revoke all on table public.notification_outbox from authenticated;
grant select, insert, update, delete on public.notification_outbox to authenticated;

-- --- rate_limit_attempts ---
-- Nem anon nem authenticated precisam de qualquer privilégio aqui —
-- só a função check_and_record_rate_limit() (SECURITY DEFINER) toca
-- esta tabela, antes e depois deste hardening.
revoke all on table public.rate_limit_attempts from anon;
revoke all on table public.rate_limit_attempts from authenticated;

-- --- bookings ---
-- CUIDADO: "bookings" é a ÚNICA tabela desta lista onde "anon"
-- precisa reter um privilégio de verdade. O BookingModal.tsx atual
-- depende do INSERT público, via a policy "bookings_public_insert"
-- (criada na migration 001, NÃO alterada aqui). O REVOKE ALL abaixo
-- remove tudo primeiro (incluindo o próprio INSERT), e o GRANT
-- seguinte devolve exatamente o INSERT — nada mais.
-- SELECT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN(se
-- existir) ficam removidos de anon. Isso não muda em nada o que o
-- BookingModal consegue fazer hoje: a policy já limitava o que esse
-- INSERT podia gravar; aqui só fechamos o excesso de privilégio que
-- existia por trás da policy, sem tocar na policy em si.
revoke all on table public.bookings from anon;
grant insert on public.bookings to anon;

revoke all on table public.bookings from authenticated;
grant select, insert, update, delete on public.bookings to authenticated;


-- =========================================================
-- 5. EXCLUDE constraints existentes — NENHUMA alteração
-- =========================================================
-- booking_requests_no_overlap_active tem WHERE (status =
-- 'aguardando_pagamento'). Uma linha com status = 'conflito' nunca
-- entra nessa checagem, porque não satisfaz o predicado — é
-- exatamente esse comportamento (já existente desde a migration
-- 001, sem precisar de nenhuma mudança) que permite à função abaixo
-- inserir uma booking_request em conflito sem jamais esbarrar nessa
-- constraint. bookings_no_overlap_confirmed também fica intacta —
-- o conflito contra bookings confirmados é resolvido por uma
-- consulta explícita dentro da função (não há EXCLUDE cruzando
-- tabelas no PostgreSQL).


-- =========================================================
-- 6. FUNÇÃO: public.create_booking_request(...)
-- =========================================================
-- Esqueleto da lógica TRANSACIONAL apenas. A pergunta "quem pode
-- executar esta função" é deliberadamente uma decisão SEPARADA,
-- ainda não tomada — ver REVOKE ao final desta seção e o checklist
-- no rodapé do arquivo. Até essa decisão, a função existe mas
-- ninguém consegue chamá-la, nem sequer "authenticated".
--
-- Trust boundary desta função: ela confia que QUEM A CHAMAR já
-- validou formato/tamanho de client_name/client_phone/client_email/
-- address/notes (essa validação foi desenhada para viver na camada
-- de aplicação, não em SQL). O que esta função garante são as
-- invariantes de negócio críticas e não-contornáveis: preço/duração
-- vindos só do catálogo, atomicidade da escrita, e as duas checagens
-- de conflito de horário (contra outras booking_requests ativas via
-- EXCLUDE, e contra bookings confirmados via consulta explícita).
create or replace function public.create_booking_request(
  p_client_request_id uuid,
  p_package_id uuid,
  p_location public.booking_location,
  p_event_date date,
  p_ready_time time,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_address text,
  p_notes text,
  -- Hashes calculados PELO BACKEND (HMAC com segredo só de servidor,
  -- nunca presente neste SQL). O Postgres nunca recebe IP/telefone
  -- em texto puro para fins de rate limiting.
  p_ip_hash text,
  p_phone_hash text,
  -- TTL da reserva: SEMPRE fornecido pelo backend, nunca pelo
  -- navegador. O contrato HTTP de POST /booking-request não inclui
  -- nenhum campo de TTL/expires_at — isso é decidido inteiramente
  -- no lado do servidor, fora do alcance do cliente.
  p_reservation_ttl_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  -- Limites de rate limiting: valores PROPOSTOS, claramente
  -- ajustáveis aqui (um único lugar) numa migration futura, sem
  -- mexer no resto da função. IP mais permissivo (pode ser
  -- compartilhado por várias clientes legítimas na mesma rede);
  -- telefone mais restrito (uma cliente real raramente precisa de
  -- muitas tentativas na mesma hora).
  c_rate_limit_ip_window_seconds constant integer := 600;    -- 10 minutos
  c_rate_limit_ip_limit constant integer := 5;
  c_rate_limit_phone_window_seconds constant integer := 3600; -- 60 minutos
  c_rate_limit_phone_limit constant integer := 3;

  -- Limite de sanidade do TTL recebido do backend — não é uma
  -- decisão de negócio, é só uma proteção contra um valor
  -- claramente incorreto (0, negativo, ou absurdamente alto) chegar
  -- por bug do lado do chamador.
  c_reservation_ttl_max_minutes constant integer := 180;

  v_package record;
  v_duration_minutes integer;
  v_price_cents integer;
  v_start_time time;
  v_expires_at timestamptz;
  v_requested_range tsrange;
  v_confirmed_conflict boolean;
  v_status_to_try public.booking_request_status;
  v_booking_request_id uuid;
  v_reschedule_request_id uuid;
  v_existing record;
begin
  -- 0. IDEMPOTÊNCIA (caminho normal): cobre a grande maioria dos
  -- casos de duplo clique/retry sem precisar de nenhum lock
  -- explícito, só consultando a UNIQUE já criada na seção 1.
  select id, status, expires_at, price_cents, duration_minutes, start_time
    into v_existing
    from public.booking_requests
    where client_request_id = p_client_request_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'booking_request_id', v_existing.id,
      'status', v_existing.status,
      'expires_at', v_existing.expires_at,
      'price_cents', v_existing.price_cents,
      'duration_minutes', v_existing.duration_minutes,
      'start_time', v_existing.start_time
    );
  end if;

  -- 0.1 TTL: validação de sanidade só, ANTES de gastar uma tentativa
  -- de rate limit com um parâmetro obviamente errado. Isto não é a
  -- decisão de negócio do valor (essa continua no backend) — é só
  -- proteção contra bug (0, negativo, valor absurdo).
  if p_reservation_ttl_minutes is null
     or p_reservation_ttl_minutes <= 0
     or p_reservation_ttl_minutes > c_reservation_ttl_max_minutes then
    raise exception 'ttl_invalido';
  end if;

  -- 0.5 RATE LIMITING — atômico via check_and_record_rate_limit()
  -- (ver explicação completa da corrida evitada na seção 2b deste
  -- arquivo). Roda DEPOIS da checagem de idempotência (0): um retry
  -- legítimo do MESMO client_request_id nunca consome uma tentativa
  -- nova de rate limit, porque já teria retornado antes de chegar
  -- aqui. Roda ANTES de qualquer consulta ao catálogo, para não
  -- gastar trabalho de banco com abuso.
  if not public.check_and_record_rate_limit(
    'ip', p_ip_hash, c_rate_limit_ip_window_seconds, c_rate_limit_ip_limit
  ) then
    raise exception 'limite_de_tentativas_excedido';
  end if;

  if not public.check_and_record_rate_limit(
    'phone', p_phone_hash, c_rate_limit_phone_window_seconds, c_rate_limit_phone_limit
  ) then
    raise exception 'limite_de_tentativas_excedido';
  end if;

  -- 1. CATÁLOGO é a única fonte de preço/duração. service_id é
  -- sempre derivado de package_id — nunca aceito como parâmetro
  -- separado, então não existe "pacote não pertence ao serviço".
  select p.id, p.service_id, p.fixed_price, p.studio_price, p.home_price,
         p.duration_minutes
    into v_package
    from public.packages p
    join public.services s on s.id = p.service_id
    where p.id = p_package_id
      and p.is_active = true
      and s.is_active = true;

  if not found then
    raise exception 'pacote_invalido';
  end if;

  v_duration_minutes := v_package.duration_minutes;

  if v_package.fixed_price is not null then
    v_price_cents := round(v_package.fixed_price * 100)::integer;
  elsif p_location = 'studio' and v_package.studio_price is not null then
    v_price_cents := round(v_package.studio_price * 100)::integer;
  elsif p_location = 'home' and v_package.home_price is not null then
    v_price_cents := round(v_package.home_price * 100)::integer;
  else
    raise exception 'preco_indisponivel_para_local';
  end if;

  -- 2. start_time SEMPRE calculado aqui, nunca aceito do chamador.
  -- Aritmética de "time" "enrola" dentro do mesmo dia (mod 24h); se
  -- o resultado for MAIOR que ready_time, o cálculo cruzou meia-
  -- noite para trás — mesma regra já validada hoje no BookingModal.
  v_start_time := p_ready_time - make_interval(mins => v_duration_minutes);

  if v_start_time > p_ready_time then
    raise exception 'horario_invalido';
  end if;

  -- 3. TTL da reserva — vem do parâmetro fornecido pelo backend
  -- (já validado no passo 0.1). O valor definitivo ainda depende da
  -- regra de negócio do PIX; esta função não decide nem assume esse
  -- número — só usa o que o chamador (sempre o backend, nunca o
  -- navegador) fornecer.
  v_expires_at := now() + make_interval(mins => p_reservation_ttl_minutes);

  v_requested_range := tsrange(
    (p_event_date + v_start_time),
    (p_event_date + v_start_time) + make_interval(mins => v_duration_minutes)
  );

  -- 4. Conflito com bookings JÁ CONFIRMADOS. O EXCLUDE de
  -- booking_requests não enxerga a tabela bookings — esta checagem
  -- explícita é a única forma de cobrir esse caso.
  select exists (
    select 1 from public.bookings
    where status <> 'cancelado'
      and time_range && v_requested_range
  ) into v_confirmed_conflict;

  v_status_to_try := case
    when v_confirmed_conflict then 'conflito'::public.booking_request_status
    else 'aguardando_pagamento'::public.booking_request_status
  end;

  -- 5. ÚNICA tentativa de insert em booking_requests, com o status
  -- decidido acima. O EXCLUDE (para 'aguardando_pagamento') e a
  -- UNIQUE de client_request_id são os árbitros finais de concorrência.
  begin
    insert into public.booking_requests (
      client_request_id, service_id, package_id, location,
      event_date, ready_time, start_time, duration_minutes,
      price_cents, status, expires_at
    ) values (
      p_client_request_id, v_package.service_id, p_package_id, p_location,
      p_event_date, p_ready_time, v_start_time, v_duration_minutes,
      v_price_cents, v_status_to_try, v_expires_at
    )
    returning id into v_booking_request_id;
  exception
    when exclusion_violation then
      -- Só pode acontecer quando v_status_to_try = 'aguardando_pagamento'
      -- (uma linha 'conflito' nunca é avaliada pelo EXCLUDE). Uma outra
      -- reserva temporária concorrente venceu a disputa pelo horário —
      -- não descartamos a solicitação, viramos para o caminho de
      -- conflito e tentamos de novo, agora fora do predicado do EXCLUDE.
      v_status_to_try := 'conflito';
      begin
        insert into public.booking_requests (
          client_request_id, service_id, package_id, location,
          event_date, ready_time, start_time, duration_minutes,
          price_cents, status, expires_at
        ) values (
          p_client_request_id, v_package.service_id, p_package_id, p_location,
          p_event_date, p_ready_time, v_start_time, v_duration_minutes,
          v_price_cents, v_status_to_try, v_expires_at
        )
        returning id into v_booking_request_id;
      exception
        when unique_violation then
          select id, status, expires_at, price_cents, duration_minutes, start_time
            into v_existing
            from public.booking_requests
            where client_request_id = p_client_request_id;
          return jsonb_build_object(
            'ok', true, 'booking_request_id', v_existing.id, 'status', v_existing.status,
            'expires_at', v_existing.expires_at, 'price_cents', v_existing.price_cents,
            'duration_minutes', v_existing.duration_minutes, 'start_time', v_existing.start_time
          );
      end;
    when unique_violation then
      -- Corrida rara: outra chamada com o MESMO client_request_id
      -- venceu entre o passo 0 e aqui. Não é erro de negócio — é a
      -- idempotência funcionando; devolve o resultado de quem venceu.
      select id, status, expires_at, price_cents, duration_minutes, start_time
        into v_existing
        from public.booking_requests
        where client_request_id = p_client_request_id;
      return jsonb_build_object(
        'ok', true, 'booking_request_id', v_existing.id, 'status', v_existing.status,
        'expires_at', v_existing.expires_at, 'price_cents', v_existing.price_cents,
        'duration_minutes', v_existing.duration_minutes, 'start_time', v_existing.start_time
      );
  end;

  -- 6. Contato — sempre roda se chegamos até aqui (nenhum "return"
  -- antecipado disparou). Se esta inserção falhar por qualquer
  -- motivo, a exceção não é capturada aqui: propaga, e TODA a
  -- função (incluindo o insert de booking_requests acima) é
  -- desfeita pela transação — nunca fica uma booking_request órfã
  -- sem contato.
  insert into public.booking_request_contacts (
    booking_request_id, client_name, client_phone, client_email, address, notes
  ) values (
    v_booking_request_id, p_client_name, p_client_phone, p_client_email,
    case when p_location = 'home' then p_address else null end,
    p_notes
  );

  -- 7. Caminho de conflito: reschedule_request VINCULADA (nunca
  -- NULL) + notification_outbox 'pending'. Mesma lógica de "tudo ou
  -- nada": se qualquer um destes dois inserts falhar, a função
  -- inteira é desfeita — nunca um reschedule_request sem outbox, nem
  -- um booking_request 'conflito' sem reschedule_request.
  if v_status_to_try = 'conflito' then
    insert into public.reschedule_requests (booking_request_id, event_date, desired_time)
      values (v_booking_request_id, p_event_date, p_ready_time)
      returning id into v_reschedule_request_id;

    insert into public.notification_outbox (reschedule_request_id, channel, status)
      values (v_reschedule_request_id, 'whatsapp_admin', 'pending');

    return jsonb_build_object(
      'ok', true,
      'booking_request_id', v_booking_request_id,
      'status', 'conflito'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'booking_request_id', v_booking_request_id,
    'status', 'aguardando_pagamento',
    'expires_at', v_expires_at,
    'price_cents', v_price_cents,
    'duration_minutes', v_duration_minutes,
    'start_time', v_start_time
  );
end;
$fn$;

-- Mesmo raciocínio de check_and_record_rate_limit (ver comentário
-- detalhado logo acima, na seção 2b): REVOKE de PUBLIC sozinho não
-- basta neste projeto, porque os default privileges da plataforma
-- concedem EXECUTE direto a anon/authenticated/service_role no
-- momento da criação da função. As quatro roles são revogadas
-- explicitamente, com a assinatura exata.
revoke execute on function public.create_booking_request(
  uuid, uuid, public.booking_location, date, time,
  text, text, text, text, text, text, text, integer
) from public;
revoke execute on function public.create_booking_request(
  uuid, uuid, public.booking_location, date, time,
  text, text, text, text, text, text, text, integer
) from anon;
revoke execute on function public.create_booking_request(
  uuid, uuid, public.booking_location, date, time,
  text, text, text, text, text, text, text, integer
) from authenticated;
revoke execute on function public.create_booking_request(
  uuid, uuid, public.booking_location, date, time,
  text, text, text, text, text, text, text, integer
) from service_role;

-- Propositalmente NENHUM "grant execute" é feito aqui — nem para
-- anon, nem para authenticated, nem para service_role, nem para
-- nenhuma role dedicada. A função existe, mas HOJE ninguém consegue
-- chamá-la. A escolha de quem poderá (service_role, uma role
-- dedicada tipo booking_service alcançada por JWT customizado, ou
-- outra estratégia) é uma decisão separada, ainda pendente de
-- revisão da documentação atual do Supabase antes de ser tomada —
-- ver checklist no final deste arquivo.


commit;


-- =========================================================
-- CHECKLIST DE PRÉ-VOO (antes de sequer cogitar executar isto
-- contra o projeto Supabase real — NÃO foi verificado nesta etapa)
-- =========================================================
-- 1. Confirmar (só leitura) quantas linhas existem hoje em
--    booking_requests e reschedule_requests — esperado 0 em ambas,
--    já que nenhum backend escreve nelas ainda:
--
--      select count(*) from public.booking_requests;
--      select count(*) from public.reschedule_requests
--        where booking_request_id is null;
--
--    Se a segunda consulta retornar > 0, esta migration vai abortar
--    sozinha no passo do DO block da seção 4 (comportamento
--    esperado e seguro) — resolva essas linhas manualmente antes de
--    tentar de novo.
--
-- 2. Depois de aplicada em homologação, confirmar que NINGUÉM
--    consegue chamar create_booking_request nem
--    check_and_record_rate_limit ainda:
--
--      select has_function_privilege('anon', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute');
--      select has_function_privilege('authenticated', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute');
--      select has_function_privilege('service_role', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute');
--      select has_function_privilege('anon', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute');
--      select has_function_privilege('authenticated', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute');
--      select has_function_privilege('service_role', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute');
--
--    Todas devem retornar "false". Também vale inspecionar
--    diretamente p.proacl de cada função (select proname,
--    pg_get_function_identity_arguments(oid), proacl from pg_proc
--    where ...) para conferir que não sobrou nenhuma entrada, nem
--    sequer um "=" solto (que indicaria PUBLIC) — foi exatamente
--    essa inspeção direta do proacl que revelou o problema original.
--
-- 3. Confirmar em homologação que uma chamada direta à função (via
--    service_role, só para teste manual, nunca do frontend) cobre
--    os três caminhos: sucesso normal, conflito com booking_request
--    ativa concorrente, conflito com booking confirmado existente.
--
-- 4. Testar a atomicidade do rate limiting sob concorrência real:
--    disparar N chamadas verdadeiramente simultâneas (não sequenciais)
--    a check_and_record_rate_limit com o MESMO identifier_hash e
--    limite menor que N, e confirmar que exatamente "limite" delas
--    retornam true e o restante false — nunca mais que o limite.
--
-- 5. Depois de aplicada em homologação, confirmar o ACL final de
--    cada tabela com hardening (deve bater exatamente com a seção
--    4b — nenhum "arwdDxtm" residual, nenhum TRUNCATE/REFERENCES/
--    TRIGGER/MAINTAIN sobrando):
--
--      select c.relname as table_name, c.relacl
--      from pg_class c
--      join pg_namespace n on n.oid = c.relnamespace
--      where n.nspname = 'public'
--        and c.relname in (
--          'booking_requests', 'booking_request_contacts',
--          'reschedule_requests', 'notification_outbox',
--          'rate_limit_attempts', 'bookings'
--        )
--      order by c.relname;
--
--    Esperado: "anon" ausente do relacl (ou seja, sem nenhum
--    privilégio) em todas exceto "bookings", onde "anon" deve
--    aparecer só com "a" (INSERT) — nunca "r/w/d/D/x/t/m" junto.
--    "authenticated" deve aparecer só com "arwd" (SELECT, INSERT,
--    UPDATE, DELETE) em todas as 6, nunca com "D/x/t/m" junto.
--
-- 6. Confirmar que o INSERT anônimo do BookingModal continua
--    funcionando, com a chave publishable (não service_role), antes
--    e depois de aplicar esta migration — nenhuma mudança de
--    comportamento é esperada.
-- =========================================================
