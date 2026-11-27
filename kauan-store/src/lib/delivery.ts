import { humanize } from './format';

export interface DeliveryData {
  login: string | null;
  password: string | null;
  email: string | null;
  emailPassword: string | null;
  /** Demais campos entregues (informações adicionais). */
  extra: [string, string][];
  /** Todos os campos, para o painel completo. */
  all: [string, string][];
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const KEYS = {
  login: ['login', 'username', 'user', 'usuario', 'accountlogin', 'accountuser', 'nickname', 'riotid', 'account'],
  password: ['password', 'senha', 'pass', 'accountpassword', 'accountpass', 'senhaconta'],
  email: ['email', 'mail', 'emailaddress', 'emaillogin', 'emailacesso'],
  emailPassword: ['emailpassword', 'emailpass', 'mailpassword', 'senhaemail', 'emailsenha', 'mailpass', 'passwordemail'],
};

/** Organiza o que a Legas Forn entregou (texto ou objeto) em campos claros. */
export function normalizeDelivery(raw: unknown): DeliveryData {
  const flat: [string, string][] = [];

  if (typeof raw === 'string') {
    // Texto livre: tenta "login:senha" e "chave: valor" por linha.
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const m = l.match(/^([^:=]{2,40})\s*[:=]\s*(.+)$/);
      if (m) flat.push([m[1].trim(), m[2].trim()]);
    }
    if (flat.length === 0 && raw.includes(':') && !raw.includes(' ')) {
      const [a, b] = raw.split(':');
      flat.push(['login', a], ['senha', b ?? '']);
    }
    if (flat.length === 0) flat.push(['Dados da conta', raw]);
  } else if (raw && typeof raw === 'object') {
    const walk = (o: Record<string, unknown>, prefix = '') => {
      for (const [k, v] of Object.entries(o)) {
        if (v === null || v === undefined || v === '') continue;
        const label = prefix ? `${prefix} · ${humanize(k)}` : k;
        if (typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>, humanize(k));
        else flat.push([label, Array.isArray(v) ? v.join(', ') : String(v)]);
      }
    };
    walk(raw as Record<string, unknown>);
  }

  const used = new Set<number>();
  const take = (names: string[]) => {
    for (let i = 0; i < flat.length; i++) {
      if (used.has(i)) continue;
      const key = norm(flat[i][0].split('·').pop() ?? flat[i][0]);
      const full = norm(flat[i][0]);
      if (names.includes(key) || names.includes(full)) {
        used.add(i);
        return flat[i][1];
      }
    }
    return null;
  };

  // A senha do e-mail precisa ser lida antes da senha da conta (nomes parecidos).
  const emailPassword = take(KEYS.emailPassword);
  const email = take(KEYS.email);
  const login = take(KEYS.login);
  const password = take(KEYS.password);

  const extra = flat.filter((_, i) => !used.has(i)).map(([k, v]) => [humanize(k), v] as [string, string]);
  return { login, password, email, emailPassword, extra, all: flat.map(([k, v]) => [humanize(k), v] as [string, string]) };
}

export function deliveryAsText(d: DeliveryData): string {
  const rows: [string, string | null][] = [
    ['Login da conta', d.login],
    ['Senha da conta', d.password],
    ['E-mail', d.email],
    ['Senha do e-mail', d.emailPassword],
    ...d.extra,
  ];
  return rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
}
