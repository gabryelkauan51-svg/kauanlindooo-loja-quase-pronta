import BrandLogo from './BrandLogo';
import AccountMenu, { type AccountTab } from './AccountMenu';
import { useAuth } from '../auth/AuthContext';
import { formatBRL } from '../lib/format';

export type View = 'shop' | 'account';

interface Props {
  view: View;
  onShop: () => void;
  onAccount: (tab: AccountTab) => void;
  onLogin: () => void;
  pendingCount: number;
}

export default function Header({ view, onShop, onAccount, onLogin, pendingCount }: Props) {
  const { user, profile, loading } = useAuth();

  const tab = (active: boolean, label: string, onClick: () => void, badge?: number) => (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${active ? 'bg-brand/20 text-white' : 'text-zinc-400 hover:text-white'}`}
    >
      {label}
      {badge ? <span className="ml-2 rounded-full bg-pix px-1.5 py-0.5 text-[11px] font-bold text-white">{badge}</span> : null}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-4">
        <button type="button" onClick={onShop} className="flex shrink-0 items-center" aria-label="Kauan Store, início">
          <BrandLogo className="h-12" />
        </button>

        <nav aria-label="Navegação principal" className="flex items-center gap-1">
          {tab(view === 'shop', 'Loja', onShop)}
          {tab(view === 'account', 'Minhas compras', () => (user ? onAccount('orders') : onLogin()), pendingCount > 0 ? pendingCount : undefined)}
          <div className="ml-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAccount('wallet')}
                  aria-label={`Saldo da carteira: ${formatBRL(profile?.wallet_balance ?? 0)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1d4a3a] bg-[#0e2a22] px-3 py-2 text-sm font-semibold text-[#7bd3b0] transition hover:border-[#2a6a52]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="13" rx="2.5" />
                    <path d="M16 12.5h2M3 10h18" />
                  </svg>
                  {formatBRL(profile?.wallet_balance ?? 0)}
                </button>
                <AccountMenu onOpen={onAccount} />
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                disabled={loading}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg disabled:opacity-60"
              >
                Entrar
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
