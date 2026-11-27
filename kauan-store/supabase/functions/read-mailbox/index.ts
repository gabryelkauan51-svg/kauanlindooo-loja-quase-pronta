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

// Leitura de códigos do e-mail entregue junto com a conta.
// Só funciona para o dono do pedido (login obrigatório) e a senha do e-mail NUNCA volta ao navegador.
// Observação: Outlook/Hotmail bloqueiam login IMAP por senha em muitas contas. Nesses casos a
// função devolve AUTH_FAILED e o cliente vê o aviso para abrir o site do e-mail ou chamar o suporte.

class ImapError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const latin1 = (b: Uint8Array) => {
  let s = '';
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
};
const toBytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const decodeBytes = (s: string, charset = 'utf-8') => {
  try {
    return new TextDecoder(charset.toLowerCase()).decode(toBytes(s));
  } catch {
    return new TextDecoder('utf-8').decode(toBytes(s));
  }
};

function mailboxInfo(email: string): { host: string; webUrl: string } {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (/(hotmail|outlook|live|msn)\./.test(domain)) return { host: 'outlook.office365.com', webUrl: 'https://outlook.live.com/mail/' };
  if (/(gmail|googlemail)\./.test(domain)) return { host: 'imap.gmail.com', webUrl: 'https://mail.google.com/' };
  if (/yahoo\./.test(domain)) return { host: 'imap.mail.yahoo.com', webUrl: 'https://mail.yahoo.com/' };
  if (/(icloud|me|mac)\./.test(domain)) return { host: 'imap.mail.me.com', webUrl: 'https://www.icloud.com/mail' };
  if (/firstmail\./.test(domain)) return { host: 'imap.firstmail.ltd', webUrl: `https://${domain}/` };
  return { host: `imap.${domain}`, webUrl: `https://${domain}/` };
}

function decodeWords(v: string): string {
  return v.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, cs, enc, text) => {
    try {
      if (String(enc).toLowerCase() === 'b') return decodeBytes(atob(text), cs);
      const q = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_x: string, h: string) => String.fromCharCode(parseInt(h, 16)));
      return decodeBytes(q, cs);
    } catch {
      return text;
    }
  }).replace(/\?=\s+=\?/g, '');
}

function parseHeaders(raw: string): Record<string, string> {
  const unfolded = raw.replace(/\r\n[ \t]+/g, ' ');
  const out: Record<string, string> = {};
  for (const line of unfolded.split('\r\n')) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}

function decodeTransfer(body: string, cte: string, charset: string): string {
  const e = cte.toLowerCase();
  if (e.includes('base64')) {
    try {
      return decodeBytes(atob(body.replace(/\s+/g, '')), charset);
    } catch {
      return body;
    }
  }
  if (e.includes('quoted-printable')) {
    const q = body.replace(/=\r\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
    return decodeBytes(q, charset);
  }
  return decodeBytes(body, charset);
}

const stripHtml = (h: string) =>
  h.replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

function readableBody(raw: string, headers: Record<string, string>): string {
  const ct = headers['content-type'] ?? '';
  const boundary = ct.match(/boundary="?([^";\s]+)"?/i)?.[1];
  const single = (part: string, partHeaders: Record<string, string>) => {
    const pct = partHeaders['content-type'] ?? 'text/plain';
    const cs = pct.match(/charset="?([^";\s]+)"?/i)?.[1] ?? 'utf-8';
    const text = decodeTransfer(part, partHeaders['content-transfer-encoding'] ?? '7bit', cs);
    return /text\/html/i.test(pct) ? stripHtml(text) : text.trim();
  };

  if (boundary) {
    const parts = raw.split(`--${boundary}`).slice(1);
    let html = '';
    for (const part of parts) {
      const idx = part.indexOf('\r\n\r\n');
      if (idx < 0) continue;
      const ph = parseHeaders(part.slice(0, idx).replace(/^\r\n/, ''));
      const body = part.slice(idx + 4);
      const pct = ph['content-type'] ?? '';
      if (/text\/plain/i.test(pct)) return single(body, ph);
      if (/text\/html/i.test(pct) && !html) html = single(body, ph);
    }
    return html;
  }
  return single(raw, { 'content-type': ct || 'text/plain', 'content-transfer-encoding': headers['content-transfer-encoding'] ?? '' });
}

function extractCode(text: string): string | null {
  const t = text.replace(/\s+/g, ' ');
  // Códigos alfanuméricos em maiúsculas (ex.: Steam Guard: 7KQ2M)
  const alpha = t.match(/(?:code|c[óo]digo)\s*(?:is|é|:)?\s*:?\s*\b([A-Z0-9]{5,8})\b/);
  if (alpha && /\d/.test(alpha[1]) && /[A-Z]/.test(alpha[1])) return alpha[1];
  const near = t.match(/(?:c[óo]digo|code|verifica[çc][ãa]o|verification|security|seguran[çc]a|pin|otp|senha[- ]?[úu]nica)[^0-9]{0,60}\b(\d{4,8})\b/i);
  if (near) return near[1];
  const lone = t.match(/(?:^|[^\d])(\d{6})(?!\d)/);
  return lone ? lone[1] : null;
}

