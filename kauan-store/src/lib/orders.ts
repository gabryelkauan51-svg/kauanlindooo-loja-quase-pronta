import type { DbOrder } from '../types';

export type DisplayStatus = 'pending' | 'paid' | 'delivered' | 'expired';

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  pending: 'Aguardando pagamento',
  paid: 'Pago, entregando',
  delivered: 'Entregue',
  expired: 'Expirado ou cancelado',
};

export function displayStatus(o: Pick<DbOrder, 'status' | 'checkout'>, now = Date.now()): DisplayStatus {
  if (o.status === 'delivered') return 'delivered';
  if (o.status === 'paid') return 'paid';
  if (o.status === 'failed') return 'expired';
  const exp = o.checkout?.expiresAt ? Date.parse(o.checkout.expiresAt) : NaN;
  if (Number.isFinite(exp) && exp < now) return 'expired';
  return 'pending';
}

/** Resumo para os cards da área de compras. */
export function orderTotals(orders: DbOrder[]) {
  const paid = orders.filter((o) => o.status === 'paid' || o.status === 'delivered');
  return {
    count: orders.length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    invested: paid.reduce((sum, o) => sum + (o.final_price ?? 0), 0),
  };
}
