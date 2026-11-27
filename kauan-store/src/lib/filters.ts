import { findValue, flat, toBool, emailOf, inactiveDays, regionOf, tierOf } from './valorant';
import { searchableText } from './account';
import type { Account, GameSlug } from '../types';

/* ------------------------------------------------------------------ */
/* Filtros avançados por jogo (todos menos Valorant, que tem blocos próprios) */
/* ------------------------------------------------------------------ */

export type FilterKind = 'range' | 'min' | 'select' | 'tri' | 'text';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  id: string;
  label: string;
  kind: FilterKind;
  group: 'account' | 'resources';
  /** Valor lido da conta (null = a lista não traz esse dado). */
  get: (a: Account) => number | boolean | string | null;
  placeholder?: string;
  options?: FilterOption[];
  /** Rótulos do seletor Todos / Sim / Não. */
  triLabels?: [string, string];
}

const num = (re: RegExp) => (a: Account): number | null => {
  const v = findValue(a, re);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && /^-?\d+([.,]\d+)?$/.test(v.trim())) return Number(v.replace(',', '.'));
  if (Array.isArray(v)) return v.length;
  return null;
};
const bool = (re: RegExp) => (a: Account) => toBool(findValue(a, re));
const txt = (re: RegExp) => (a: Account): string | null => {
  const v = findValue(a, re);
  if (typeof v === 'string') return flat(v);
  if (Array.isArray(v)) return flat(v.map(String).join(' '));
  return null;
};

/** Idade da conta em anos (campo numérico em anos ou data de criação). */
function ageYears(a: Account): number | null {
  const n = num(/(accountage|idadeconta|ageyears|idade)/)(a);
  if (n !== null) return n;
  const d = findValue(a, /(created|registered|registro|criad)/);
  const t = typeof d === 'string' || typeof d === 'number' ? new Date(d as string).getTime() : NaN;
  return Number.isFinite(t) ? (Date.now() - t) / 31_557_600_000 : null;
}

const INACTIVE: FilterOption[] = [
  { value: '', label: 'Qualquer' },
  { value: '30', label: '+30 dias' },
  { value: '90', label: '+90 dias' },
  { value: '180', label: '+6 meses' },
  { value: '365', label: '+1 ano' },
];

const emailType: FilterDef = {
  id: 'emailType', label: 'Tipo de email', kind: 'select', group: 'account',
  options: [{ value: '', label: 'Todos' }, { value: 'og', label: 'Email OG' }, { value: 'none', label: 'Sem email' }],
  get: (a) => emailOf(a),
};

const level: FilterDef = { id: 'level', label: 'Level', kind: 'range', group: 'resources', get: num(/(level|lvl|nivel)/) };
const skins: FilterDef = { id: 'skins', label: 'Skins', kind: 'range', group: 'resources', get: num(/skin/) };
const phone: FilterDef = { id: 'phone', label: 'Telefone vinculado', kind: 'tri', group: 'account', triLabels: ['Com', 'Sem'], get: bool(/(phone|telefone|celular|mobile)/) };

const LOL_ELOS = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda', 'Diamante', 'Mestre'];
const LOL_REGIONS = ['BR', 'NA', 'EUW', 'EUNE', 'LAN', 'LAS', 'OCE', 'TR', 'RU', 'JP', 'KR'];

const STEAM: FilterDef[] = [
  { id: 'gameName', label: 'Jogo específico', kind: 'text', group: 'account', placeholder: 'Qualquer jogo', get: (a) => searchableText(a) },
  { id: 'games', label: 'Jogos mín./máx.', kind: 'range', group: 'resources', get: num(/(gamescount|totalgames|jogos|games)/) },
  { id: 'country', label: 'País', kind: 'text', group: 'account', get: txt(/(country|pais)/) },
  {
    id: 'age', label: 'Idade da conta', kind: 'select', group: 'account',
    options: [{ value: '', label: 'Qualquer' }, { value: '1', label: '+1 ano' }, { value: '3', label: '+3 anos' }, { value: '5', label: '+5 anos' }, { value: '10', label: '+10 anos' }],
    get: ageYears,
  },
  { id: 'inactive', label: 'Inatividade', kind: 'select', group: 'account', options: INACTIVE, get: (a) => inactiveDays(a) },
  { id: 'xbox', label: 'Xbox vinculado', kind: 'tri', group: 'account', triLabels: ['Sim', 'Não'], get: bool(/xbox/) },
  { id: 'psn', label: 'PSN vinculado', kind: 'tri', group: 'account', triLabels: ['Sim', 'Não'], get: bool(/(psn|playstation)/) },
  { id: 'emailSwap', label: 'Troca de email', kind: 'tri', group: 'account', triLabels: ['Pode', 'Não pode'], get: bool(/(emailchange|changeemail|trocaemail|cangemail|canchange)/) },
  emailType,
  level,
  { id: 'hours', label: 'Horas jogadas', kind: 'range', group: 'resources', get: num(/(hours|horas|playtime)/) },
  { id: 'credits', label: 'Créditos mín.', kind: 'min', group: 'resources', get: num(/(credit|credito)/) },
  { id: 'paid', label: 'Compras pagas', kind: 'tri', group: 'resources', triLabels: ['Com', 'Sem'], get: bool(/(paidpurchase|purchases|compras|paid)/) },
  { id: 'item', label: 'Item comprado', kind: 'text', group: 'resources', get: txt(/(purchaseditem|itemcomprado|items|itens|bought)/) },
];

