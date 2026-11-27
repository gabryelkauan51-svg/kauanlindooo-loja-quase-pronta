import { useAuth } from '../auth/AuthContext';
import { orderTotals } from '../lib/orders';
import { formatBRL } from '../lib/format';
import OrdersTab from './account/OrdersTab';
import WalletTab from './account/WalletTab';
import WalletCard from './account/WalletCard';
import FavoritesTab from './account/FavoritesTab';
import CouponsTab from './account/CouponsTab';
import ProfileTab from './account/ProfileTab';
import type { AccountTab } from './AccountMenu';
import type { DbFavorite, DbOrder } from '../types';

interface Props {
  tab: AccountTab;
  onTab: (t: AccountTab) => void;
  orders: DbOrder[];
  favorites: DbFavorite[];
  loading: boolean;
  refreshKey: number;
  onRefresh: () => void;
  onOpenPix: (o: DbOrder) => void;
  onOpenFavorite: (f: DbFavorite) => void;
  onRemoveFavorite: (f: DbFavorite) => void;
}

const TABS: { id: AccountTab; label: string }[] = [
  { id: 'orders', label: 'Compras' },
  { id: 'wallet', label: 'Carteira' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'coupons', label: 'Cupons' },
  { id: 'profile', label: 'Perfil' },
];

export default function MyAccountPage(p: Props) {
  const { profile, user } = useAuth();
  const name = (profile?.display_name || user?.email?.split('@')[0] || '').split(' ')[0];
  const totals = orderTotals(p.orders);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Olá, {name}</h1>
          <p className="mt-1 text-sm text-zinc-400">Aqui você acompanha suas compras, o saldo e seus favoritos.</p>
        </div>
        <button
          type="button"
          onClick={p.onRefresh}
          disabled={p.loading}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
        >
          {p.loading ? 'Atualizando…' : 'Atualizar dados'}
        </button>
      </div>

      <div role="tablist" aria-label="Minha conta" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const on = p.tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => p.onTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${on ? 'border-brand text-white' : 'border-transparent text-zinc-500 hover:text-zinc-200'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {p.tab === 'orders' && (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <WalletCard profile={profile} />
              <ul className="grid grid-cols-3 gap-3 lg:grid-cols-1" aria-label="Resumo">
                {[
                  ['Compras', String(totals.count)],
                  ['Entregues', String(totals.delivered)],
                  ['Total investido', formatBRL(totals.invested)],
                ].map(([k, v]) => (
                  <li key={k} className="rounded-xl border border-line bg-card px-4 py-3">
                    <p className="text-xs text-zinc-500">{k}</p>
                    <p className="truncate text-lg font-extrabold">{v}</p>
                  </li>
                ))}
              </ul>
            </div>
            <section aria-labelledby="pedidos-title">
              <h2 id="pedidos-title" className="mb-3 text-lg font-bold">Pedidos</h2>
              <OrdersTab orders={p.orders} loading={p.loading} onOpenPix={p.onOpenPix} />
            </section>
          </div>
        )}
        {p.tab === 'wallet' && <WalletTab profile={profile} refreshKey={p.refreshKey} />}
        {p.tab === 'favorites' && <FavoritesTab favorites={p.favorites} loading={p.loading} onOpen={p.onOpenFavorite} onRemove={p.onRemoveFavorite} />}
        {p.tab === 'coupons' && <CouponsTab />}
        {p.tab === 'profile' && <ProfileTab />}
        {p.tab === 'followers' && (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <h2 className="text-base font-bold">Pedidos de seguidores</h2>
            <p className="mt-2 text-sm text-zinc-400">Você ainda não tem pedidos de seguidores.</p>
          </div>
        )}
      </div>
    </div>
  );
}
