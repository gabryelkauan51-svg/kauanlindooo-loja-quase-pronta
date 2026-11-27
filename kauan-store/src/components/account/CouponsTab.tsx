import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { createCoupon, deleteCoupon, listCoupons, setCouponActive, updateProfile, validateCoupon } from '../../lib/db';
import type { DbCoupon } from '../../types';

const input = 'rounded-lg border border-line bg-bg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-brand focus:outline-none';

function OwnerCoupons() {
  const [list, setList] = useState<DbCoupon[]>([]);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('20');
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => listCoupons().then(setList).catch((e: Error) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const p = Math.round(Number(percent));
    if (!code.trim() || !Number.isFinite(p) || p < 1 || p > 99) {
      setMsg('Informe o código e um percentual entre 1 e 99.');
      return;
    }
    try {
      await createCoupon(code, p);
      setCode('');
      setMsg(null);
      await load();
    } catch (err) {
      setMsg((err as Error).message.includes('duplicate') ? 'Já existe um cupom com esse código.' : (err as Error).message);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-card p-5" aria-label="Gerenciar cupons">
      <div>
        <h3 className="text-base font-bold">Gerenciar cupons</h3>
        <p className="text-xs text-zinc-500">Só você, dono da loja, vê esta área.</p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="nc" className="mb-1 block text-xs font-semibold text-zinc-400">Código</label>
          <input id="nc" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LANCAMENTO20" className={`${input} w-44`} />
        </div>
        <div>
          <label htmlFor="np" className="mb-1 block text-xs font-semibold text-zinc-400">Desconto (%)</label>
          <input id="np" type="number" min={1} max={99} value={percent} onChange={(e) => setPercent(e.target.value)} className={`${input} w-24`} />
        </div>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg">Criar cupom</button>
      </form>
      {msg && <p role="alert" className="text-sm text-zinc-300">{msg}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum cupom criado.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 bg-bg px-4 py-3">
              <span>
                <span className="font-mono text-sm font-bold">{c.code}</span>
                <span className="ml-2 text-sm text-zinc-400">{c.percent}% de desconto</span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => { await setCouponActive(c.id, !c.active); load(); }}
                  aria-pressed={c.active}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${c.active ? 'border-pix/40 text-pix' : 'border-line text-zinc-400'}`}
                >
                  {c.active ? 'Ativo' : 'Inativo'}
                </button>
                <button
                  type="button"
                  onClick={async () => { if (window.confirm(`Excluir o cupom ${c.code}?`)) { await deleteCoupon(c.id); load(); } }}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-red-500/60"
                >
                  Excluir
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CouponsTab() {
  const { profile, setProfile, isOwner } = useAuth();
  const [code, setCode] = useState('');
  const [found, setFound] = useState<{ code: string; percent: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    setFound(null);
    try {
      const c = await validateCoupon(code);
      if (c) setFound(c);
      else setMsg('Cupom inválido ou desativado.');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (c: string | null) => {
    if (!profile) return;
    try {
      await updateProfile(profile.id, { active_coupon: c });
      setProfile({ ...profile, active_coupon: c });
      setMsg(c ? `Cupom ${c} salvo na sua conta.` : 'Cupom removido.');
      setFound(null);
      setCode('');
    } catch (err) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-line bg-card p-5" aria-label="Usar cupom">
        <div>
          <h3 className="text-base font-bold">Usar um cupom</h3>
          <p className="text-sm text-zinc-400">Digite o código para ver o desconto. O cupom de lançamento dá 20% de desconto.</p>
        </div>

        {profile?.active_coupon && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pix/30 bg-pix/10 p-3 text-sm">
            <span>Cupom ativo na conta: <strong className="font-mono">{profile.active_coupon}</strong></span>
            <button type="button" onClick={() => apply(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500">Remover</button>
          </div>
        )}

        <form onSubmit={validate} className="flex flex-wrap gap-3">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código do cupom" aria-label="Código do cupom" className={`${input} min-w-0 flex-1`} />
          <button type="submit" disabled={busy || !code.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg disabled:opacity-60">
            {busy ? 'Validando…' : 'Validar'}
          </button>
        </form>

        {found && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3 text-sm">
            <span><strong className="font-mono">{found.code}</strong> · {found.percent}% de desconto</span>
            <button type="button" onClick={() => apply(found.code)} className="rounded-lg bg-pix px-4 py-1.5 text-xs font-bold text-white transition hover:bg-pix-dark">Usar este cupom</button>
          </div>
        )}
        {msg && <p role="status" className="text-sm text-zinc-300">{msg}</p>}
        <p className="text-xs text-zinc-500">O desconto é aplicado nas compras pagas com o saldo da carteira.</p>
      </section>

      {isOwner && <OwnerCoupons />}
    </div>
  );
}
