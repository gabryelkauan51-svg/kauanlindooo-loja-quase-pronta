import type { Account, GameSlug, Skin } from '../types';

/* ------------------------------------------------------------------ */
/* Segurança: campos internos nunca aparecem para o cliente           */
/* ------------------------------------------------------------------ */

const INTERNAL_KEY =
  /(reseller|revend|supplier|fornecedor|vendor|seller|wallet|carteira|saldo|margin|margem|cost|custo|commission|comiss|profit|lucro|apikey|api_key|secret|token|password|senha|login|credential)/i;

/** Campos técnicos que não interessam ao cliente (ids, links, datas). */
const TECHNICAL_KEY = /(^id$|id$|uuid|url$|link$|slug|hash|created|updated|status|state|ref$|^raw)/i;

export function isInternalKey(key: string): boolean {
  return INTERNAL_KEY.test(key);
}

export function isTechnicalKey(key: string): boolean {
  return TECHNICAL_KEY.test(key);
}

/* ------------------------------------------------------------------ */
/* Métricas da conta, lidas só dos campos reais que a API devolve     */
/* ------------------------------------------------------------------ */

export type StatKind =
  | 'rank'
  | 'skins'
  | 'knives'
  | 'agents'
  | 'champions'
  | 'pickaxes'
  | 'emotes'
  | 'level'
  | 'radianite'
  | 'currency'
  | 'region';

