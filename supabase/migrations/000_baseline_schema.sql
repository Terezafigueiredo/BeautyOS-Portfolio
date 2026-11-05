-- =========================================================
-- BeautyOS — Schema inicial do Supabase (fase de preparação)
-- =========================================================
-- Cria as tabelas profiles, services, packages, clients, bookings
-- e blocked_slots, já com Row Level Security (RLS) habilitado.
--
-- Rode este script inteiro, de uma vez, no SQL Editor do Supabase
-- (Project > SQL Editor > New query).
--
-- O QUE ESTE SCRIPT NÃO FAZ (de propósito, nesta etapa):
-- - Não copia os preços/pacotes atuais do site para o banco.
-- - Não cria nenhum usuário administrador (veja o passo a passo
--   no final deste arquivo para criar o seu).
-- - Não conecta o formulário do site a nada disso ainda.
--
-- REGRA DE OURO DE SEGURANÇA já aplicada aqui:
-- - O frontend público (chave "anon"/"publishable") só pode CRIAR
--   uma solicitação em "bookings". Nunca ler, alterar ou apagar
--   nenhum agendamento — nem o próprio, nem o de outra cliente.
-- - "clients" fica totalmente inacessível ao público.
-- - Acesso administrativo (ler/criar/editar/apagar catálogo,
--   clientes e agendamentos) exige duas coisas ao mesmo tempo:
--     1) estar autenticado (logado), E
--     2) ter profiles.is_admin = true.
--   Um login autenticado sozinho NÃO é mais suficiente — veja a
--   tabela "profiles" e a função "is_admin()" logo abaixo.
-- - Ninguém consegue virar administrador sozinho: não existe
--   nenhuma política que permita a um usuário alterar seu próprio
--   "is_admin". Isso só é feito manualmente pelo dono do projeto,
--   direto no SQL Editor (veja o passo a passo no final).
-- - A "service_role key" nunca deve ser usada no frontend: ela
--   ignora todo o RLS abaixo por definição do Supabase.
-- =========================================================


-- ---------------------------------------------------------
-- Extensão necessária para gen_random_uuid()
-- (já vem habilitada por padrão em projetos Supabase; o "if not
-- exists" só garante isso de forma segura de repetir).
-- ---------------------------------------------------------
create extension if not exists pgcrypto;


-- ---------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------

-- Status do agendamento, com os 4 estados definidos.
create type public.booking_status as enum (
  'pendente',
  'confirmado',
  'recusado',
  'cancelado'
);

-- Modalidade de atendimento. Usa os mesmos valores em inglês
-- ("studio" / "home") já usados no BookingModal.tsx atual, para
-- não exigir nenhuma tradução quando o formulário for conectado.
create type public.booking_location as enum (
  'studio',
  'home'
);


-- ---------------------------------------------------------
-- Função utilitária: mantém "updated_at" sempre em dia
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- TABELA: profiles
-- Um perfil por usuário do Supabase Auth (auth.users), guardando
-- se essa pessoa é administradora do BeautyOS. É esta tabela que
-- torna o acesso administrativo "explícito", em vez de qualquer
-- login bastar.
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Toda vez que uma conta nova é criada no Supabase Auth, criamos
-- automaticamente o perfil correspondente com is_admin = false.
-- "security definer" é necessário para ter permissão de gravar em
-- public.profiles nesse momento (a criação da conta acontece no
-- schema "auth", fora do controle das políticas de RLS abaixo);
-- "set search_path = public" evita um tipo conhecido de ataque de
-- sequestro de search_path em funções security definer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_admin)
  values (new.id, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Função auxiliar usada dentro das políticas de RLS das outras
-- tabelas para checar, de forma centralizada, se quem está fazendo
-- a requisição é uma administradora. "security definer" garante que
-- ela consegue ler public.profiles mesmo que a política de leitura
-- de "profiles" (mais abaixo) só libere cada usuário para ver a
-- própria linha — evitando qualquer risco de recursão entre
-- políticas. Se não houver perfil ou is_admin for nulo/falso,
-- o resultado é sempre "false".
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


-- =========================================================
-- TABELA: services
-- Categorias de serviço (Social, Debutante, Noiva...), hoje
-- representadas pelas 3 páginas de serviço do site.
-- =========================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: packages
-- Pacotes/serviços individuais dentro de cada "services"
-- (ex.: "Maquiagem + Penteado", "Debutante Ouro").
-- =========================================================
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,

  name text not null,
  subtitle text,
  description text,
  includes text[] not null default '{}',

  -- Um pacote tem OU preço fixo, OU preços por modalidade
  -- (ateliê/domicílio) — nunca os dois ao mesmo tempo, e nunca
  -- nenhum dos dois. O CHECK abaixo garante essa regra no banco.
  studio_price numeric(10,2),
  home_price numeric(10,2),
  fixed_price numeric(10,2),

  duration_minutes integer not null check (duration_minutes > 0),
  duration_label text,

  is_highlighted boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (service_id, name),

  check (
    (fixed_price is not null and studio_price is null and home_price is null)
    or
    (fixed_price is null and (studio_price is not null or home_price is not null))
  )
);

