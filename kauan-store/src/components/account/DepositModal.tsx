import { useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../Modal';
import { ApiError, createDeposit } from '../../lib/api';
import { copyText } from '../../lib/format';

export const MIN_DEPOSIT = 5;

export default function DepositModal({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ copyPaste?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const amount = Number(value.replace(',', '.'));
  const valid = Number.isFinite(amount) && amount >= MIN_DEPOSIT;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError(`O valor mínimo é R$ ${MIN_DEPOSIT},00.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setPix(await createDeposit(Math.round(amount * 100) / 100));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível gerar o depósito agora.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} label="Adicionar saldo">
      <div className="space-y-4 p-6">
        <div className="pr-10">
          <h2 className="text-xl font-bold">Adicionar saldo</h2>
          <p className="mt-1 text-sm text-zinc-400">Depósito por PIX, a partir de R$ {MIN_DEPOSIT},00.</p>
        </div>

        {pix?.copyPaste ? (
          <div className="space-y-3">
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG value={pix.copyPaste} size={200} />
            </div>
            <p className="max-h-20 overflow-y-auto break-all rounded-lg border border-line bg-bg p-3 font-mono text-xs text-zinc-400">{pix.copyPaste}</p>
            <button
              type="button"
              onClick={async () => {
                if (await copyText(pix.copyPaste!)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }
              }}
              className="w-full rounded-xl bg-pix px-5 py-3 text-sm font-bold text-white transition hover:bg-pix-dark"
            >
              {copied ? 'Código copiado' : 'Copiar código PIX'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="dep" className="block text-xs font-semibold text-zinc-400">Valor (R$)</label>
            <input
              id="dep"
              inputMode="decimal"
              placeholder="Ex: 20,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand focus:outline-none"
            />
            {error && <p role="alert" className="rounded-lg border border-line bg-bg p-3 text-sm text-zinc-300">{error}</p>}
            <button type="submit" disabled={busy || !valid} className="w-full rounded-xl bg-pix px-5 py-3 text-sm font-bold text-white transition hover:bg-pix-dark disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">
              {busy ? 'Gerando…' : 'Gerar PIX'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