const LOL: FilterDef[] = [
  level,
  { id: 'champions', label: 'Campeões', kind: 'range', group: 'resources', get: num(/(champion|campe)/) },
  skins,
  {
    id: 'elo', label: 'Elo', kind: 'select', group: 'account',
    options: [{ value: '', label: 'Qualquer' }, ...LOL_ELOS.map((e) => ({ value: flat(e), label: e }))],
    get: (a) => {
      const t = tierOf(a);
      const rank = findValue(a, /(rank|elo|tier)/);
      return typeof rank === 'string' ? flat(rank) : t;
    },
  },
  {
    id: 'region', label: 'Região', kind: 'select', group: 'account',
    options: [{ value: '', label: 'Qualquer' }, ...LOL_REGIONS.map((r) => ({ value: r.toLowerCase(), label: r }))],
    get: (a) => {
      const raw = findValue(a, /(region|regiao|server|shard)/);
      return typeof raw === 'string' ? flat(raw) : (regionOf(a).label ? flat(regionOf(a).label!) : null);
    },
  },
  phone,
  emailType,
  { id: 'be', label: 'Essência azul mín.', kind: 'min', group: 'resources', get: num(/(blueessence|^be$|azul)/) },
  { id: 'rp', label: 'Riot Points mín.', kind: 'min', group: 'resources', get: num(/(riotpoints|^rp$)/) },
  { id: 'mythic', label: 'Essência mítica mín.', kind: 'min', group: 'resources', get: num(/(mythic|mitica)/) },
  { id: 'orange', label: 'Essência laranja mín.', kind: 'min', group: 'resources', get: num(/(orange|laranja)/) },
];

const UBISOFT: FilterDef[] = [
  { id: 'banned', label: 'Banimento', kind: 'tri', group: 'account', triLabels: ['Sim', 'Não'], get: bool(/(banned|ban|banimento)/) },
  { id: 'rank', label: 'Rank', kind: 'text', group: 'account', get: txt(/(rank|elo)/) },
  { id: 'operators', label: 'Operadores mín.', kind: 'min', group: 'resources', get: num(/(operator|operador)/) },
  { id: 'operatorQuery', label: 'Operadores específicos', kind: 'text', group: 'resources', get: (a) => searchableText(a) },
];

const BASIC: FilterDef[] = [level, skins];

const BY_GAME: Partial<Record<GameSlug, FilterDef[]>> = {
  steam: STEAM,
  'league-of-legends': LOL,
  ubisoft: UBISOFT,
};

/** Filtros de cada jogo (Valorant usa os blocos próprios). */
export function filtersFor(game: GameSlug): FilterDef[] {
  if (game === 'valorant') return [];
  return BY_GAME[game] ?? BASIC;
}

/* ------------------------------------------------------------------ */

export type AdvValues = Record<string, string>;

export function isAdvActive(values: AdvValues): boolean {
  return Object.values(values).some((v) => v.trim() !== '' && v !== 'all');
}

/** Aplica os filtros ativos. Filtros cujo dado não vem da lista são ignorados e listados em `unavailable`. */
export function applyAdvanced(list: Account[], defs: FilterDef[], values: AdvValues): { list: Account[]; unavailable: string[] } {
  const unavailable: string[] = [];
  const active: { def: FilterDef; test: (a: Account) => boolean }[] = [];

  const n = (s?: string) => {
    const x = Number((s ?? '').replace(',', '.'));
    return (s ?? '').trim() !== '' && Number.isFinite(x) ? x : null;
  };

  for (const def of defs) {
    let test: ((a: Account) => boolean) | null = null;

    if (def.kind === 'range') {
      const min = n(values[`${def.id}:min`]);
      const max = n(values[`${def.id}:max`]);
      if (min !== null || max !== null) {
        test = (a) => {
          const v = def.get(a);
          return typeof v === 'number' && (min === null || v >= min) && (max === null || v <= max);
        };
      }
    } else if (def.kind === 'min') {
      const min = n(values[def.id]);
      if (min !== null) test = (a) => { const v = def.get(a); return typeof v === 'number' && v >= min; };
    } else if (def.kind === 'tri') {
      const v = values[def.id];
      if (v === 'yes' || v === 'no') test = (a) => def.get(a) === (v === 'yes');
    } else if (def.kind === 'select') {
      const v = values[def.id];
      if (v) {
        if (def.id === 'age') test = (a) => { const x = def.get(a); return typeof x === 'number' && x >= Number(v); };
        else if (def.id === 'inactive') test = (a) => { const x = def.get(a); return typeof x === 'number' && x >= Number(v); };
        else test = (a) => { const x = def.get(a); return typeof x === 'string' && x.includes(v); };
      }
    } else if (def.kind === 'text') {
      const q = flat(values[def.id] ?? '').trim();
      if (q) test = (a) => { const x = def.get(a); return typeof x === 'string' && flat(x).includes(q); };
    }

    if (!test) continue;
    const hasData = def.id === 'operatorQuery' || def.id === 'gameName' || list.some((a) => def.get(a) !== null);
    if (!hasData) { unavailable.push(def.label.toLowerCase()); continue; }
    active.push({ def, test });
  }

  return { list: active.length ? list.filter((a) => active.every((f) => f.test(a))) : list, unavailable };
}
