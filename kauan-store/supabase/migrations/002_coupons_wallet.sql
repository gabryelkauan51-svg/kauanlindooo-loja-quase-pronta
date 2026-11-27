-- =====================================================================
-- Kauan Store: cupons com limite/validade e compra paga com saldo da carteira
-- Rode DEPOIS do 001_kauan_store.sql. Pode rodar mais de uma vez.
-- =====================================================================

-- ---------- Cupons: limite total de usos e validade ----------
alter table public.coupons add column if not exists max_uses int check (max_uses is null or max_uses > 0);
alter table public.coupons add column if not exists uses int not null default 0;
alter table public.coupons add column if not exists expires_at timestamptz;

-- Um uso por cliente: cada resgate fica registrado aqui.
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.user_orders(id) on delete set null,
  code text not null,
  percent int not null,
  discount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- ---------- Pedidos: forma de pagamento ----------
alter table public.user_orders add column if not exists payment_method text not null default 'pix';

-- Dados da compra no fornecedor (PIX da Legas Forn). Só o dono da loja e as funções veem.
create table if not exists public.supplier_purchases (
  order_id uuid primary key references public.user_orders(id) on delete cascade,
  supplier_order_id text,
  checkout jsonb,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.coupon_redemptions enable row level security;
alter table public.supplier_purchases enable row level security;

drop policy if exists redemptions_select_own on public.coupon_redemptions;
drop policy if exists redemptions_select_owner on public.coupon_redemptions;
create policy redemptions_select_own on public.coupon_redemptions for select to authenticated using (user_id = auth.uid());
create policy redemptions_select_owner on public.coupon_redemptions for select to authenticated using (public.is_store_owner());
revoke insert, update, delete on public.coupon_redemptions from authenticated, anon;

-- Sem política para clientes: supplier_purchases só é acessada pelo service role.
revoke all on public.supplier_purchases from authenticated, anon;

-- O contador de usos só muda pela função de compra/estorno (o dono edita as demais colunas).
revoke update on public.coupons from authenticated, anon;
grant update (code, percent, active, max_uses, expires_at) on public.coupons to authenticated;

-- ---------- Validação de cupom (aba Cupons e checkout) ----------
-- Devolve { ok, code, percent, reason }. reason: not_found | inactive | expired | exhausted | already_used
create or replace function public.check_coupon(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
begin
  select * into c from public.coupons where upper(code) = upper(trim(coalesce(p_code, ''))) limit 1;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not c.active then return jsonb_build_object('ok', false, 'reason', 'inactive', 'code', c.code); end if;
  if c.expires_at is not null and c.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired', 'code', c.code);
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'exhausted', 'code', c.code);
  end if;
  if auth.uid() is not null and exists (
    select 1 from public.coupon_redemptions r where r.coupon_id = c.id and r.user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_used', 'code', c.code);
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'percent', c.percent, 'expires_at', c.expires_at);
end;
$$;
grant execute on function public.check_coupon(text) to authenticated;

-- Versão antiga: mantém a assinatura, mas agora respeita validade e limite.
create or replace function public.validate_coupon(p_code text)
returns table(code text, percent int) language sql stable security definer set search_path = public as $$
  select c.code, c.percent from public.coupons c
  where upper(c.code) = upper(trim(p_code)) and c.active
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.uses < c.max_uses)
  limit 1;
$$;

