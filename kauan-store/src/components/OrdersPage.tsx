import { displayStatus, STATUS_LABEL, type DisplayStatus } from '../lib/orders';
import { checkoutPrice, formatBRL } from '../lib/format';
import { gameInfo } from '../lib/games';
import type { StoredOrder } from '../types';

interface Props {
  orders: StoredOrder[];
  onOpen: (o: StoredOrder) => void;
  onRemove: (o: StoredOrder) => void;
  onShop: () => void;
}

const BADGE: Record<DisplayStatus, string> = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  paid: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  delivered: 'border-pix/50 bg-pix/10 text-pix',
  expired: 'border-zinc-600 bg-zinc-800/60 text-zinc-400',
};

export default function OrdersPage({ orders, onOpen, onRemove, onShop }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <h1 className="text-3xl font-bold uppercase tracking-tight">
        Minhas <span className="text-red-500">compras</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Pedidos feitos neste navegador. Para reabrir o PIX ou ver a entrega, use o botão do pedido.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-10 text-center">
          <p className="text-zinc-300">Você ainda não fez nenhum pedido neste navegador.</p>
          <button
            type="button"
            onClick={onShop}
            className="mt-5 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-light"
          >
            Ver contas
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => {
            const status = displayStatus(o);
            const info = gameInfo(o.game);
            const price = o.finalPrice ?? checkoutPrice(o.checkout);
            return (
              <li key={o.externalRef} className="rounded-2xl border border-line bg-card p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: info.accent }}>
                      {info.label}
                    </p>
                    <h2 className="mt-0.5 truncate text-base font-bold" title={o.title}>
                      {o.title}
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(o.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                    <p className="text-xl font-extrabold">{formatBRL(price)}</p>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${BADGE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => onOpen(o)}
                      className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark"
                    >
                      Abrir PIX
                    </button>
                  )}
                  {(status === 'paid' || status === 'delivered') && (
                    <button
                      type="button"
                      onClick={() => onOpen(o)}
                      className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark"
                    >
                      {status === 'delivered' ? 'Ver dados da conta' : 'Acompanhar entrega'}
                    </button>
                  )}
                  {status !== 'paid' && status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => onRemove(o)}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-red-500/60 hover:text-white"
                    >
                      Remover da lista
                    </button>
                  )}
                  {status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => onRemove(o)}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-red-500/60 hover:text-white"
                    >
                      Descartar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
