-- =========================================================
-- BeautyOS — Migration 006: corrige o BLOCKER de idempotência
-- de public.create_booking_request (Fase 2.1)
-- =========================================================
-- ESTA MIGRATION NÃO FOI EXECUTADA. Arquivo criado apenas para
-- revisão local. Pressupõe 000-005 já aplicadas (005 concede EXECUTE
-- em create_booking_request só para service_role — ver esse
-- arquivo), mas a correção abaixo não depende disso: CREATE OR
-- REPLACE FUNCTION funciona independente do estado atual do ACL.
--
-- BLOCKER CORRIGIDO (identificado na auditoria da Fase 2.1):
-- As três passagens de idempotência de create_booking_request
-- (migration 002, caminho normal + dois ramos de unique_violation)
-- liam só "id, status, expires_at, price_cents, duration_minutes,
-- start_time" por client_request_id e devolviam isso incondicional-
-- mente. Um client_request_id reaproveitado com payload DIFERENTE
-- (edição acidental do cliente, bug do frontend, ou reuso deliberado
-- do identificador de outra pessoa) recebia de volta, silenciosa-
-- mente, o resultado da primeira chamada — nunca um erro.
--
-- O QUE ESTA MIGRATION FAZ:
-- - Recria (CREATE OR REPLACE) SOMENTE o corpo de
--   public.create_booking_request, com a MESMA assinatura pública
--   (uuid, uuid, public.booking_location, date, time, text, text,
--   text, text, text, text, text, integer).
-- - Em cada uma das três passagens de idempotência, antes de devolver
--   o registro existente, agora compara TODOS os campos que compõem
--   a identidade semântica da solicitação (package_id, location,
--   event_date, ready_time, client_name, client_phone, client_email,
--   address já canonicalizado, notes) contra os parâmetros desta
--   chamada. Se tudo bater -> é retry legítimo, devolve o mesmo
--   resultado de sempre. Se algo divergir -> "raise exception
--   'idempotency_mismatch'" (SQLSTATE padrão P0001, mesmo padrão já
--   usado por 'pacote_invalido'/'ttl_invalido'/etc. nesta função) —
--   NENHUM dado da solicitação existente (nem booking_request_id,
--   nem status, nem preço, nem PII) é devolvido nesse caso.
--
-- O QUE ESTA MIGRATION NÃO FAZ (de propósito):
-- - NÃO muda a posição das checagens de idempotência em relação ao
--   rate limiting — continuam acontecendo ANTES de
--   check_and_record_rate_limit, nos três pontos, exatamente como
--   antes. Ver justificativa detalhada na resposta desta revisão
--   (seção "Interação com rate limit"); não reorganizado.
-- - NÃO altera a lógica de catálogo, cálculo de start_time, TTL,
--   detecção de conflito com bookings confirmados, EXCLUDE
--   constraints, inserção em booking_request_contacts, ou o caminho
--   de reschedule_request/notification_outbox. Tudo isso é copiado
--   verbatim da migration 002.
-- - NÃO concede nem revoga EXECUTE de nenhuma role. CREATE OR REPLACE
--   FUNCTION NÃO altera ownership nem ACL (grants/revokes) de uma
--   função existente — só substitui corpo/linguagem/volatilidade/
--   configuração especificados explicitamente na nova definição; o
--   OID da função e sua tabela de permissões (pg_proc.proacl)
--   permanecem exatamente os mesmos. Por isso os REVOKEs das
--   migrations 002/003 e o GRANT da migration 005 (quando aplicada)
--   continuam valendo sem precisar ser repetidos aqui.
-- - NÃO reabre o search_path. SECURITY DEFINER é reafirmado
--   EXPLICITAMENTE na nova definição (se fosse omitido, reverteria
--   para SECURITY INVOKER — uma regressão grave); e
--   "set search_path = ''" também é fixado diretamente na nova
--   definição (não deixado para uma migration 004 "futura" nem
--   dependente de o CREATE OR REPLACE preservar configuração
--   antiga — ele não garante isso, então fixamos o valor final
--   desejado explicitamente, aqui mesmo, sem ambiguidade). O corpo
--   novo usa só objetos schema-qualificados ("public.") e só
--   built-ins de pg_catalog (sempre resolvidos independente de
--   search_path) — mesma auditoria já feita na migration 004,
--   estendida às linhas novas desta migration.
-- - NÃO altera nenhuma tabela, RLS, policy ou dado existente.
-- - NÃO altera a migration 005.
-- - Nenhum secret, chave, token, IP ou credencial é adicionado.
-- =========================================================

