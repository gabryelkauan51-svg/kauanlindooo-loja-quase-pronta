-- =====================================================================
-- Kauan Store: tabelas, segurança (RLS) e funções
-- Pode rodar mais de uma vez: usa "if not exists" e "add column if not exists".
-- Se suas tabelas profiles / user_orders / user_favorites já existem com outros
-- nomes de coluna, compare com este arquivo antes de rodar.
-- =====================================================================

-- ---------- Perfis ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  provider text,
  wallet_balance numeric(12,2) not null default 0,
  active_coupon text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists provider text;
alter table public.profiles add column if not exists wallet_balance numeric(12,2) not null default 0;
alter table public.profiles add column if not exists active_coupon text;

-- ---------- Pedidos ----------
create table if not exists public.user_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_ref text unique,
  order_id text,
  game text,
  account_id text,
  title text,
  status text not null default 'pending',
  final_price numeric(12,2),
  original_price numeric(12,2),
  coupon_code text,
  checkout jsonb,
  delivery jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.user_orders add column if not exists external_ref text;
alter table public.user_orders add column if not exists order_id text;
alter table public.user_orders add column if not exists game text;
alter table public.user_orders add column if not exists account_id text;
alter table public.user_orders add column if not exists title text;
alter table public.user_orders add column if not exists status text not null default 'pending';
alter table public.user_orders add column if not exists final_price numeric(12,2);
alter table public.user_orders add column if not exists original_price numeric(12,2);
alter table public.user_orders add column if not exists coupon_code text;
alter table public.user_orders add column if not exists checkout jsonb;
alter table public.user_orders add column if not exists delivery jsonb;
alter table public.user_orders add column if not exists delivered_at timestamptz;
create unique index if not exists user_orders_external_ref_key on public.user_orders(external_ref);
create index if not exists user_orders_user_idx on public.user_orders(user_id, created_at desc);

-- ---------- Favoritos ----------
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  item_id text not null,
  snapshot jsonb,
  created_at timestamptz not null default now()
);
alter table public.user_favorites add column if not exists game text;
alter table public.user_favorites add column if not exists item_id text;
alter table public.user_favorites add column if not exists snapshot jsonb;
create unique index if not exists user_favorites_unique on public.user_favorites(user_id, game, item_id);

-- ---------- Carteira ----------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  kind text not null,                 -- deposit | purchase | adjust
  description text,
  created_at timestamptz not null default now()
);

-- ---------- Cupons, donos e faixas NFA ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent int not null check (percent between 1 and 99),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_owners (
  email text primary key
);

create table if not exists public.nfa_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,                -- ex.: 1-10
  min_skins int not null default 0,
  max_skins int,
  price numeric(12,2),                -- preço final ao cliente (null = sem preço)
  stock int not null default 0,
  sort int not null default 0
);

-- ---------- Funções ----------
create or replace function public.is_store_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.store_owners o where lower(o.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.validate_coupon(p_code text)
returns table(code text, percent int) language sql stable security definer set search_path = public as $$
  select c.code, c.percent from public.coupons c where upper(c.code) = upper(trim(p_code)) and c.active limit 1;
$$;

grant execute on function public.is_store_owner() to authenticated;
grant execute on function public.validate_coupon(text) to authenticated;

-- Cria o perfil automaticamente no primeiro login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Segurança (RLS) ----------
alter table public.profiles enable row level security;
alter table public.user_orders enable row level security;
alter table public.user_favorites enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.coupons enable row level security;
alter table public.store_owners enable row level security;
alter table public.nfa_tiers enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- O cliente só pode escrever nestas colunas. Saldo e pedidos nunca são editáveis pelo navegador.
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, email, display_name, avatar_url, provider) on public.profiles to authenticated;
grant update (display_name, avatar_url, active_coupon) on public.profiles to authenticated;

-- Pedidos: o cliente só LÊ. Quem grava é a Edge Function (service role).
drop policy if exists orders_select_own on public.user_orders;
create policy orders_select_own on public.user_orders for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.user_orders from authenticated, anon;

drop policy if exists fav_select_own on public.user_favorites;
drop policy if exists fav_insert_own on public.user_favorites;
drop policy if exists fav_delete_own on public.user_favorites;
create policy fav_select_own on public.user_favorites for select to authenticated using (user_id = auth.uid());
create policy fav_insert_own on public.user_favorites for insert to authenticated with check (user_id = auth.uid());
create policy fav_delete_own on public.user_favorites for delete to authenticated using (user_id = auth.uid());

drop policy if exists wallet_select_own on public.wallet_transactions;
create policy wallet_select_own on public.wallet_transactions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.wallet_transactions from authenticated, anon;

drop policy if exists coupons_owner_all on public.coupons;
create policy coupons_owner_all on public.coupons for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

drop policy if exists nfa_read_all on public.nfa_tiers;
drop policy if exists nfa_owner_write on public.nfa_tiers;
create policy nfa_read_all on public.nfa_tiers for select to anon, authenticated using (true);
create policy nfa_owner_write on public.nfa_tiers for all to authenticated using (public.is_store_owner()) with check (public.is_store_owner());

-- ---------- Dados iniciais ----------
insert into public.coupons (code, percent, active) values ('LANCAMENTO20', 20, true) on conflict (code) do nothing;

insert into public.nfa_tiers (label, min_skins, max_skins, sort)
select * from (values
  ('1-10', 1, 10, 1), ('11-20', 11, 20, 2), ('21-30', 21, 30, 3), ('31-40', 31, 40, 4),
  ('41-50', 41, 50, 5), ('51-100', 51, 100, 6), ('101-200', 101, 200, 7), ('200+', 201, null, 8)
) as t(label, min_skins, max_skins, sort)
where not exists (select 1 from public.nfa_tiers);

-- Para ser o dono da loja (libera o gerenciador de cupons), rode UMA vez com o seu e-mail:
-- insert into public.store_owners (email) values ('seu-email@exemplo.com') on conflict do nothing;

-- ---------- Tempo real (favoritos e pedidos atualizam na tela sozinhos) ----------
do $$
begin
  begin alter publication supabase_realtime add table public.user_favorites; exception when others then null; end;
  begin alter publication supabase_realtime add table public.user_orders; exception when others then null; end;
end $$;
