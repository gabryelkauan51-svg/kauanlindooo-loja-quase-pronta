import { createClient } from 'npm:@supabase/supabase-js@2';
// =====================================================================
// BLOCO COMUM (CORS + helpers da Legas Forn) — idêntico nas 4 funções
// =====================================================================
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return null;
}

/** Lê parâmetros da query string (GET) e/ou do body JSON (POST). */
async function readParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => (params[k] = v));
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        for (const [k, v] of Object.entries(body)) {
          if (v !== undefined && v !== null) params[k] = String(v);
        }
      }
    } catch {
      /* body vazio ou inválido */
    }
  }
  return params;
}

const BASE_URL = 'https://legasforn.com.br/api/v1';

const GAMES = [
  'valorant', 'fortnite', 'steam', 'roblox', 'league-of-legends', 'clash-royale',
  'genshin-impact', 'brawl-stars', 'rocket-league', 'epic-games', 'ea', 'ubisoft',
] as const;

function isValidGame(game: unknown): game is string {
  return typeof game === 'string' && (GAMES as readonly string[]).includes(game);
}

class LegasError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status = 500, details: unknown = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Margem de lucro em %. Steam usa 70% (STEAM_MARGIN_PERCENT, padrão 70); os demais usam LEGAS_MARGIN_PERCENT. */
function getMarginPercent(game?: string): number {
  if (game === 'steam') {
    const st = Number(Deno.env.get('STEAM_MARGIN_PERCENT') ?? 70);
    return Number.isFinite(st) && st >= 0 ? st : 70;
  }
  const n = Number(Deno.env.get('LEGAS_MARGIN_PERCENT'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** price * (1 + margem/100), arredondado para 2 casas decimais. */
function applyMargin(basePrice: number, game?: string): number {
  const final = basePrice * (1 + getMarginPercent(game) / 100);
  return Math.round((final + Number.EPSILON) * 100) / 100;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

const PRICE_KEYS_TO_REMOVE = [
  'price', 'originalPrice', 'original_price', 'basePrice', 'base_price',
  'cost', 'costPrice', 'cost_price', 'wholesalePrice', 'wholesale_price',
];

/** Troca o preço base pelo final (com margem) e remove qualquer preço original. */
function withMargin(account: Record<string, any>, game?: string): Record<string, any> {
  const base = toNumber(account.price);
  const clean: Record<string, any> = { ...account };
  for (const key of PRICE_KEYS_TO_REMOVE) delete clean[key];
  clean.price = Number.isFinite(base) ? applyMargin(base, game) : null;
  return clean;
}

const SENSITIVE_KEYS = /(password|senha|credential|credencia|login|secret|token)/i;

/** Remove campos sensíveis que nunca devem aparecer antes da compra. */
function stripSensitive(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!SENSITIVE_KEYS.test(k)) out[k] = v;
  }
  return out;
}

interface LegasRequest {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

async function legasFetch(path: string, opts: LegasRequest = {}): Promise<any> {
  const { method = 'GET', query, body, headers = {} } = opts;
  const apiKey = Deno.env.get('LEGAS_API_KEY');
  if (!apiKey) throw new LegasError('LEGAS_API_KEY não configurada nas Secrets.', 500);

  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.message || data?.error?.message || data?.error || `Erro ${res.status} na API Legas Forn`;
    throw new LegasError(typeof message === 'string' ? message : 'Erro na API Legas Forn', res.status, data);
  }
  return data;
}

/** Extrai a lista de itens independente do formato do envelope. */
function extractList(data: any): any[] {
  if (Array.isArray(data)) return data;
  for (const key of ['data', 'items', 'accounts', 'orders', 'results']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

/** Primeiro valor definido entre vários nomes possíveis de campo (aceita "a.b"). */
function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    const v = k.split('.').reduce((acc: any, part) => acc?.[part], obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function errorResponse(err: unknown): Response {
  if (err instanceof LegasError) return json({ error: err.message, details: err.details }, err.status);
  console.error(err);
  return json({ error: 'Erro interno inesperado.' }, 500);
}

// =====================================================================
// FUNÇÃO
// =====================================================================

// ---------- Autenticação do cliente (Supabase) ----------
function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Valida o token do cliente logado. Retorna null se não houver login válido. */
async function getUser(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return null;
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { user: data.user, admin };
}

const NEED_LOGIN = () => json({ error: 'Entre na sua conta para continuar.', code: 'AUTH_REQUIRED' }, 401);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  try {
    const auth = await getUser(req);
    if (!auth) return NEED_LOGIN();

    const p = await readParams(req);
    const accountId = p.accountId?.trim();
    if (!accountId || !/^[\w.-]{1,128}$/.test(accountId)) {
      return json({ error: 'Parâmetro "accountId" inválido ou ausente.' }, 400);
    }
    if (!isValidGame(p.game)) {
      return json({ error: 'Parâmetro "game" inválido ou ausente.', allowed: GAMES }, 400);
    }

    const accRaw = await legasFetch(`/accounts/${encodeURIComponent(accountId)}`, { query: { game: p.game } });
    const acc = accRaw?.data && !Array.isArray(accRaw.data) ? accRaw.data : accRaw;
    const basePrice = toNumber(acc?.price);
    const displayPrice = Number.isFinite(basePrice) ? applyMargin(basePrice, p.game) : null;

    const externalRef = `pedido-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const checkout = await legasFetch('/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: { accountId, game: p.game, externalRef },
    });
    const c = checkout?.data && !Array.isArray(checkout.data) ? checkout.data : checkout;

    const orderId = pick(c, ['orderId', 'order_id', 'order.id', 'id']);
    const qrCodeImage = pick(c, [
      'pix.qrCodeBase64', 'pix.qr_code_base64', 'pix.qrCodeImage', 'pix.qrCode',
      'qrCodeBase64', 'qr_code_base64', 'qrCodeImage', 'qrCode', 'qr_code',
    ]);
    const copyPaste = pick(c, [
      'pix.copyPaste', 'pix.copiaECola', 'pix.copia_e_cola', 'pix.emv', 'pix.payload', 'pix.code',
      'copyPaste', 'copiaECola', 'copia_e_cola', 'pixCopiaECola', 'emv', 'payload',
    ]);
    const expiresAt = pick(c, ['pix.expiresAt', 'pix.expires_at', 'expiresAt', 'expires_at']);
    const chargedAmount = toNumber(pick(c, ['pix.amount', 'amount', 'total', 'value', 'price']));

    if (!copyPaste && !qrCodeImage) {
      console.error('Resposta inesperada do checkout:', JSON.stringify(c));
      return json({ error: 'A Legas Forn não retornou os dados do PIX.' }, 502);
    }

    const result = {
      orderId,
      externalRef: pick(c, ['externalRef', 'external_ref']) ?? externalRef,
      accountId,
      game: p.game,
      displayPrice,
      chargedAmount: Number.isFinite(chargedAmount) ? chargedAmount : null,
      qrCodeImage,
      copyPaste,
      expiresAt,
    };

    // Registra o pedido na conta do cliente (só a função consegue gravar em user_orders).
    const title = (p.title || `Conta #${accountId}`).toString().slice(0, 140);
    const { error: dbError } = await auth.admin.from('user_orders').insert({
      user_id: auth.user.id,
      external_ref: result.externalRef,
      order_id: orderId ? String(orderId) : null,
      game: p.game,
      account_id: accountId,
      title,
      status: 'pending',
      final_price: displayPrice,
      checkout: result,
    });
    if (dbError) console.error('Falha ao salvar pedido:', dbError.message);

    return json({ ...result, saved: !dbError });
  } catch (err) {
    return errorResponse(err);
  }
});
