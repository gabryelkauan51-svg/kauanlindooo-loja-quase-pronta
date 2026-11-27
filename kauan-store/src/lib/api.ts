import { supabase } from './supabase';
import type {
  AccountDetailsResponse,
  CatalogParams,
  CatalogResponse,
  CheckoutResponse,
  GameSlug,
  MailboxResponse,
  OrderStatusResponse,
} from '../types';

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Query = Record<string, string | number | undefined | null>;

/** Erro de chamada às funções, com o código devolvido pelo servidor (ex.: AUTH_REQUIRED). */
export class ApiError extends Error {
  code: string | null;
  data: any;
  constructor(message: string, code: string | null = null, data: any = null) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

async function authToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? KEY;
  } catch {
    return KEY;
  }
}

async function call<T>(
  fn: string,
  opts: { method?: 'GET' | 'POST'; query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { method = 'GET', query, body, signal } = opts;

  if (!import.meta.env.VITE_SUPABASE_URL || !KEY) {
    throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.');
  }

  const url = new URL(`${BASE}/${fn}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const token = await authToken();
  const res = await fetch(url.toString(), {
    method,
    signal,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* resposta sem JSON */
  }

  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Erro ${res.status}. Tente novamente.`, data?.code ?? null, data);
  }
  return data as T;
}

export function fetchCatalog(params: CatalogParams, signal?: AbortSignal) {
  return call<CatalogResponse>('catalog', {
    query: {
      game: params.game,
      page: params.page,
      perPage: params.perPage,
      priceFrom: params.priceFrom,
      priceTo: params.priceTo,
      order: params.order,
    },
    signal,
  });
}

export function fetchAccountDetails(id: string | number, game: GameSlug, signal?: AbortSignal) {
  return call<AccountDetailsResponse>('account-details', { query: { id: String(id), game }, signal });
}

export function createCheckout(accountId: string | number, game: GameSlug, title?: string) {
  return call<CheckoutResponse>('create-checkout', {
    method: 'POST',
    body: { accountId: String(accountId), game, title },
  });
}

/** Lê os e-mails recentes (e o código mais novo) do e-mail entregue no pedido. */
export function fetchMailbox(orderRowId: string) {
  return call<MailboxResponse>('read-mailbox', { method: 'POST', body: { id: orderRowId } });
}

/** Cria o depósito por PIX na carteira (mínimo R$ 5,00). */
export function createDeposit(amount: number) {
  return call<{ copyPaste?: string; qrCodeImage?: string }>('create-deposit', { method: 'POST', body: { amount } });
}

export function fetchOrderStatus(order: { orderId?: string | null; externalRef?: string | null }) {
  return call<OrderStatusResponse>('check-order', {
    query: { orderId: order.orderId ?? undefined, externalRef: order.externalRef ?? undefined },
  });
}
