-- =========================================================
-- BeautyOS — Migration 003: bloqueio das funções de backend
-- já publicadas (correção do pós-voo da migration 002)
-- =========================================================
-- ESTA MIGRATION NÃO FOI EXECUTADA. Arquivo criado apenas para
-- revisão local.
--
-- CONTEXTO: a migration 002 já foi aplicada com sucesso em
-- produção. O pós-voo dessa aplicação revelou, via inspeção direta
-- de pg_proc.proacl, que "REVOKE EXECUTE ... FROM PUBLIC" — a única
-- linha de hardening de EXECUTE que a 002 continha para cada
-- função, naquele momento — não foi suficiente: os default
-- privileges deste projeto Supabase também concedem EXECUTE DIRETO
-- a anon, authenticated e service_role no momento em que qualquer
-- função é criada no schema public, independente de a migration ter
-- escrito algum "grant execute" explícito (mesmo padrão já
-- encontrado e corrigido para tabelas, na seção 4b da migration
-- 002). Resultado real confirmado no pós-voo, para as duas funções:
--
--   SECURITY DEFINER = true          (esperado, sem mudança)
--   PUBLIC  pode executar = false    (o REVOKE original funcionou)
--   anon    pode executar = true     <- problema
--   authenticated pode executar = true <- problema
--   service_role  pode executar = true <- problema
--
-- Como a migration 002 já rodou e não será reexecutada, esta
-- migration 003 corrige diretamente o estado das duas funções que
-- já existem em produção — sem recriar, sem alterar corpo, sem
-- tocar em mais nada além do EXECUTE dessas duas funções.
--
-- O arquivo local 002 também foi corrigido (fora desta migration)
-- para que uma instalação FUTURA, do zero, já nasça com o estado
-- correto sem depender desta 003 — ver
-- supabase/migrations/002_phase1_backend_foundations.sql.
--
-- O QUE ESTA MIGRATION FAZ:
-- - Revoga EXECUTE em public.create_booking_request(...) e em
--   public.check_and_record_rate_limit(...) de PUBLIC, anon,
--   authenticated e service_role — usando a assinatura EXATA de
--   cada função (nunca o nome sozinho), para não atingir um overload
--   diferente por engano caso um dia exista mais de uma versão da
--   mesma função com parâmetros diferentes.
--
-- O QUE ESTA MIGRATION NÃO FAZ (de propósito):
-- - NÃO recria nem altera nenhuma tabela.
-- - NÃO altera nenhum dado.
-- - NÃO altera RLS nem nenhuma policy.
-- - NÃO altera nenhuma EXCLUDE constraint.
-- - NÃO altera default privileges globais da plataforma (isso seria
--   uma correção de escopo de projeto, tratada separadamente).
-- - NÃO altera nenhum atributo global de "service_role" (BYPASSRLS,
--   outros grants em outras tabelas/funções etc.) — só revoga o
--   EXECUTE destas duas funções específicas para essa role, que é
--   exatamente o que foi pedido e avaliado como correto para o
--   desenho atual (ver justificativa na resposta desta revisão).
-- - NÃO concede EXECUTE para nenhuma role. Depois desta migration,
--   ninguém — nem service_role — consegue chamar nenhuma das duas
--   funções. Isso é intencional: a estratégia de quem vai chamá-las
--   (service_role, uma role dedicada via JWT customizado, ou outra)
--   ainda não foi decidida.
-- - NÃO altera o search_path das funções. Uma auditoria linha a
--   linha do corpo de ambas confirma que todo objeto referenciado já
--   está schema-qualificado com "public." — não há risco técnico em
--   apertar para "set search_path = ''" no futuro. Essa mudança fica
--   de fora aqui de propósito, porque esta migration foi pedida para
--   corrigir SOMENTE as permissões.
-- - Nenhum secret, chave, token, IP ou credencial é adicionado.
-- =========================================================

begin;


-- =========================================================
-- public.check_and_record_rate_limit(text, text, integer, integer)
-- =========================================================
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
-- public.create_booking_request(uuid, uuid, public.booking_location,
-- date, time, text, text, text, text, text, text, text, integer)
-- =========================================================
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


commit;


-- =========================================================
-- CHECKLIST DE PRÉ-VOO / PÓS-VOO (NÃO verificado nesta etapa)
-- =========================================================
-- PRÉ-VOO — antes de aplicar, confirmar que as assinaturas abaixo
-- realmente existem em produção exatamente assim (senão o REVOKE
-- falharia por "function does not exist", o que é seguro — só
-- impede a migration de commitar — mas melhor saber antes):
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('create_booking_request', 'check_and_record_rate_limit');
--
-- Esperado: exatamente as duas assinaturas usadas nesta migration.
--
-- PRÉ-VOO — confirmar que service_role não é superusuário (se
-- fosse, o REVOKE seria tecnicamente aplicado mas não teria efeito
-- prático, já que superusuário ignora toda checagem de privilégio):
--
--   select rolname, rolsuper, rolbypassrls
--   from pg_roles
--   where rolname = 'service_role';
--
-- Esperado: rolsuper = false (rolbypassrls = true é esperado e não
-- é afetado por esta migration — RLS e EXECUTE são mecanismos
-- independentes).
--
-- PÓS-VOO — depois de aplicada, confirmar o ACL final bruto de cada
-- função (não deve sobrar nenhuma entrada para anon/authenticated/
-- service_role, nem um "=" solto indicando PUBLIC):
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, p.proacl
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('create_booking_request', 'check_and_record_rate_limit')
--   order by p.proname;
--
-- PÓS-VOO — confirmar via has_function_privilege (deve retornar
-- "false" em todas as linhas):
--
--   select
--     'create_booking_request' as function_name,
--     has_function_privilege('anon', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute') as anon_can_execute,
--     has_function_privilege('authenticated', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute') as authenticated_can_execute,
--     has_function_privilege('service_role', 'public.create_booking_request(uuid, uuid, public.booking_location, date, time, text, text, text, text, text, text, text, integer)', 'execute') as service_role_can_execute
--   union all
--   select
--     'check_and_record_rate_limit',
--     has_function_privilege('anon', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute'),
--     has_function_privilege('authenticated', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute'),
--     has_function_privilege('service_role', 'public.check_and_record_rate_limit(text, text, integer, integer)', 'execute');
-- =========================================================