function parseFetch(text: string) {
  const starts = [...text.matchAll(/\* (\d+) FETCH \(/g)];
  return starts.map((s, i) => {
    const seg = text.slice(s.index!, i + 1 < starts.length ? starts[i + 1].index! : undefined);
    const lits: string[] = [];
    let cursor = 0;
    while (true) {
      const rel = seg.slice(cursor).search(/\{\d+\}\r\n/);
      if (rel < 0) break;
      const m = seg.slice(cursor + rel).match(/^\{(\d+)\}\r\n/)!;
      const len = Number(m[1]);
      const start = cursor + rel + m[0].length;
      lits.push(seg.slice(start, start + len));
      cursor = start + len;
    }
    return { seq: Number(s[1]), header: lits[0] ?? '', body: lits[1] ?? '' };
  });
}

async function readImap(host: string, user: string, pass: string, limit: number) {
  let conn: Deno.TlsConn;
  try {
    conn = await Deno.connectTls({ hostname: host, port: 993 });
  } catch {
    throw new ImapError('CONNECTION', 'Não conseguimos conectar ao servidor deste e-mail.');
  }
  const enc = new TextEncoder();
  const chunk = new Uint8Array(65536);
  let buf = '';
  const timer = setTimeout(() => { try { conn.close(); } catch { /* já fechado */ } }, 25_000);

  const readMore = async () => {
    const n = await conn.read(chunk);
    if (n === null) throw new ImapError('CONNECTION', 'A conexão com o e-mail foi encerrada.');
    buf += latin1(chunk.subarray(0, n));
  };

  try {
    while (!buf.includes('\r\n')) await readMore();
    buf = '';
    let counter = 0;
    const cmd = async (c: string) => {
      const tag = `a${++counter}`;
      await conn.write(enc.encode(`${tag} ${c}\r\n`));
      const re = new RegExp(`(^|\\r\\n)${tag} (OK|NO|BAD)[^\\r\\n]*\\r\\n`);
      while (!re.test(buf)) await readMore();
      const m = buf.match(re)!;
      const end = (m.index ?? 0) + m[0].length;
      const text = buf.slice(0, end);
      buf = buf.slice(end);
      return { ok: m[2] === 'OK', text };
    };
    const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

    const login = await cmd(`LOGIN ${q(user)} ${q(pass)}`);
    if (!login.ok) throw new ImapError('AUTH_FAILED', 'Login recusado pelo provedor.');

    const sel = await cmd('SELECT INBOX');
    if (!sel.ok) throw new ImapError('CONNECTION', 'Não foi possível abrir a caixa de entrada.');
    const exists = Number(sel.text.match(/\* (\d+) EXISTS/)?.[1] ?? 0);
    if (!exists) { await cmd('LOGOUT').catch(() => undefined); return []; }

    const start = Math.max(1, exists - limit + 1);
    const fetched = await cmd(
      `FETCH ${start}:${exists} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING)] BODY.PEEK[TEXT]<0.12000>)`,
    );
    await cmd('LOGOUT').catch(() => undefined);

    return parseFetch(fetched.text)
      .map((m) => {
        const h = parseHeaders(m.header);
        const subject = decodeWords(h['subject'] ?? '(sem assunto)');
        const body = readableBody(m.body, h).slice(0, 4000);
        const date = h['date'] ? new Date(h['date']) : null;
        return {
          id: String(m.seq),
          from: decodeWords(h['from'] ?? ''),
          subject,
          date: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
          code: extractCode(`${subject} ${body}`),
          body,
        };
      })
      .reverse();
  } finally {
    clearTimeout(timer);
    try { conn.close(); } catch { /* já fechado */ }
  }
}

// Normaliza as chaves do que a Legas Forn entregou (só e-mail e senha do e-mail).
function mailCredentials(delivery: any): { email: string | null; password: string | null } {
  const flat: Record<string, unknown> = {};
  const walk = (o: any) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object') walk(v);
      else flat[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
    }
  };
  walk(delivery);
  const get = (...keys: string[]) => {
    for (const k of keys) if (typeof flat[k] === 'string' && (flat[k] as string).trim()) return (flat[k] as string).trim();
    return null;
  };
  return {
    email: get('email', 'mail', 'emailaddress', 'emaillogin', 'emailacesso'),
    password: get('emailpassword', 'emailpass', 'mailpassword', 'senhaemail', 'emailsenha', 'mailpass', 'passwordemail'),
  };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const auth = await getUser(req);
    if (!auth) return NEED_LOGIN();

    const p = await readParams(req);
    const id = p.id?.trim();
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Pedido inválido.' }, 400);

    // Só lê o e-mail de um pedido ENTREGUE que pertence a este cliente.
    const { data: row } = await auth.admin
      .from('user_orders')
      .select('id, status, delivery')
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (!row || row.status !== 'delivered' || !row.delivery) return json({ error: 'Pedido não encontrado.' }, 404);

    const { email, password } = mailCredentials(row.delivery);
    if (!email || !password) {
      return json({ error: 'Este pedido não inclui acesso ao e-mail.', code: 'NO_EMAIL' }, 404);
    }

    const info = mailboxInfo(email);
    try {
      const messages = await readImap(info.host, email, password, 10);
      const latest = messages.find((m) => m.code) ?? null;
      return json({ email, webUrl: info.webUrl, latestCode: latest ? { code: latest.code, from: latest.from, date: latest.date } : null, messages });
    } catch (e) {
      if (e instanceof ImapError) {
        const status = e.code === 'AUTH_FAILED' ? 422 : 502;
        const message =
          e.code === 'AUTH_FAILED'
            ? 'Não conseguimos entrar neste e-mail. A senha do e-mail pode ter sido alterada.'
            : e.message;
        return json({ error: message, code: e.code, webUrl: info.webUrl }, status);
      }
      throw e;
    }
  } catch (err) {
    console.error('read-mailbox:', err instanceof Error ? err.message : err);
    return errorResponse(err);
  }
});