begin;

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
  p_ip_hash text,
  p_phone_hash text,
  p_reservation_ttl_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  c_rate_limit_ip_window_seconds constant integer := 600;    -- 10 minutos
  c_rate_limit_ip_limit constant integer := 5;
  c_rate_limit_phone_window_seconds constant integer := 3600; -- 60 minutos
  c_rate_limit_phone_limit constant integer := 3;

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
  -- explícito, só consultando a UNIQUE já criada na migration 002
  -- (client_request_id). Roda ANTES de TTL (0.1) e de rate limiting
  -- (0.5) de propósito — um retry legítimo nunca deve consumir uma
  -- tentativa nova de rate limit nem reavaliar TTL (ver justificativa
  -- completa na resposta desta revisão; posição NÃO alterada por
  -- esta migration).
  --
  -- CORREÇÃO (migration 006): até aqui, encontrar um
  -- client_request_id já existente bastava para devolver o registro
  -- antigo, sem comparar se o restante do payload desta chamada é o
  -- mesmo da primeira. A partir de agora, o SELECT também traz os
  -- campos que compõem a IDENTIDADE semântica da solicitação — tudo
  -- que o cliente de fato submeteu: package_id, location, event_date,
  -- ready_time, e os dados de contato (via booking_request_contacts,
  -- relação 1:1 pela chave primária compartilhada) — e o resultado só
  -- é tratado como "o mesmo retry" se TODOS eles baterem exatamente
  -- com os parâmetros desta chamada.
  select
    br.id, br.status, br.expires_at, br.price_cents, br.duration_minutes,
    br.start_time,
    br.package_id, br.location, br.event_date, br.ready_time,
    brc.client_name, brc.client_phone, brc.client_email, brc.address,
    brc.notes
    into v_existing
    from public.booking_requests br
    join public.booking_request_contacts brc
      on brc.booking_request_id = br.id
    where br.client_request_id = p_client_request_id;

  if found then
    if v_existing.package_id is distinct from p_package_id
       or v_existing.location is distinct from p_location
       or v_existing.event_date is distinct from p_event_date
       or v_existing.ready_time is distinct from p_ready_time
       or v_existing.client_name is distinct from p_client_name
       or v_existing.client_phone is distinct from p_client_phone
       or v_existing.client_email is distinct from p_client_email
       or v_existing.address is distinct from
          (case when p_location = 'home' then p_address else null end)
       or v_existing.notes is distinct from p_notes
    then
      -- client_request_id já existe, mas pertence a uma solicitação
      -- com conteúdo diferente desta chamada. NUNCA devolver os dados
      -- da solicitação existente aqui (nem booking_request_id, nem
      -- status, nem preço) — isso vazaria a existência e o estado de
      -- uma solicitação para quem apenas reaproveitou (por acidente
      -- ou de propósito) um client_request_id que não é seu. A única
      -- informação exposta é o código genérico abaixo, sem PII.
      raise exception 'idempotency_mismatch';
    end if;

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

  -- 0.5 RATE LIMITING — atômico via check_and_record_rate_limit().
  -- Roda DEPOIS da checagem de idempotência (0): um retry legítimo do
  -- MESMO client_request_id nunca consome uma tentativa nova de rate
  -- limit, porque já teria retornado antes de chegar aqui — e um
  -- client_request_id reaproveitado com payload diferente (mismatch)
  -- também nunca consome, porque agora levanta exceção antes de
  -- chegar aqui também (ver seção "Interação com rate limit" na
  -- resposta desta revisão).
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
  -- (já validado no passo 0.1).
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
          -- Corrida: outra chamada com o MESMO client_request_id
          -- venceu entre o passo 0 e aqui. Mesma comparação de
          -- identidade do passo 0, pelo mesmo motivo (ver comentário
          -- completo lá) — pode ser a mesma solicitação (retry
          -- concorrente legítimo) ou um client_request_id
          -- reaproveitado com payload diferente.
          select
            br.id, br.status, br.expires_at, br.price_cents,
            br.duration_minutes, br.start_time,
            br.package_id, br.location, br.event_date, br.ready_time,
            brc.client_name, brc.client_phone, brc.client_email,
            brc.address, brc.notes
            into v_existing
            from public.booking_requests br
            join public.booking_request_contacts brc
              on brc.booking_request_id = br.id
            where br.client_request_id = p_client_request_id;

          if v_existing.package_id is distinct from p_package_id
             or v_existing.location is distinct from p_location
             or v_existing.event_date is distinct from p_event_date
             or v_existing.ready_time is distinct from p_ready_time
             or v_existing.client_name is distinct from p_client_name
             or v_existing.client_phone is distinct from p_client_phone
             or v_existing.client_email is distinct from p_client_email
             or v_existing.address is distinct from
                (case when p_location = 'home' then p_address else null end)
             or v_existing.notes is distinct from p_notes
          then
            raise exception 'idempotency_mismatch';
          end if;

          return jsonb_build_object(
            'ok', true, 'booking_request_id', v_existing.id, 'status', v_existing.status,
            'expires_at', v_existing.expires_at, 'price_cents', v_existing.price_cents,
            'duration_minutes', v_existing.duration_minutes, 'start_time', v_existing.start_time
          );
      end;
    when unique_violation then
      -- Corrida: outra chamada com o MESMO client_request_id venceu
      -- entre o passo 0 e aqui. Mesma comparação de identidade do
      -- passo 0, pelo mesmo motivo (ver comentário completo lá).
      select
        br.id, br.status, br.expires_at, br.price_cents, br.duration_minutes,
        br.start_time,
        br.package_id, br.location, br.event_date, br.ready_time,
        brc.client_name, brc.client_phone, brc.client_email, brc.address,
        brc.notes
        into v_existing
        from public.booking_requests br
        join public.booking_request_contacts brc
          on brc.booking_request_id = br.id
        where br.client_request_id = p_client_request_id;

      if v_existing.package_id is distinct from p_package_id
         or v_existing.location is distinct from p_location
         or v_existing.event_date is distinct from p_event_date
         or v_existing.ready_time is distinct from p_ready_time
         or v_existing.client_name is distinct from p_client_name
         or v_existing.client_phone is distinct from p_client_phone
         or v_existing.client_email is distinct from p_client_email
         or v_existing.address is distinct from
            (case when p_location = 'home' then p_address else null end)
         or v_existing.notes is distinct from p_notes
      then
        raise exception 'idempotency_mismatch';
      end if;

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