export interface Stat {
  kind: StatKind;
  key: string;
  label: string;
  value: string;
  raw: number | null;
  /** Veio do tamanho de uma lista (pode ser só uma amostra do total). */
  fromList?: boolean;
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

interface Rule {
  kind: StatKind;
  label: string;
  test: RegExp;
  text?: boolean;
}

const RULES: Rule[] = [
  { kind: 'rank', label: 'Elo', test: /(rank|elo|tier|division)/, text: true },
  { kind: 'knives', label: 'Facas', test: /(knife|knives|faca|melee)/ },
  { kind: 'pickaxes', label: 'Picaretas', test: /(pickaxe|picareta|harvest)/ },
  { kind: 'emotes', label: 'Emotes', test: /emote/ },
  { kind: 'skins', label: 'Skins', test: /skin/ },
  { kind: 'agents', label: 'Agentes', test: /agent/ },
  { kind: 'champions', label: 'Campeões', test: /champion|brawler|character|personage/ },
  { kind: 'level', label: 'Nível', test: /(level|lvl|nivel)/ },
  { kind: 'radianite', label: 'Radianita', test: /radian(ite|ita)/ },
  {
    kind: 'currency',
    label: 'Moeda / Pontos',
    test: /(valorantpoints|vbucks|robux|coins|gems|primogem|currency|moeda|points|^vp$|vp$|^rp$|blueessence|gold)/,
  },
  { kind: 'region', label: 'Região', test: /(region|server|country|regiao)/, text: true },
];

/** Rótulo da moeda de cada jogo. */
const CURRENCY_LABEL: Partial<Record<GameSlug, string>> = {
  valorant: 'VP',
  fortnite: 'V-Bucks',
  roblox: 'Robux',
  'league-of-legends': 'RP',
  'genshin-impact': 'Gemas',
  'clash-royale': 'Gemas',
  'brawl-stars': 'Gemas',
};

function numeric(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
}

/** Algumas contas trazem os números só no título ("131 Skins | 2500 V-Bucks | Lvl 1393"). */
function parseTitleMetrics(title: string): Partial<Record<StatKind, number>> {
  const out: Partial<Record<StatKind, number>> = {};
  const grab = (re: RegExp) => {
    const m = title.match(re);
    if (!m) return undefined;
    const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };
  const patterns: [StatKind, RegExp][] = [
    ['skins', /(\d[\d.]*)\s*skins?/i],
    ['pickaxes', /(\d[\d.]*)\s*(?:picaretas?|pickaxes?)/i],
    ['emotes', /(\d[\d.]*)\s*emotes?/i],
    ['currency', /(\d[\d.]*)\s*(?:v-?bucks|robux|vp)\b/i],
    ['level', /(?:lvl|level|n[ií]vel)\s*(\d[\d.]*)/i],
    ['knives', /(\d[\d.]*)\s*(?:facas?|knives|knife)/i],
    ['agents', /(\d[\d.]*)\s*agent/i],
  ];
  for (const [kind, re] of patterns) {
    const n = grab(re);
    if (n !== undefined) out[kind] = n;
  }
  return out;
}

function accountTitle(acc: Account): string {
  for (const k of ['title', 'name', 'headline']) {
    const v = acc[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
}

const fmt = (n: number) => n.toLocaleString('pt-BR');

/**
 * Extrai métricas conhecidas dos campos de primeiro nível da conta.
 * Se a API não mandar o campo, tenta o título e, para skins, a lista dos detalhes.
 */
export function getAccountStats(acc: Account, skins?: Skin[], game?: GameSlug): Stat[] {
  const found = new Map<StatKind, Stat>();

  for (const [rawKey, v] of Object.entries(acc)) {
    if (rawKey === 'price' || rawKey === 'id' || isInternalKey(rawKey)) continue;
    const k = norm(rawKey);
    for (const rule of RULES) {
      if (found.has(rule.kind) || !rule.test.test(k)) continue;

      let value: string | null = null;
      let raw: number | null = null;
      let fromList = false;
      if (rule.text) {
        if (typeof v === 'string' && v.trim()) value = v.trim();
        else if (typeof v === 'number' && Number.isFinite(v)) {
          value = String(v);
          raw = v;
        }
      } else if (Array.isArray(v)) {
        if (v.length > 0) {
          raw = v.length;
          value = fmt(raw);
          fromList = true;
        }
      } else {
        const n = numeric(v);
        if (n !== null && n >= 0) {
          raw = n;
          value = fmt(n);
        }
      }

      if (value !== null) {
        found.set(rule.kind, { kind: rule.kind, key: rawKey, label: rule.label, value, raw, fromList });
        break;
      }
    }
  }

  // Fallback 1: números escritos no título
  const fromTitle = parseTitleMetrics(accountTitle(acc));
  for (const rule of RULES) {
    const n = fromTitle[rule.kind];
    if (n === undefined) continue;
    const cur = found.get(rule.kind);
    // Se o número atual vem do tamanho de uma lista e o título informa um total maior, vale o título.
    if (!cur || (cur.fromList && (cur.raw ?? 0) < n)) {
      found.set(rule.kind, { kind: rule.kind, key: '', label: rule.label, value: fmt(n), raw: n });
    }
  }

  // Fallback 2: contagem pela lista de skins dos detalhes
  if (!found.has('skins') && skins && skins.length > 0) {
    found.set('skins', { kind: 'skins', key: '', label: 'Skins', value: fmt(skins.length), raw: skins.length });
  }

  const lvl = found.get('level');
  if (lvl && lvl.raw !== null) lvl.value = String(lvl.raw);

  const currencyLabel = game ? CURRENCY_LABEL[game] : undefined;
  if (currencyLabel && found.has('currency')) found.get('currency')!.label = currencyLabel;

  const order: StatKind[] = ['rank', 'skins', 'knives', 'pickaxes', 'emotes', 'agents', 'champions', 'level', 'radianite', 'currency', 'region'];
  return order.map((k) => found.get(k)).filter((s): s is Stat => Boolean(s));
}

/** Quais métricas aparecem (e em que ordem) no card de cada jogo. */
const CARD_STATS: Partial<Record<GameSlug, StatKind[]>> = {
  valorant: ['skins', 'agents', 'level'],
  fortnite: ['skins', 'pickaxes', 'emotes', 'currency', 'level'],
};

export function cardStats(stats: Stat[], game: GameSlug): Stat[] {
  const wanted = CARD_STATS[game];
  const picked = wanted
    ? wanted.map((k) => stats.find((s) => s.kind === k)).filter((s): s is Stat => Boolean(s)).slice(0, 4)
    : stats.slice(0, 4);
  // Nos cards o nível aparece como "Level" (a página de detalhes mantém "Nível").
  return picked.map((s) => (s.kind === 'level' ? { ...s, label: 'Level' } : s));
}

/* ------------------------------------------------------------------ */
/* Números usados pelos filtros de inventário (Valorant)              */
/* ------------------------------------------------------------------ */

const VP_SPENT = /((vp|valorantpoints|points).*(spent|gasto|gastos))|((spent|gasto|gastos).*(vp|valorantpoints|points))|^totalspent$/;

export type MetricKind = 'skins' | 'knives' | 'vpSpent';

export function metricNumber(acc: Account, kind: MetricKind): number | null {
  if (kind === 'vpSpent') {
    for (const [k, v] of Object.entries(acc)) {
      if (isInternalKey(k)) continue;
      if (VP_SPENT.test(norm(k))) {
        const n = numeric(v);
        if (n !== null) return n;
      }
    }
    return null;
  }
  const stat = getAccountStats(acc).find((s) => s.kind === kind);
  return stat?.raw ?? null;
}

/** Texto pesquisável da conta (título e nomes), sem links nem campos internos. */
export function searchableText(acc: Account): string {
  const parts: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 3 || v === null || v === undefined) return;
    if (typeof v === 'string') {
      if (!/^https?:|^data:/i.test(v)) parts.push(v);
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, depth + 1));
    } else if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        if (!isInternalKey(k)) walk(x, depth + 1);
      }
    }
  };
  walk(acc, 0);
  return parts.join(' ').toLowerCase();
}

