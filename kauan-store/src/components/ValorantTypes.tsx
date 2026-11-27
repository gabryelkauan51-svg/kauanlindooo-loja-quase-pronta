import { useState } from 'react';
import { formatBRL } from '../lib/format';
import type { NfaTier } from '../types';

export type ValorantType = 'full' | 'nfa';

interface Props {
  type: ValorantType;
  onType: (t: ValorantType) => void;
  tier: string | null;
  onTier: (id: string | null) => void;
  tiers: NfaTier[];
}

const STEPS = [
  ['1', 'Escolha a conta', 'Use os filtros e abra a conta que mais combina com você.'],
  ['2', 'Pague com PIX', 'O pagamento é confirmado em instantes.'],
  ['3', 'Receba e jogue', 'Os dados chegam no seu pedido, na área Minhas compras.'],
] as const;

const Check = ({ children }: { children: string }) => (
  <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-zinc-300">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-pix" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
    {children}
  </li>
);

export default function ValorantTypes({ type, onType, tier, onTier, tiers }: Props) {
  const [showAll, setShowAll] = useState(false);

  const inStock = tiers.reduce((n, t) => n + Math.max(0, t.stock), 0);
  const prices = tiers.map((t) => t.price).filter((p): p is number => typeof p === 'number' && p > 0);
  const from = prices.length ? Math.min(...prices) : 1.99;
  const shown = showAll ? tiers : tiers.slice(0, 8);

  const seg = (id: ValorantType, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={type === id}
      onClick={() => {
        onType(id);
        if (id === 'full') onTier(null);
      }}
      className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${type === id ? 'bg-brand/20 text-white' : 'text-zinc-400 hover:text-white'}`}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="val-title" className="mb-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="val-title" className="font-display text-xl font-bold">Valorant</h2>
        <div role="tablist" aria-label="Tipo de conta" className="flex gap-1 rounded-xl border border-line bg-card p-1">
          {seg('full', 'Full Acesso')}
          {seg('nfa', 'Contas NFA')}
        </div>
      </div>

      {type === 'full' ? (
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Conta com acesso total: e-mail e dados completos de acesso vêm junto, para você assumir a conta.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Contas NFA</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  A partir de <strong className="text-white">{formatBRL(from)}</strong>
                  {tiers.length > 0 && <> · {inStock.toLocaleString('pt-BR')} em estoque</>}
                </p>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label="Vantagens">
                <Check>Entrega automática</Check>
                <Check>Servidor definido na conta</Check>
                <Check>Suporte no Discord</Check>
              </ul>
            </div>
            <p className="mt-4 max-w-2xl rounded-xl border border-line bg-bg p-3 text-sm leading-relaxed text-zinc-300">
              <strong className="text-white">O que é NFA?</strong> É uma conta que <strong className="text-white">não</strong> é acesso total: ela não acompanha o acesso completo ao e-mail nem a alteração total dos dados, como acontece na Full Acesso.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">Faixas de skins</h3>
              {tiers.length > 8 && (
                <button type="button" onClick={() => setShowAll(!showAll)} className="text-sm font-semibold text-brand-light hover:text-white">
                  {showAll ? 'Ver menos' : 'Ver todas as faixas'}
                </button>
              )}
            </div>
            {tiers.length === 0 ? (
              <p className="rounded-xl border border-line bg-card p-4 text-sm text-zinc-500">As faixas de NFA aparecem aqui assim que forem cadastradas.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {shown.map((t) => {
                  const soldOut = t.stock <= 0;
                  const on = tier === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={soldOut}
                        aria-pressed={on}
                        onClick={() => onTier(on ? null : t.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          soldOut ? 'cursor-not-allowed border-line bg-card/50 opacity-60' : on ? 'border-brand/70 bg-brand/10' : 'border-line bg-card hover:border-zinc-500'
                        }`}
                      >
                        <p className="text-sm font-bold">{t.label} skins</p>
                        <p className="mt-1 text-base font-extrabold">{t.price ? formatBRL(t.price) : '—'}</p>
                        <p className={`mt-0.5 text-xs ${soldOut ? 'text-zinc-500' : 'text-pix'}`}>{soldOut ? 'Esgotado' : `${t.stock} em estoque`}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card p-5">
            <h3 className="mb-3 text-sm font-bold">Como funciona a compra</h3>
            <ol className="grid gap-3 sm:grid-cols-3">
              {STEPS.map(([n, title, desc]) => (
                <li key={n} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-bg text-xs font-bold text-brand-light">{n}</span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-zinc-400">{desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
