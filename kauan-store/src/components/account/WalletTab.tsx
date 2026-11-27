import { useEffect, useState } from 'react';
import WalletCard from './WalletCard';
import { listWalletTx } from '../../lib/db';
import { formatBRL } from '../../lib/format';
import type { DbProfile, WalletTx } from '../../types';

const KIND: Record<string, string> = { deposit: 'Depósito', purchase: 'Compra', adjust: 'Ajuste' };

export default function WalletTab({ profile, refreshKey }: { profile: DbProfile | null; refreshKey: number }) {
  const [tx, setTx] = useState<WalletTx[]>([]);

  useEffect(() => {
    listWalletTx().then(setTx).catch(() => setTx([]));
  }, [refreshKey]);

  return (
    <div className="space-y-5">
      <WalletCard profile={profile} />

      <section aria-label="Movimentações">
        <h3 className="mb-2 text-sm font-bold">Movimentações</h3>
        {tx.length === 0 ? (
          <p className="rounded-xl border border-line bg-card p-5 text-sm text-zinc-500">Nenhuma movimentação ainda.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {tx.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="block font-semibold">{KIND[t.kind] ?? t.kind}</span>
                  <span className="block text-xs text-zinc-500">{new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </span>
                <span className={`font-bold ${t.amount >= 0 ? 'text-pix' : 'text-zinc-200'}`}>{formatBRL(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