create index packages_service_id_idx on public.packages (service_id);

create trigger set_packages_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: clients
-- Cadastro de clientes para uso futuro do painel administrativo
-- (histórico de atendimentos, busca por telefone etc.).
-- O formulário público NÃO grava nesta tabela.
-- =========================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_phone_idx on public.clients (phone);

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: bookings
-- Solicitações de agendamento. Guarda uma "fotografia" dos dados
-- no momento da solicitação (nome, telefone, serviço, pacote,
-- preço, duração), para que o histórico nunca mude mesmo que o
-- catálogo (services/packages) seja editado depois — além de
-- referências relacionais opcionais para esse catálogo.
-- =========================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),

  -- Vínculo relacional opcional com um cliente cadastrado.
  -- O formulário público NUNCA preenche client_id (ver política
  -- "bookings_public_insert" mais abaixo) — isso é tarefa futura
  -- do painel administrativo.
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_phone text not null,

  -- Vínculo relacional opcional com o catálogo (para quando os
  -- preços/pacotes forem migrados para o banco). Fica nulo
  -- enquanto o catálogo não existir de fato.
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  package_id uuid references public.packages(id) on delete set null,
  package_name text not null,

  location public.booking_location not null,
  address text,

  event_date date not null check (event_date >= current_date),
  ready_time time not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10,2) not null check (price >= 0),
  notes text,

  status public.booking_status not null default 'pendente',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Endereço obrigatório apenas para atendimento a domicílio,
  -- igual à validação que já existe no formulário hoje.
  check (
    location <> 'home'
    or (address is not null and btrim(address) <> '')
  )
);

create index bookings_status_idx on public.bookings (status);
create index bookings_event_date_idx on public.bookings (event_date);
create index bookings_client_id_idx on public.bookings (client_id);
create index bookings_service_id_idx on public.bookings (service_id);
create index bookings_package_id_idx on public.bookings (package_id);

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();


-- =========================================================
-- TABELA: blocked_slots
-- Bloqueios manuais de agenda (viagens, compromissos pessoais,
-- horários reservados fora do site), para uso futuro do painel
-- administrativo.
-- =========================================================
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ou bloqueia o dia inteiro (os dois horários nulos), ou define
  -- um intervalo válido (início antes do fim).
  check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index blocked_slots_date_idx on public.blocked_slots (blocked_date);

create trigger set_blocked_slots_updated_at
  before update on public.blocked_slots
  for each row execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================
-- A partir daqui, por padrão NINGUÉM acessa nada em nenhuma
-- destas tabelas — nem "anon" (visitante do site), nem
-- "authenticated" (qualquer usuário logado, admin ou não) —
-- exceto o que for explicitamente liberado pelas políticas abaixo.
--
-- A "service_role" sempre ignora RLS por definição do Supabase;
-- por isso ela nunca deve ser usada no frontend, apenas em
-- código de servidor/administração, se um dia for necessária.
-- =========================================================

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.packages enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_slots enable row level security;

-- Garante que os papéis padrão do Supabase têm acesso ao schema
-- (já é o padrão em projetos novos; reforçado aqui por clareza).
grant usage on schema public to anon, authenticated;


-- ---------------------------------------------------------
-- profiles — cada usuário só enxerga o próprio perfil;
-- ninguém escreve nele pela API pública.
-- ---------------------------------------------------------
-- Só SELECT é concedido, e apenas para "authenticated". Não há
-- nenhum grant de insert/update/delete para anon nem authenticated:
-- a única forma de criar um perfil é o gatilho "on_auth_user_created"
-- (que roda como security definer), e a única forma de promover
-- alguém a administrador é uma atualização manual no SQL Editor,
-- como dono do projeto — nunca através da chave publishable.
grant select on public.profiles to authenticated;

-- Cada usuário autenticado só pode ler o próprio perfil (útil, por
-- exemplo, para o futuro painel decidir se mostra ou não a área
-- administrativa). Ele nunca vê o perfil de outra pessoa.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());


-- ---------------------------------------------------------
-- services — catálogo, leitura pública dos itens ativos
-- ---------------------------------------------------------
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;

-- Qualquer visitante (e o futuro painel logado) pode ler os
-- serviços marcados como ativos — é o "cardápio" público do site.
create policy "services_public_read_active"
  on public.services
  for select
  to anon, authenticated
  using (is_active = true);

