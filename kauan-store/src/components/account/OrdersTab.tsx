import { useState } from 'react';
import Modal from '../Modal';
import MailboxModal from './MailboxModal';
import { copyText, formatBRL } from '../../lib/format';
import { gameInfo } from '../../lib/games';
import { normalizeDelivery, deliveryAsText } from '../../lib/delivery';
import { displayStatus, STATUS_LABEL, type DisplayStatus } from '../../lib/orders';
import type { DbOrder } from '../../types';

interface Props {
  orders: DbOrder[];
  loading: boolean;
  onOpenPix: (o: DbOrder) => void;
}

const BADGE: Record<DisplayStatus, string> = {
  pending: 'border-brand/30 bg-brand/10 text-brand-light',
  paid: 'border-zinc-600 bg-zinc-800/60 text-zinc-200',
  delivered: 'border-pix/30 bg-pix/10 text-pix',
  expired: 'border-zinc-700 bg-zinc-800/40 text-zinc-500',
};

function Field({ label, value, hidden }: { label: string; value: string; hidden: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3">
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-0.5 break-all font-mono text-sm text-white">{hidden ? '••••••••••' : value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          if (await copyText(value)) {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }
        }}
        className={`shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-zinc-500 ${done ? 'text-pix' : 'text-zinc-200'}`}
      >
        {done ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function Delivered({ order }: { order: DbOrder }) {
  const d = normalizeDelivery(order.delivery);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mail, setMail] = useState(false);
  const [panel, setPanel] = useState(false);
  const extra = d.extra.map(([k, v]) => `${k}: ${v}`).join('\n');

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setHidden(!hidden)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500">
          {hidden ? 'Mostrar dados' : 'Ocultar dados'}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(deliveryAsText(d))) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className={`rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-zinc-500 ${copied ? 'text-pix' : 'text-zinc-200'}`}
        >
          {copied ? 'Copiado' : 'Copiar tudo'}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {d.login && <Field label="Login da conta" value={d.login} hidden={hidden} />}
        {d.password && <Field label="Senha da conta" value={d.password} hidden={hidden} />}
      </div>

      {d.email && (
        <section className="space-y-2 rounded-xl border border-line p-3" aria-label="Acesso ao e-mail">
          <p className="text-sm font-bold">Acesso ao e-mail</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="E-mail" value={d.email} hidden={hidden} />
            {d.emailPassword && <Field label="Senha do e-mail" value={d.emailPassword} hidden={hidden} />}
          </div>
          {d.emailPassword && (
            <button type="button" onClick={() => setMail(true)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg">
              Acessar e-mail
            </button>
          )}
        </section>
      )}

      {extra && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-zinc-400">Informações adicionais</p>
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-bg p-3 font-sans text-xs leading-relaxed text-zinc-300">{hidden ? '••••••••••' : extra}</pre>
        </div>
      )}

      {!d.login && !d.password && !d.email && !extra && (
        <p className="text-sm text-zinc-500">Nenhum dado de acesso foi salvo neste pedido. Fale com o suporte se precisar.</p>
      )}

      <button type="button" onClick={() => setPanel(true)} className="text-sm font-semibold text-brand-light underline underline-offset-2 hover:text-white">
        Abrir painel completo da conta
      </button>

      {mail && d.email && <MailboxModal order={order} email={d.email} onClose={() => setMail(false)} />}

      {panel && (
        <Modal onClose={() => setPanel(false)} wide label="Painel completo da conta">
          <div className="space-y-4 p-6">
            <h2 className="pr-10 text-xl font-bold">Painel completo da conta</h2>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {d.all.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-zinc-400">{k}</dt>
                  <dd className="break-all text-right font-mono text-sm text-white">{hidden ? '••••••••••' : v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={() => setHidden(!hidden)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500">
              {hidden ? 'Mostrar dados' : 'Ocultar dados'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function OrdersTab({ orders, loading, onOpenPix }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading && orders.length === 0) return <p className="py-10 text-center text-sm text-zinc-500">Carregando seus pedidos…</p>;
  if (orders.length === 0) {
    return <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-zinc-400">Você ainda não fez nenhuma compra.</div>;
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const status = displayStatus(o);
        const info = gameInfo(o.game);
        const open = openId === o.id;
        const hasOriginal = o.original_price !== null && o.final_price !== null && o.original_price > o.final_price;

        return (
          <li key={o.id} className="rounded-2xl border border-line bg-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg text-xl" aria-hidden="true">{info.emoji}</span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold" title={o.title ?? ''}>{o.title ?? 'Conta'}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {info.label} · {new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${BADGE[status]}`}>
                  {status === 'delivered' ? 'Entregue' : STATUS_LABEL[status]}
                </span>
                <div className="text-right">
                  <p className="text-base font-extrabold">{formatBRL(o.final_price)}</p>
                  {hasOriginal && <p className="text-xs text-zinc-500 line-through">{formatBRL(o.original_price)}</p>}
                </div>
                {status === 'delivered' && (
                  <button type="button" onClick={() => setOpenId(open ? null : o.id)} aria-expanded={open} className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark">
                    {open ? 'Fechar pedido' : 'Abrir pedido'}
                  </button>
                )}
                {status === 'pending' && o.checkout && (
                  <button type="button" onClick={() => onOpenPix(o)} className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark">
                    Abrir PIX
                  </button>
                )}
                {status === 'paid' && (
                  <button type="button" onClick={() => onOpenPix(o)} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500">
                    Acompanhar entrega
                  </button>
                )}
              </div>
            </div>

            {status === 'delivered' && open && <Delivered order={o} />}
          </li>
        );
      })}
    </ul>
  );
}