commit;


-- =========================================================
-- CHECKLIST DE PRÉ-VOO / PÓS-VOO (NÃO verificado nesta etapa)
-- =========================================================
-- PRÉ-VOO — confirmar a assinatura atual antes de aplicar (CREATE OR
-- REPLACE falha, de forma segura, se a assinatura não bater
-- exatamente):
--
--   select pg_get_function_identity_arguments(p.oid) as arguments
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname = 'create_booking_request';
--
-- Esperado: "uuid, uuid, public.booking_location, date, time, text,
-- text, text, text, text, text, text, integer" — idêntica à usada
-- nas migrations 002/003/004/005.
--
-- PÓS-VOO — confirmar que OID, owner, SECURITY DEFINER, search_path
-- e ACL permanecem consistentes com o estado esperado após 003/004 (e
-- 005, se já aplicada):
--
--   select
--     p.oid,
--     pg_get_userbyid(p.proowner) as owner,
--     p.prosecdef as security_definer,
--     p.proconfig as config_settings,
--     p.proacl,
--     has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
--     has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
--     has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname = 'create_booking_request';
--
-- Esperado: security_definer = true; config_settings contém
-- "search_path=" vazio; proacl e os três "*_can_execute" IDÊNTICOS ao
-- estado de antes desta migration (service_role = true, anon e
-- authenticated = false, SE a migration 005 já tiver sido aplicada;
-- todas as três = false, SE a 005 ainda não tiver sido aplicada) —
-- esta migration 006 não deve, por si só, mudar nenhum desses três
-- valores.
--
-- PÓS-VOO — testes funcionais (via service_role, só em homologação,
-- nunca com a chave publishable):
--
-- 1. client_request_id X + payload A -> cria uma booking_request.
-- 2. Repetir X + payload A -> mesmo booking_request_id, sem nova
--    linha em booking_requests nem em booking_request_contacts.
-- 3. Repetir X + payload B (ex.: client_phone diferente) -> erro
--    "idempotency_mismatch"; "select count(*) from
--    public.booking_requests where client_request_id = 'X'" continua
--    retornando 1.
-- 4. Duas chamadas verdadeiramente simultâneas com X + A / X + A ->
--    exatamente uma linha criada, ambas as chamadas retornam o mesmo
--    booking_request_id.
-- 5. Duas chamadas verdadeiramente simultâneas com X + A / X + B ->
--    exatamente uma linha criada (A ou B, dependendo de quem venceu a
--    corrida); a chamada perdedora recebe "idempotency_mismatch",
--    NUNCA os dados da vencedora como se fosse um sucesso dela mesma.
-- 6. Confirmar nos logs do Postgres (ou no log da Edge Function,
--    quando conectada) que nenhuma mensagem de erro de
--    "idempotency_mismatch" contém client_name/client_phone/
--    client_email/address/notes — nem da chamada atual, nem da
--    solicitação existente.
-- =========================================================