-- ---------- Compra paga com saldo (chamada só pela Edge Function wallet-checkout) ----------
-- Tudo numa transação: trava o saldo, confere o cupom, debita, registra o pedido e o uso do cupom.
create or replace function public.wallet_purchase(
  p_user uuid, p_game text, p_account_id text, p_title text, p_price numeric, p_coupon text, p_external_ref text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_balance numeric(12,2);
  v_coupon public.coupons%rowtype;
  v_percent int := 0;
  v_discount numeric(12,2) := 0;
  v_final numeric(12,2);
  v_order uuid;
  v_code text := nullif(upper(trim(coalesce(p_coupon, ''))), '');
begin
  if p_price is null or p_price <= 0 then raise exception 'PRICE_UNAVAILABLE'; end if;

  select wallet_balance into v_balance from public.profiles where id = p_user for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if v_code is not null then
    select * into v_coupon from public.coupons where upper(code) = v_code for update;
    if not found then raise exception 'COUPON_NOT_FOUND'; end if;
    if not v_coupon.active then raise exception 'COUPON_INACTIVE'; end if;
    if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then raise exception 'COUPON_EXPIRED'; end if;
    if v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then raise exception 'COUPON_EXHAUSTED'; end if;
    if exists (select 1 from public.coupon_redemptions where coupon_id = v_coupon.id and user_id = p_user) then
      raise exception 'COUPON_ALREADY_USED';
    end if;
    v_percent := v_coupon.percent;
    v_discount := round(p_price * v_percent / 100.0, 2);
  end if;

  v_final := round(p_price - v_discount, 2);
  if v_balance < v_final then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update public.profiles
     set wallet_balance = wallet_balance - v_final,
         active_coupon = case when v_code is not null and upper(coalesce(active_coupon, '')) = v_code then null else active_coupon end
   where id = p_user;

  insert into public.user_orders (user_id, external_ref, game, account_id, title, status, final_price, original_price, coupon_code, payment_method)
  values (p_user, p_external_ref, p_game, p_account_id, p_title, 'paid', v_final, case when v_discount > 0 then p_price else null end,
          case when v_code is not null then v_coupon.code else null end, 'wallet')
  returning id into v_order;

  insert into public.wallet_transactions (user_id, amount, kind, description)
  values (p_user, -v_final, 'purchase',
          left(coalesce(p_title, 'Compra') || case when v_code is not null then ' (cupom ' || v_coupon.code || ')' else '' end, 200));

  if v_code is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, code, percent, discount)
    values (v_coupon.id, p_user, v_order, v_coupon.code, v_percent, v_discount);
    update public.coupons set uses = uses + 1 where id = v_coupon.id;
  end if;

  return jsonb_build_object(
    'orderId', v_order, 'externalRef', p_external_ref, 'originalPrice', p_price, 'discount', v_discount,
    'finalPrice', v_final, 'couponCode', case when v_code is not null then v_coupon.code else null end,
    'percent', v_percent, 'balance', v_balance - v_final
  );
end;
$$;
revoke execute on function public.wallet_purchase(uuid, text, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.wallet_purchase(uuid, text, text, text, numeric, text, text) to service_role;

-- ---------- Estorno de pedido pago com saldo (painel do dono, via Edge Function) ----------
-- Devolve o saldo, marca o pedido como cancelado e libera o uso do cupom.
create or replace function public.wallet_refund(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.user_orders%rowtype;
  r public.coupon_redemptions%rowtype;
begin
  select * into o from public.user_orders where id = p_order for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_method <> 'wallet' or o.status <> 'paid' then raise exception 'ORDER_NOT_REFUNDABLE'; end if;

  update public.user_orders set status = 'failed' where id = o.id;
  update public.profiles set wallet_balance = wallet_balance + coalesce(o.final_price, 0) where id = o.user_id;
  insert into public.wallet_transactions (user_id, amount, kind, description)
  values (o.user_id, coalesce(o.final_price, 0), 'refund', left('Estorno: ' || coalesce(o.title, 'pedido'), 200));

  select * into r from public.coupon_redemptions where order_id = o.id;
  if found then
    delete from public.coupon_redemptions where id = r.id;
    update public.coupons set uses = greatest(uses - 1, 0) where id = r.coupon_id;
  end if;

  return jsonb_build_object('ok', true, 'refunded', coalesce(o.final_price, 0));
end;
$$;
revoke execute on function public.wallet_refund(uuid) from public, anon, authenticated;
grant execute on function public.wallet_refund(uuid) to service_role;

-- ---------- Ajuste manual de saldo pelo dono (painel admin) ----------
create or replace function public.owner_adjust_wallet(p_email text, p_amount numeric, p_description text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_balance numeric(12,2);
begin
  if not public.is_store_owner() then raise exception 'NOT_OWNER'; end if;
  if p_amount is null or p_amount = 0 then raise exception 'INVALID_AMOUNT'; end if;

  select id, wallet_balance into v_id, v_balance from public.profiles
   where lower(email) = lower(trim(p_email)) for update;
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  if v_balance + p_amount < 0 then raise exception 'NEGATIVE_BALANCE'; end if;

  update public.profiles set wallet_balance = wallet_balance + round(p_amount, 2) where id = v_id;
  insert into public.wallet_transactions (user_id, amount, kind, description)
  values (v_id, round(p_amount, 2), 'adjust', left(coalesce(nullif(trim(p_description), ''), 'Ajuste de saldo'), 200));
  return jsonb_build_object('ok', true, 'balance', v_balance + round(p_amount, 2));
end;
$$;
grant execute on function public.owner_adjust_wallet(text, numeric, text) to authenticated;

-- ---------- Cupom de lançamento ----------
insert into public.coupons (code, percent, active) values ('LANCAMENTO20', 20, true) on conflict (code) do nothing;