-- Só quem estiver autenticado E marcado como administrador em
-- "profiles" pode ler tudo (incluindo inativos) e criar, editar
-- ou remover serviços. Um login comum, sem is_admin = true, não
-- tem mais nenhum poder extra aqui.
create policy "services_admin_full_access"
  on public.services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------
-- packages — catálogo, leitura pública dos itens ativos
-- ---------------------------------------------------------
grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;

create policy "packages_public_read_active"
  on public.packages
  for select
  to anon, authenticated
  using (is_active = true);

create policy "packages_admin_full_access"
  on public.packages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------
-- clients — uso exclusivo de administradores autenticados
-- ---------------------------------------------------------
-- Nenhum "grant" para "anon": a tabela fica completamente
-- inacessível ao público em qualquer operação, antes mesmo de
-- qualquer política de RLS ser avaliada.
grant select, insert, update, delete on public.clients to authenticated;

create policy "clients_admin_full_access"
  on public.clients
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------
-- bookings — a regra de negócio mais sensível
-- ---------------------------------------------------------
-- Ao público (anon), concedemos apenas INSERT. Sem select/update/
-- delete: uma visitante não consegue listar, ler, alterar ou
-- apagar nenhuma solicitação — nem mesmo a que ela própria criou,
-- pois nesta fase não existe login de cliente que permita provar
-- com segurança "qual solicitação é minha".
grant insert on public.bookings to anon;

-- O acesso completo (autenticado) tem seu grant de nível SQL aqui,
-- mas a política abaixo é quem realmente decide se algo é permitido.
grant select, insert, update, delete on public.bookings to authenticated;

-- Qualquer visitante pode criar uma solicitação, mas apenas com
-- status "pendente" e sem se vincular a um client_id existente
-- (vincular a um cliente cadastrado é tarefa do painel admin).
create policy "bookings_public_insert"
  on public.bookings
  for insert
  to anon
  with check (
    status = 'pendente'
    and client_id is null
  );

-- Só administradoras autenticadas (is_admin = true) enxergam,
-- criam, editam ou removem agendamentos. Um login sem is_admin
-- não consegue ver nenhum agendamento, nem o de outra cliente.
create policy "bookings_admin_full_access"
  on public.bookings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------
-- blocked_slots — leitura pública (só das colunas de data/hora),
-- escrita só de administradores
-- ---------------------------------------------------------
-- Ao público, liberamos apenas as colunas que dizem "este
-- horário está bloqueado" — nunca a coluna "reason", que é uma
-- anotação interna e pode conter informação que não deveria
-- ficar visível para qualquer visitante do site.
grant select (blocked_date, start_time, end_time)
  on public.blocked_slots to anon;

-- Administradoras autenticadas enxergam todas as colunas,
-- incluindo "reason".
grant select on public.blocked_slots to authenticated;
grant insert, update, delete on public.blocked_slots to authenticated;

-- Leitura pública liberada: no futuro, o formulário poderá
-- consultar quais datas/horários já estão bloqueados antes de
-- permitir o envio da solicitação. O GRANT acima já impede que
-- "anon" veja a coluna "reason", mesmo passando por esta política.
create policy "blocked_slots_public_read"
  on public.blocked_slots
  for select
  to anon, authenticated
  using (true);

-- Só administradoras autenticadas podem criar, editar ou remover
-- bloqueios de agenda.
create policy "blocked_slots_admin_full_access"
  on public.blocked_slots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =========================================================
-- COMO CRIAR O PRIMEIRO USUÁRIO ADMINISTRADOR
-- =========================================================
-- 1. No painel do Supabase, vá em Authentication > Users > "Add user"
--    (ou "Invite") e crie a sua conta (e-mail + senha). Isso cria uma
--    linha em auth.users, o que dispara automaticamente o gatilho
--    "on_auth_user_created" e cria seu perfil em public.profiles
--    com is_admin = false.
--
-- 2. Copie o UUID desse usuário (aparece na lista de
--    Authentication > Users, ou rode:
--      select id, email from auth.users;
--    no SQL Editor).
--
-- 3. Ainda no SQL Editor, rode (substituindo o UUID abaixo):
--      update public.profiles
--      set is_admin = true
--      where id = 'COLE-AQUI-O-UUID-DO-SEU-USUARIO';
--
-- 4. Recomendado: em Authentication > Providers (ou Authentication >
--    Settings, dependendo da versão do painel), desative o cadastro
--    público de novas contas ("Allow new users to sign up"). Assim,
--    ninguém além de você consegue sequer criar um login — mesmo que
--    conseguisse, nasceria com is_admin = false e nenhum acesso extra.
-- =========================================================
