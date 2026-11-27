import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  DbCoupon, DbFavorite, DbOrder, DbProfile, FavoriteSnapshot, GameSlug, NfaTier, WalletTx,
} from '../types';

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/* ------------------------------ Perfil ------------------------------ */

const PROFILE_COLS = 'id, email, display_name, avatar_url, provider, wallet_balance, active_coupon';

/** Carrega o perfil; se for o primeiro login e ainda não existir, cria (só colunas permitidas). */
export async function ensureProfile(user: User): Promise<DbProfile> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle();
  fail(error);
  if (data) return normalizeProfile(data);

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const insert = {
    id: user.id,
    email: user.email ?? null,
    display_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Cliente',
    avatar_url: meta.avatar_url || meta.picture || null,
    provider: (user.app_metadata?.provider as string | undefined) ?? 'email',
  };
  const created = await supabase.from('profiles').upsert(insert, { onConflict: 'id', ignoreDuplicates: true });
  fail(created.error);
  const again = await supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle();
  fail(again.error);
  return normalizeProfile(again.data ?? { ...insert, wallet_balance: 0, active_coupon: null });
}

function normalizeProfile(r: any): DbProfile {
  return { ...r, wallet_balance: Number(r.wallet_balance ?? 0) };
}

export async function updateProfile(id: string, patch: { display_name?: string; active_coupon?: string | null }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  fail(error);
}

/* ------------------------------ Pedidos (somente leitura no navegador) ------------------------------ */

export async function listOrders(): Promise<DbOrder[]> {
  const { data, error } = await supabase
    .from('user_orders')
    .select('id, external_ref, order_id, game, account_id, title, status, final_price, original_price, coupon_code, checkout, delivery, delivered_at, created_at')
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []).map((o: any) => ({
    ...o,
    final_price: o.final_price === null ? null : Number(o.final_price),
    original_price: o.original_price === null ? null : Number(o.original_price),
  }));
}

/* ------------------------------ Favoritos ------------------------------ */

export async function listFavorites(): Promise<DbFavorite[]> {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('id, game, item_id, snapshot, created_at')
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as DbFavorite[];
}

export async function addFavorite(userId: string, game: GameSlug, itemId: string, snapshot: FavoriteSnapshot) {
  const { error } = await supabase
    .from('user_favorites')
    .upsert({ user_id: userId, game, item_id: itemId, snapshot }, { onConflict: 'user_id,game,item_id', ignoreDuplicates: true });
  fail(error);
}

export async function removeFavorite(userId: string, game: GameSlug, itemId: string) {
  const { error } = await supabase.from('user_favorites').delete().eq('user_id', userId).eq('game', game).eq('item_id', itemId);
  fail(error);
}

/* ------------------------------ Carteira ------------------------------ */

export async function listWalletTx(): Promise<WalletTx[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id, amount, kind, description, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  fail(error);
  return (data ?? []).map((t: any) => ({ ...t, amount: Number(t.amount) }));
}

/* ------------------------------ Cupons ------------------------------ */

export async function validateCoupon(code: string): Promise<{ code: string; percent: number } | null> {
  const { data, error } = await supabase.rpc('validate_coupon', { p_code: code });
  fail(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { code: row.code, percent: Number(row.percent) } : null;
}

export async function isStoreOwner(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_store_owner');
  if (error) return false;
  return data === true;
}

export async function listCoupons(): Promise<DbCoupon[]> {
  const { data, error } = await supabase.from('coupons').select('id, code, percent, active, created_at').order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as DbCoupon[];
}

export async function createCoupon(code: string, percent: number) {
  const { error } = await supabase.from('coupons').insert({ code: code.trim().toUpperCase(), percent, active: true });
  fail(error);
}

export async function setCouponActive(id: string, active: boolean) {
  const { error } = await supabase.from('coupons').update({ active }).eq('id', id);
  fail(error);
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  fail(error);
}

/* ------------------------------ Faixas NFA ------------------------------ */

export async function listNfaTiers(): Promise<NfaTier[]> {
  const { data, error } = await supabase.from('nfa_tiers').select('id, label, min_skins, max_skins, price, stock, sort').order('sort');
  fail(error);
  return (data ?? []).map((t: any) => ({ ...t, price: t.price === null ? null : Number(t.price) }));
}
