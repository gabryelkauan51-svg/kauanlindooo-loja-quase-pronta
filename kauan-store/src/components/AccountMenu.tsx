import { useEffect, useRef, useState, type ReactNode } from 'react';
import { providerLabel, useAuth } from '../auth/AuthContext';
import { formatBRL } from '../lib/format';

export type AccountTab = 'orders' | 'wallet' | 'favorites' | 'coupons' | 'profile' | 'followers';

export const DISCORD_SUPPORT = 'https://discord.gg/DHF79qZXCG';

interface Props {
  onOpen: (tab: AccountTab) => void;
}

const ic = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const ICONS: Record<string, ReactNode> = {
  orders: <svg {...ic}><path d="M6 7h12l-1 12H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>,
  wallet: <svg {...ic}><rect x="3" y="6" width="18" height="13" rx="2.500" /><path d="M16 12.500h2M3 10h18" /></svg>,
  followers: <svg {...ic}><circle cx="9" cy="8" r="3" /><path d="M3 19c0-3 2.700-5 6-5s6 2 6 5M17 6a3 3 0 0 1 0 6M21 19c0-2-1.200-3.500-3-4.200" /></svg>,
  favorites: <svg {...ic}><path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" /></svg>,
  coupons: <svg {...ic}><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" /><path d="M10 9l4 6" /></svg>,
  profile: <svg {...ic}><circle cx="12" cy="8" r="3.500" /><path d="M5 20c0-3.500 3-6 7-6s7 2.500 7 6" /></svg>,
  support: <svg {...ic}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.500" /><rect x="17" y="13" width="4" height="6" rx="1.500" /></svg>,
  out: <svg {...ic}><path d="M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9" /></svg>,
};

export default function AccountMenu({ onOpen }: Props) {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const name = profile?.display_name || user.email?.split('@')[0] || 'Minha conta';
  const email = profile?.email || user.email || '';
  const avatar = profile?.avatar_url;
  const provider = providerLabel(profile?.provider ?? (user.app_metadata?.provider as string | undefined));

  const go = (tab: AccountTab) => {
    setOpen(false);
    onOpen(tab);
  };

  const item =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-bg hover:text-white';

  const Avatar = ({ size }: { size: string }) =>
    avatar ? (
      <img src={avatar} alt="" referrerPolicy="no-referrer" className={`${size} shrink-0 rounded-full object-cover`} />
    ) : (
      <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand-light`}>
        {name.charAt(0).toUpperCase()}
      </span>
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-xl border border-line bg-card py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white transition hover:border-zinc-500"
      >
        <Avatar size="h-8 w-8" />
        <span className="hidden max-w-[9rem] truncate sm:block">{name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round" className={`text-zinc-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar size="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="truncate text-xs text-zinc-400">{email}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Conectado com {provider}</p>
            </div>
          </div>

          <button type="button" onClick={() => go('wallet')} className="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left transition hover:bg-bg">
            <span className="text-xs text-zinc-400">Saldo da carteira</span>
            <span className="text-sm font-bold text-white">{formatBRL(profile?.wallet_balance ?? 0)}</span>
          </button>

          <div className="p-1.5">
            <button type="button" role="menuitem" className={item} onClick={() => go('orders')}>{ICONS.orders}Minhas compras</button>
            <button type="button" role="menuitem" className={item} onClick={() => go('wallet')}>{ICONS.wallet}Carteira</button>
            <button type="button" role="menuitem" className={item} onClick={() => go('followers')}>{ICONS.followers}Meus pedidos de seguidores</button>
            <button type="button" role="menuitem" className={item} onClick={() => go('favorites')}>{ICONS.favorites}Favoritos</button>
            <button type="button" role="menuitem" className={item} onClick={() => go('coupons')}>{ICONS.coupons}Cupons</button>
            <button type="button" role="menuitem" className={item} onClick={() => go('profile')}>{ICONS.profile}Editar perfil</button>
            <a role="menuitem" href={DISCORD_SUPPORT} target="_blank" rel="noopener noreferrer" className={item} onClick={() => setOpen(false)}>
              {ICONS.support}Suporte no Discord
            </a>
          </div>
          <div className="border-t border-line p-1.5">
            <button
              type="button"
              role="menuitem"
              className={`${item} text-zinc-400`}
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
            >
              {ICONS.out}Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
