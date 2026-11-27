import { getAccountStats, isInternalKey } from './account';
import type { Account, RegionKey, TierKey, ValorantFilters } from '../types';

/* ------------------------------------------------------------------ */
/* Opções exibidas nos filtros                                        */
/* ------------------------------------------------------------------ */

export const TIERS: { key: TierKey; label: string; color: string; re: RegExp }[] = [
  { key: 'iron', label: 'Ferro', color: '#7C838D', re: /(ferro|iron)/ },
  { key: 'bronze', label: 'Bronze', color: '#A0723F', re: /bronze/ },
  { key: 'silver', label: 'Prata', color: '#A8AFBA', re: /(prata|silver)/ },
  { key: 'gold', label: 'Ouro', color: '#C9A64B', re: /(ouro|gold)/ },
  { key: 'platinum', label: 'Platina', color: '#5FB6C4', re: /(platina|platinum)/ },
  { key: 'diamond', label: 'Diamante', color: '#9D8CE6', re: /(diamante|diamond)/ },
  { key: 'ascendant', label: 'Ascendente', color: '#4FB58A', re: /(ascendente|ascendant)/ },
  { key: 'immortal', label: 'Imortal', color: '#C95A66', re: /(imortal|immortal)/ },
  { key: 'radiant', label: 'Radiante', color: '#E3CF8A', re: /(radiante|radiant)/ },
];

export const REGIONS: { key: RegionKey; label: string }[] = [
  { key: 'br', label: 'Brasil' },
  { key: 'eu', label: 'Europa' },
  { key: 'na', label: 'América do Norte' },
  { key: 'ap', label: 'Ásia-Pacífico' },
  { key: 'latam', label: 'América Latina' },
];

export const INACTIVE_OPTIONS: { value: ValorantFilters['inactive']; label: string }[] = [
  { value: '', label: 'Qualquer' },
  { value: '30', label: '+30 dias' },
  { value: '90', label: '+90 dias' },
  { value: '180', label: '+6 meses' },
  { value: '365', label: '+1 ano' },
];

export function isValorantFilterActive(f: ValorantFilters): boolean {
  return f.tier !== 'all' || f.region !== 'all' || f.minLevel.trim() !== '' || f.phone !== 'all' || f.email !== 'all' || f.inactive !== '';
}

/* ------------------------------------------------------------------ */
/* Leitura segura dos dados da conta (nunca expõe valores sensíveis)  */
/* ------------------------------------------------------------------ */

export const flat = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const keyOf = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findValue(acc: Account, re: RegExp, skip?: RegExp): unknown {
  for (const [k, v] of Object.entries(acc)) {
    if (isInternalKey(k)) continue;
    const nk = keyOf(k);
    if (re.test(nk) && !(skip && skip.test(nk))) {
      if (v !== null && v !== undefined && v !== '') return v;
    }
  }
  return null;
}

export function toBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string') {
    const t = flat(v).trim();
    if (!t) return null;
    if (/^(0|false|no|nao|sem|none|unlinked|desvinculado|desativad|disabled|off)/.test(t)) return false;
    if (/^(1|true|yes|sim|com|linked|vinculado|ativad|enabled|on|incluso|included)/.test(t)) return true;
    return true; // texto livre (ex.: número mascarado) conta como "tem"
  }
  return null;
}

export function tierOf(acc: Account): TierKey | null {
  const rank = getAccountStats(acc).find((s) => s.kind === 'rank');
  if (!rank) return null;
  const t = flat(rank.value);
  return TIERS.find((x) => x.re.test(t))?.key ?? null;
}

export function regionOf(acc: Account): { key: RegionKey | null; label: string | null } {
  const raw = findValue(acc, /(region|regiao|server|shard|country|pais)/);
  if (typeof raw !== 'string') return { key: null, label: null };
  const t = flat(raw).trim();
  let key: RegionKey | null = null;
  if (/^(br|bra|brasil|brazil)/.test(t)) key = 'br';
  else if (/^(eu|europ)/.test(t)) key = 'eu';
  else if (/^(na|us|usa|north|norte|estados|america do norte)/.test(t)) key = 'na';
  else if (/(^ap$|apac|asia|pacific|^kr$|^jp$)/.test(t)) key = 'ap';
  else if (/(latam|latin|^lan$|^las$|^la$|america latina)/.test(t)) key = 'latam';
  const label = key ? REGIONS.find((r) => r.key === key)!.label : raw.trim();
  return { key, label };
}

export function levelOf(acc: Account): number | null {
  return getAccountStats(acc).find((s) => s.kind === 'level')?.raw ?? null;
}

export function phoneOf(acc: Account): boolean | null {
  return toBool(findValue(acc, /(phone|telefone|celular|mobile)/));
}