/** Sinais de que a conta não está mais à venda. */
export function looksUnavailable(acc: Record<string, unknown>): boolean {
  const flags = ['sold', 'isSold', 'is_sold'];
  if (flags.some((f) => acc[f] === true)) return true;
  if (acc.available === false || acc.isAvailable === false) return true;
  const status = [acc.status, acc.item_state, acc.itemState, acc.state].find((s) => typeof s === 'string') as
    | string
    | undefined;
  return Boolean(status && /^(sold|closed|deleted|unavailable|vendid[ao]|indispon)/i.test(status));
}

/* ------------------------------------------------------------------ */
/* Fotos de pré-visualização dos cards (grade de skins)               */
/* ------------------------------------------------------------------ */

const PREVIEW_KEYS = ['skins', 'items', 'previewItems', 'preview_items', 'skinImages', 'skin_images', 'cosmetics', 'images', 'thumbnails'];
const IMAGE_FIELDS = ['image', 'imageUrl', 'image_url', 'icon', 'iconUrl', 'icon_url', 'thumbnail', 'displayIcon', 'img', 'url'];

function imageOf(v: unknown): string | null {
  if (typeof v === 'string') return /^(https?:)?\/\//i.test(v) || v.startsWith('data:image') ? v : null;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const f of IMAGE_FIELDS) {
      const x = o[f];
      if (typeof x === 'string' && /^(https?:)?\/\//i.test(x)) return x;
    }
  }
  return null;
}

export function getPreviewImages(acc: Account, max = 8): { urls: string[]; total: number } {
  for (const key of PREVIEW_KEYS) {
    const list = acc[key];
    if (!Array.isArray(list) || list.length === 0) continue;
    const urls: string[] = [];
    for (const item of list) {
      const u = imageOf(item);
      if (u && !urls.includes(u)) urls.push(u);
      if (urls.length >= max) break;
    }
    if (urls.length >= 2) {
      const declared = metricNumber(acc, 'skins');
      return { urls, total: Math.max(declared ?? 0, list.length) };
    }
  }
  return { urls: [], total: 0 };
}

