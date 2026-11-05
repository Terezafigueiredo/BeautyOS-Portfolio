-- =========================================================
-- BeautyOS — Migration 004: search_path vazio para as funções
-- SECURITY DEFINER (fecha a última dívida de hardening da Fase 1)
-- =========================================================
-- ESTA MIGRATION NÃO FOI EXECUTADA. Arquivo criado apenas para
-- revisão local.
--
-- CONTEXTO: a migration 003 já corrigiu e confirmou, via pós-voo
-- real em produção, que public.create_booking_request(...) e
-- public.check_and_record_rate_limit(...) têm hoje:
--   SECURITY DEFINER = true
--   PUBLIC/anon/authenticated/service_role podem executar = false
--   proacl = {postgres=X/postgres} (só o dono, nada mais)
--
-- A única dívida de hardening restante, documentada explicitamente
-- no cabeçalho da migration 002 e no rodapé da 003, é o
-- "set search_path = public" de ambas as funções. Antes de criar
-- esta migration, reli o corpo REAL das duas funções (não a versão
-- em memória de revisões anteriores) e confirmei, linha a linha:
--
-- - Toda tabela/tipo/função PRÓPRIA referenciada dentro dos dois
--   corpos já está explicitamente qualificada com "public." —
--   incluindo o cast para os enums booking_request_status e
--   booking_location, e a chamada de create_booking_request para
--   check_and_record_rate_limit.
-- - Nenhuma sequence é referenciada diretamente em nenhuma das duas
--   funções (ambas as tabelas usam gen_random_uuid() como default
--   de coluna, resolvido na própria CREATE TABLE, não dentro destas
--   funções).
-- - Todas as funções/operadores usados sem qualificação (now(),
--   count(*), make_interval(...), round(...), tsrange(...),
--   jsonb_build_object(...), hashtextextended(...),
--   pg_advisory_xact_lock(...), e os operadores ||, -, +, &&, >=, <>)
--   são built-ins do schema pg_catalog — que o PostgreSQL SEMPRE
--   pesquisa implicitamente, esteja ou não listado no search_path.
--   Isso continua valendo com search_path = ''.
--
-- Conclusão: não há NENHUMA referência insegura ou que quebraria com
-- search_path = ''. É seguro prosseguir.
--
-- O QUE ESTA MIGRATION FAZ:
-- - Altera SOMENTE a configuração search_path das duas funções, de
--   "public" para "" (vazio), via ALTER FUNCTION ... SET search_path.
--
-- O QUE ESTA MIGRATION NÃO FAZ (de propósito):
-- - NÃO recria nenhuma das duas funções (ALTER FUNCTION ... SET é um
--   comando de configuração, não um CREATE OR REPLACE — o corpo,
--   dono, SECURITY DEFINER e OID da função permanecem exatamente os
--   mesmos).
-- - NÃO altera o corpo de nenhuma das duas funções.
-- - NÃO altera EXECUTE de nenhuma role — ALTER FUNCTION ... SET
--   nunca toca em pg_proc.proacl, só em pg_proc.proconfig; são
--   colunas completamente independentes. O fechamento feito pela
--   migration 003 (PUBLIC/anon/authenticated/service_role = false)
--   continua exatamente como está — esta migration NÃO reabre nada.
-- - NÃO concede nenhum privilégio a nenhuma role.
-- - NÃO altera nenhuma tabela, nenhuma RLS, nenhuma policy, nenhum
--   dado, nenhum default privilege, nenhum atributo de service_role.
-- - NÃO toca em nenhuma outra função do projeto (is_admin(),
--   set_updated_at(), handle_new_user() permanecem intocadas).
-- - Nenhum secret, chave, token, IP ou credencial é adicionado.
-- =========================================================

begin;

alter function public.check_and_record_rate_limit(
  text, text, integer, integer
) set search_path = '';

alter function public.create_booking_request(
  uuid, uuid, public.booking_location, date, time,
  text, text, text, text, text, text, text, integer
) set search_path = '';

commit;


-- =========================================================
-- CHECKLIST DE PÓS-VOO (NÃO verificado nesta etapa)
-- =========================================================
-- Uma única consulta cobre todas as confirmações necessárias:
-- SECURITY DEFINER continua true, search_path ficou vazio,
-- EXECUTE continua fechado para as três roles reais, e o ACL bruto
-- continua só com o dono (nada foi reaberto por esta migration).
--
--   select
--     p.proname,
--     pg_get_function_identity_arguments(p.oid) as arguments,
--     p.prosecdef as security_definer,
--     p.proconfig as config_settings,
--     p.proacl,
--     has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
--     has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
--     has_function_privilege('service_role', p.oid, 'execute') as service_role_can_execute
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('create_booking_request', 'check_and_record_rate_limit');
--
-- Esperado, para as duas linhas:
--   security_definer          = true
--   config_settings           contém "search_path=" com NADA depois
--                              do "=" (é assim que um search_path
--                              vazio aparece no array de proconfig —
--                              não confundir com a ausência da
--                              entrada, que indicaria que o ALTER
--                              não foi aplicado)
--   proacl                    = {postgres=X/postgres} — igual ao
--                              confirmado no pós-voo da migration 003
--   anon_can_execute          = false
--   authenticated_can_execute = false
--   service_role_can_execute  = false
-- =========================================================