export function twoFactorOf(acc: Account): boolean | null {
  return toBool(findValue(acc, /(2fa|twofactor|twostep|mfa|autentic|authenticator)/));
}

export type EmailKind = 'og' | 'included' | 'none';

/** Só o tipo/status do e-mail. O endereço nunca é lido nem exibido. */
export function emailOf(acc: Account): EmailKind | null {
  const typed = findValue(acc, /(emailtype|tipoemail|emailkind|mailtype)/);
  const any = typed ?? findValue(acc, /(email|mail)/);
  if (any === null) return null;
  if (typeof any === 'boolean') return any ? 'included' : 'none';
  if (typeof any === 'number') return any > 0 ? 'included' : 'none';
  if (typeof any !== 'string') return null;
  const t = flat(any).trim();
  if (/\b(og|original)\b/.test(t)) return 'og';
  if (/^(sem|no|none|nao|without|false|0)/.test(t)) return 'none';
  return 'included';
}

export function lastActivityOf(acc: Account): Date | null {
  const raw = findValue(acc, /(lastactiv|ultimaativ|lastlogin|lastseen|lastplayed|lastmatch|lastgame|lastaccess|lastonline)/);
  if (raw !== null) {
    let d: Date | null = null;
    if (typeof raw === 'number') d = new Date(raw < 1e12 ? raw * 1000 : raw);
    else if (typeof raw === 'string') d = new Date(/^\d+$/.test(raw) ? (Number(raw) < 1e12 ? Number(raw) * 1000 : Number(raw)) : raw);
    if (d && Number.isFinite(d.getTime())) return d;
  }
  const days = findValue(acc, /(inactivedays|diasinativ|daysinactive)/);
  if (typeof days === 'number' && days >= 0) return new Date(Date.now() - days * 86_400_000);
  return null;
}

export function inactiveDays(acc: Account): number | null {
  const d = lastActivityOf(acc);
  return d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;
}

/** "há 3 meses", "há 2 dias"... */
export function relativeTimePt(date: Date): string {
  const diff = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, secs] of steps) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return 'agora mesmo';
}

/** Desconto em %, só quando a própria conta informa um valor plausível. */
export function discountOf(acc: Account): number | null {
  const v = findValue(acc, /(discountpercent|descontopercent|discount|desconto)/);
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace('%', '').replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n) : null;
}

/* ------------------------------------------------------------------ */
/* Aplicação dos filtros (combina com preço e inventário)             */
/* ------------------------------------------------------------------ */

export function applyValorantFilters(list: Account[], f: ValorantFilters): { list: Account[]; unavailable: string[] } {
  const unavailable: string[] = [];
  const any = (fn: (a: Account) => unknown) => list.some((a) => fn(a) !== null);

  const minLevel = Number(f.minLevel);
  const useLevel = f.minLevel.trim() !== '' && Number.isFinite(minLevel) && minLevel > 0;

  const useTier = f.tier !== 'all';
  const useRegion = f.region !== 'all';
  const usePhone = f.phone !== 'all';
  const useEmail = f.email !== 'all';
  const useInactive = f.inactive !== '';

  const okTier = !useTier || any(tierOf);
  const okRegion = !useRegion || any((a) => regionOf(a).key);
  const okLevel = !useLevel || any(levelOf);
  const okPhone = !usePhone || any(phoneOf);
  const okEmail = !useEmail || any(emailOf);
  const okInactive = !useInactive || any(inactiveDays);

  if (!okTier) unavailable.push('elo');
  if (!okRegion) unavailable.push('região');
  if (!okLevel) unavailable.push('level');
  if (!okPhone) unavailable.push('telefone');
  if (!okEmail) unavailable.push('tipo de e-mail');
  if (!okInactive) unavailable.push('inatividade');

  const out = list.filter((a) => {
    if (useTier && okTier && tierOf(a) !== f.tier) return false;
    if (useRegion && okRegion && regionOf(a).key !== f.region) return false;
    if (useLevel && okLevel && (levelOf(a) ?? 0) < minLevel) return false;
    if (usePhone && okPhone) {
      const p = phoneOf(a);
      if (f.phone === 'with' && p !== true) return false;
      if (f.phone === 'without' && p !== false) return false;
    }
    if (useEmail && okEmail) {
      const e = emailOf(a);
      if (f.email === 'og' && e !== 'og') return false;
      if (f.email === 'none' && e !== 'none') return false;
    }
    if (useInactive && okInactive) {
      const d = inactiveDays(a);
      if (d === null || d < Number(f.inactive)) return false;
    }
    return true;
  });

  return { list: out, unavailable };
}
