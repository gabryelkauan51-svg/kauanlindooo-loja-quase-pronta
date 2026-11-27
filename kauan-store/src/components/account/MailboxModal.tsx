import { useEffect, useState } from 'react';
import Modal from '../Modal';
import Spinner from '../Spinner';
import { ApiError, fetchMailbox } from '../../lib/api';
import { copyText } from '../../lib/format';
import { DISCORD_SUPPORT } from '../AccountMenu';
import type { DbOrder, MailboxResponse } from '../../types';

interface Props {
  order: DbOrder;
  /** E-mail mostrado enquanto a caixa carrega (vem da entrega do pedido). */
  email: string;
  onClose: () => void;
}

/** Endereço do webmail quando o servidor não devolve um. */
function webmailFallback(email: string): string {
  const d = email.split('@')[1]?.toLowerCase() ?? '';
  if (/(hotmail|outlook|live|msn)\./.test(d)) return 'https://outlook.live.com/mail/';
  if (/(gmail|googlemail)\./.test(d)) return 'https://mail.google.com/';
  if (/yahoo\./.test(d)) return 'https://mail.yahoo.com/';
  return d ? `https://${d}/` : 'https://outlook.live.com/mail/';
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
}

function CopyBtn({ text, label = 'Copiar', className = '' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className={`rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:border-zinc-500 ${done ? 'text-pix' : 'text-zinc-200'} ${className}`}
    >
      {done ? 'Copiado' : label}
    </button>
  );
}

export default function MailboxModal({ order, email, onClose }: Props) {
  const [data, setData] = useState<MailboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code: string | null; webUrl?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchMailbox(order.id)
      .then((d) => setData(d))
      .catch((e: unknown) => {
        const err = e as ApiError;
        setError({ message: err.message, code: err.code ?? null, webUrl: err.data?.webUrl });
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [order.id]);

  const shownEmail = data?.email ?? email;
  const webUrl = data?.webUrl ?? error?.webUrl ?? webmailFallback(email);

  return (
    <Modal onClose={onClose} wide label="E-mail da conta">
      <div className="space-y-5 p-6">
        <div className="pr-10">
          <h2 className="text-xl font-bold">E-mail da conta</h2>
          <p className="mt-1 text-sm text-zinc-400">Aqui aparecem os e-mails mais recentes e o código de verificação, se houver.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bg p-3">
          <span className="min-w-0 flex-1 truncate font-mono text-sm text-white">{shownEmail}</span>
          <CopyBtn text={shownEmail} />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 disabled:opacity-60"
          >
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
          <a href={webUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500">
            Abrir site do e-mail
          </a>
        </div>

        {loading && !data && (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-zinc-400">
            <Spinner /> Buscando seus e-mails…
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-100">
              {error.code === 'AUTH_FAILED'
                ? 'Não conseguimos entrar neste e-mail. A senha do e-mail pode ter sido alterada.'
                : error.message}
            </p>
            <p className="text-xs text-red-200/80">
              {error.code === 'AUTH_FAILED'
                ? 'Alguns provedores também bloqueiam esse tipo de acesso. Você ainda pode entrar direto no site do e-mail.'
                : 'Tente atualizar daqui a pouco. Se continuar, entre pelo site do e-mail ou fale com o suporte.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={webUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20">
                Abrir site do e-mail
              </a>
              <a href={DISCORD_SUPPORT} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-white/10">
                Chamar suporte
              </a>
            </div>
          </div>
        )}

        {data?.latestCode && (
          <div className="rounded-2xl border border-pix/30 bg-pix/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-pix">Código mais recente</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-4xl font-extrabold tracking-[0.15em] text-white">{data.latestCode.code}</p>
              <CopyBtn text={data.latestCode.code} label="Copiar código" className="!border-pix/40 !px-4 !py-2 !text-sm" />
            </div>
            <p className="mt-2 truncate text-xs text-zinc-400">
              {data.latestCode.from}
              {data.latestCode.date ? ` · ${formatDate(data.latestCode.date)}` : ''}
            </p>
          </div>
        )}

        {data && (
          <section aria-label="E-mails recentes">
            <h3 className="mb-2 text-sm font-bold">Últimos e-mails</h3>
            {data.messages.length === 0 ? (
              <p className="rounded-xl border border-line bg-bg p-4 text-sm text-zinc-500">Nenhum e-mail na caixa de entrada por enquanto.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {data.messages.map((m) => {
                  const open = openId === m.id;
                  return (
                    <li key={m.id} className="bg-card">
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : m.id)}
                        aria-expanded={open}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-bg"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{m.subject}</span>
                          <span className="block truncate text-xs text-zinc-500">
                            {m.from}
                            {m.date ? ` · ${formatDate(m.date)}` : ''}
                          </span>
                        </span>
                        {m.code && <span className="shrink-0 rounded-md border border-pix/30 bg-pix/10 px-2 py-1 font-mono text-xs font-bold text-pix">{m.code}</span>}
                      </button>
                      {open && (
                        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border-t border-line bg-bg px-4 py-3 font-sans text-xs leading-relaxed text-zinc-300">
                          {m.body || '(sem conteúdo de texto)'}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