/* ------------------------------------------------------------------ */
/* Inventário                                                         */
/* ------------------------------------------------------------------ */

export interface InventoryItem {
  name: string;
  image: string | null;
  category: string | null;
  rarity: string | null;
  color: string;
  extra: string | null;
  isKnife: boolean;
  /** Linha de destaque colorida (raridade ou "Faca"). */
  badge: string | null;
}

function pickStr(s: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = s[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

const RARITY_COLORS: [RegExp, string][] = [
  [/(ultra|mythic|m[ií]tic|transcend)/i, '#FACC15'],
  [/(exclusive|exclusiv|legend|lend[aá]r)/i, '#F59E0B'],
  [/(premium|epic|[ée]pic)/i, '#D946EF'],
  [/(rare|raro|rara)/i, '#3B82F6'],
  [/(deluxe|uncommon|incomum)/i, '#14B8A6'],
  [/(select|common|comum)/i, '#60A5FA'],
];

const KNIFE_COLOR = '#EF4444';

export function rarityColor(rarity: string | null, explicit?: string | null): string {
  if (explicit && /^#?[0-9a-f]{6}$/i.test(explicit)) return explicit.startsWith('#') ? explicit : `#${explicit}`;
  if (rarity) for (const [re, c] of RARITY_COLORS) if (re.test(rarity)) return c;
  return '#52525B';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function toInventoryItem(s: Skin): InventoryItem {
  if (typeof s === 'string') {
    return { name: s, image: null, category: null, rarity: null, color: rarityColor(null), extra: null, isKnife: false, badge: null };
  }
  const rarityRaw = pickStr(s, ['rarity', 'rarityName', 'rarity_name', 'tier', 'tierName', 'quality']);
  const categoryRaw = pickStr(s, ['category', 'categoryName', 'category_name', 'type', 'kind', 'group', 'itemType', 'item_type', 'slot']);
  const category = categoryRaw ? capitalize(categoryRaw.replace(/[_-]+/g, ' ')) : null;
  const rarity = rarityRaw && !/^[0-9a-f-]{20,}$/i.test(rarityRaw) ? capitalize(rarityRaw) : null;
  const name = pickStr(s, ['name', 'title', 'displayName', 'display_name']) ?? 'Item';
  const extra = pickStr(s, ['weapon', 'champion', 'agent']);
  const isKnife = /(faca|knife|melee)/i.test(`${categoryRaw ?? ''} ${extra ?? ''}`);
  const explicit = pickStr(s, ['rarityColor', 'rarity_color', 'color']);

  return {
    name,
    image: pickStr(s, ['image', 'imageUrl', 'image_url', 'icon', 'iconUrl', 'icon_url', 'thumbnail', 'displayIcon']),
    category,
    rarity,
    color: isKnife && !explicit ? KNIFE_COLOR : rarityColor(rarity, explicit),
    extra,
    isKnife,
    badge: isKnife ? 'Faca' : rarity ?? category,
  };
}

export interface InventoryTab {
  key: string;
  label: string;
  items: InventoryItem[];
}

/** Agrupa o inventário em abas. Valorant: skins de armas, agentes e chaveiros. */
export function buildInventoryTabs(items: InventoryItem[], game: GameSlug): InventoryTab[] {
  if (game === 'valorant') {
    const tabs: InventoryTab[] = [
      { key: 'weapons', label: 'Skins de armas', items: [] },
      { key: 'agents', label: 'Agentes', items: [] },
      { key: 'keychains', label: 'Chaveiros', items: [] },
    ];
    for (const it of items) {
      const hay = `${it.category ?? ''} ${it.extra ?? ''}`;
      if (/(agent|agente)/i.test(hay)) tabs[1].items.push(it);
      else if (/(keychain|chaveiro|charm|pingente)/i.test(hay)) tabs[2].items.push(it);
      else tabs[0].items.push(it);
    }
    return tabs.filter((t) => t.items.length > 0);
  }

  const groups = new Map<string, InventoryItem[]>();
  for (const it of items) {
    const label = it.category ?? 'Itens';
    groups.set(label, [...(groups.get(label) ?? []), it]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([label, list]) => ({ key: label, label, items: list }));
}

/* ------------------------------------------------------------------ */
/* Imagem-resumo da conta                                             */
/* ------------------------------------------------------------------ */

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
}

export interface SummaryData {
  id: string;
  title: string;
  game: string;
  accent: string;
  price: string;
  stats: Pick<Stat, 'label' | 'value'>[];
}

/** Gera um PNG com o resumo real da conta (usado quando não há imagem baixável). */
function summaryPng(d: SummaryData): string {
  const W = 1080;
  const H = 1080;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0E1017');
  bg.addColorStop(1, '#07080C');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, 700);
  glow.addColorStop(0, `${d.accent}55`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#A78BFA';
  ctx.font = '700 34px "Chakra Petch", sans-serif';
  ctx.fillText('KAUAN STORE', 80, 120);

  ctx.fillStyle = d.accent;
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(d.game.toUpperCase(), 80, 220);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
  const lines = wrap(ctx, d.title, W - 160, 3);
  lines.forEach((l, i) => ctx.fillText(l, 80, 310 + i * 78));

  let y = 310 + lines.length * 78 + 50;
  ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
  for (const s of d.stats.slice(0, 6)) {
    ctx.fillStyle = '#71717A';
    ctx.fillText(s.label, 80, y);
    ctx.fillStyle = '#F4F4F5';
    const w = ctx.measureText(s.value).width;
    ctx.fillText(s.value, W - 80 - w, y);
    y += 62;
  }

  ctx.fillStyle = '#10B981';
  ctx.font = '800 80px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(d.price, 80, H - 110);
  ctx.fillStyle = '#71717A';
  ctx.font = '500 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Pague com PIX · Conta #${d.id}`, 80, H - 60);

  return c.toDataURL('image/png');
}

/** Baixa a imagem real da conta; se não houver (ou o servidor bloquear), baixa um resumo em PNG. */
export async function downloadAccountImage(image: string | null, summary: SummaryData): Promise<void> {
  const base = `kauan-store-conta-${summary.id}`;
  if (image) {
    try {
      const res = await fetch(image, { mode: 'cors' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*/, '');
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${base}.${ext}`);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    } catch {
      /* cai para o resumo */
    }
  }
  try {
    await document.fonts?.load('700 34px "Chakra Petch"');
  } catch {
    /* ignora */
  }
  triggerDownload(summaryPng(summary), `${base}.png`);
}

/** Cards de resumo da página de detalhes (sem Região, que fica em "Informações da conta"). */
const SUMMARY_ORDER: Partial<Record<GameSlug, StatKind[]>> = {
  valorant: ['agents', 'level', 'radianite', 'rank', 'skins', 'knives', 'currency'],
  fortnite: ['skins', 'pickaxes', 'emotes', 'level', 'currency'],
};

export function summaryStats(stats: Stat[], game: GameSlug): Stat[] {
  const wanted = SUMMARY_ORDER[game];
  const base = stats.filter((s) => s.kind !== 'region');
  if (!wanted) return base;
  const first = wanted.map((k) => base.find((s) => s.kind === k)).filter((s): s is Stat => Boolean(s));
  const rest = base.filter((s) => !wanted.includes(s.kind));
  return [...first, ...rest];
}

/** Identificador estável da conta (o mesmo usado nos detalhes, no checkout e nos favoritos). */
export function accountKey(acc: Account): string {
  const r = acc as Record<string, unknown>;
  return String(r.item_id ?? r.itemId ?? acc.id);
}
