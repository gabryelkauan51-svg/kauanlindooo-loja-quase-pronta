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
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const p = await readParams(req);

    if (!isValidGame(p.game)) {
      return json({ error: 'Parâmetro "game" inválido ou ausente.', allowed: GAMES }, 400);
    }

    const page = Math.max(1, parseInt(p.page ?? '1', 10) || 1);
    const perPage = Math.min(48, Math.max(1, parseInt(p.perPage ?? '24', 10) || 24));
    const order = p.order === 'price_asc' || p.order === 'price_desc' ? p.order : undefined;

    // O filtro de preço do cliente é sobre o preço FINAL (com margem).
    // Convertemos de volta para o preço base antes de consultar o fornecedor.
    const factor = 1 + getMarginPercent(p.game) / 100;
    const toBase = (v?: string) => {
      const n = Number(v);
      return v && Number.isFinite(n) && n >= 0 ? (n / factor).toFixed(2) : undefined;
    };

    const data = await legasFetch('/accounts', {
      query: {
        game: p.game,
        page,
        perPage,
        priceFrom: toBase(p.priceFrom),
        priceTo: toBase(p.priceTo),
        order,
      },
    });

    const items = extractList(data).map((acc) => withMargin(acc, p.game));
    const pagination = data?.pagination ?? data?.meta ?? { page, perPage, total: data?.total ?? items.length };

    return json({ game: p.game, items, pagination });
  } catch (err) {
    return errorResponse(err);
  }
});
