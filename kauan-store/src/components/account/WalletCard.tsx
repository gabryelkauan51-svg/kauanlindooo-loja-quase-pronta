import { useState } from 'react';
import DepositModal, { MIN_DEPOSIT } from './DepositModal';
import { formatBRL } from '../../lib/format';
import type { DbProfile } from '../../types';

export default function WalletCard({ profile }: { profile: DbProfile | null }) {
  const [deposit, setDeposit] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5">
        <div>
          <p className="text-sm text-zinc-400">Saldo na carteira</p>
          <p className="mt-1 text-3xl font-extrabold sm:text-4xl">{formatBRL(profile?.wallet_balance ?? 0)}</p>
          <p className="mt-1 text-xs text-zinc-500">Depósito mínimo de R$ {MIN_DEPOSIT},00 via PIX.</p>
        </div>
        <button type="button" onClick={() => setDeposit(true)} className="rounded-xl bg-pix px-5 py-3 text-sm font-bold text-white transition hover:bg-pix-dark">
          + Adicionar saldo
        </button>
      </div>
      {deposit && <DepositModal onClose={() => setDeposit(false)} />}
    </>
  );
}
