export type GameSlug =
  | 'valorant'
  | 'fortnite'
  | 'steam'
  | 'roblox'
  | 'league-of-legends'
  | 'clash-royale'
  | 'genshin-impact'
  | 'brawl-stars'
  | 'rocket-league'
  | 'epic-games'
  | 'ea'
  | 'ubisoft';

export type Account = { id: string | number; price: number | null } & Record<string, unknown>;

export interface Pagination {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export type Order = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | '';

export interface CatalogParams {
  game: GameSlug;
  page: number;
  perPage: number;
  priceFrom?: string;
  priceTo?: string;
  order?: Order;
}

export interface CatalogResponse {
  game: GameSlug;
  items: Account[];
  pagination?: Pagination;
}

export type Skin = string | Record<string, unknown>;

export interface AccountDetailsResponse {
  account: Account;
  skins: Skin[];
}

export interface CheckoutResponse {
  orderId: string | null;
  externalRef: string;
  accountId: string;
  game: GameSlug;
  displayPrice: number | null;
  chargedAmount: number | null;
  /**
   * Valor final com margem, resolvido no front ao criar o pedido
   * (displayPrice → preço do catálogo → chargedAmount). Salvo junto do pedido.
   */
  finalPrice?: number | null;
  qrCodeImage: string | null;
  copyPaste: string | null;
  expiresAt: string | null;
}

export type Credentials = string | Record<string, unknown> | null;

export interface OrderStatusResponse {
  status: 'pending' | 'paid' | 'failed';
  found: boolean;
  rawStatus?: string | null;
  delivered?: boolean;
  credentials?: Credentials;
}

/* ------------------------------ Dados na nuvem (Supabase) ------------------------------ */

export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'failed';

export interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  wallet_balance: number;
  active_coupon: string | null;
}

export interface DbOrder {
  id: string;
  external_ref: string | null;
  order_id: string | null;
  game: GameSlug;
  account_id: string | null;
  title: string | null;
  status: OrderStatus;
  final_price: number | null;
  original_price: number | null;
  coupon_code: string | null;
  checkout: CheckoutResponse | null;
  delivery: unknown;
  delivered_at: string | null;
  created_at: string;
}

export interface FavoriteSnapshot {
  title?: string;
  image?: string | null;
  price?: number | null;
  [k: string]: unknown;
}

export interface DbFavorite {
  id: string;
  game: GameSlug;
  item_id: string;
  snapshot: FavoriteSnapshot | null;
  created_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  percent: number;
  active: boolean;
  created_at: string;
}

export interface WalletTx {
  id: string;
  amount: number;
  kind: string;
  description: string | null;
  created_at: string;
}

export interface NfaTier {
  id: string;
  label: string;
  min_skins: number;
  max_skins: number | null;
  price: number | null;
  stock: number;
  sort: number;
}

export interface MailMessage {
  id: string;
  from: string;
  subject: string;
  date: string | null;
  code: string | null;
  body: string;
}

export interface MailboxResponse {
  email: string;
  webUrl: string;
  latestCode: { code: string; from: string; date: string | null } | null;
  messages: MailMessage[];
}

/* ------------------------------ Filtros do catálogo ------------------------------ */

export interface InventoryFilters {
  withSkins: boolean;
  withKnife: boolean;
  skinQuery: string;
  minSkins: string;
  minKnives: string;
  minVp: string;
}

export const EMPTY_INVENTORY: InventoryFilters = {
  withSkins: false,
  withKnife: false,
  skinQuery: '',
  minSkins: '',
  minKnives: '',
  minVp: '',
};

/* ------------------------------ Filtros exclusivos do Valorant ------------------------------ */

export type TierKey = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'ascendant' | 'immortal' | 'radiant';
export type RegionKey = 'br' | 'eu' | 'na' | 'ap' | 'latam';

export interface ValorantFilters {
  tier: TierKey | 'all';
  region: RegionKey | 'all';
  minLevel: string;
  phone: 'all' | 'with' | 'without';
  email: 'all' | 'og' | 'none';
  /** Dias de inatividade mínimos ("" = qualquer). */
  inactive: '' | '30' | '90' | '180' | '365';
}

export const EMPTY_VALORANT: ValorantFilters = {
  tier: 'all',
  region: 'all',
  minLevel: '',
  phone: 'all',
  email: 'all',
  inactive: '',
};
