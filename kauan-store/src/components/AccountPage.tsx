import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Spinner from './Spinner';
import FavoriteButton from './FavoriteButton';
import InventoryGrid from './InventoryGrid';
import { fetchAccountDetails } from '../lib/api';
import { downloadAccountImage, getAccountStats, looksUnavailable, summaryStats } from '../lib/account';
import { formatBRL, getAccountMeta, pickPrice } from '../lib/format';
import { gameInfo } from '../lib/games';
import { discountOf, emailOf, lastActivityOf, phoneOf, regionOf, relativeTimePt, twoFactorOf } from '../lib/valorant';
import type { Account, GameSlug, Skin } from '../types';

interface Props {
  account: Account;
  game: GameSlug;
  onBack: () => void;
  onBuy: (a: Account) => void;
  favorite: boolean;
  onFavorite: (a: Account) => void;
}

const TERMS_URL = import.meta.env.VITE_TERMS_URL;

/* ------------------------------ Peças visuais ------------------------------ */

const ico = 'h-4 w-4 shrink-0 text-zinc-500';
const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const IconGlobe = () => (
  <svg {...svgProps} className={ico}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
  </svg>
);
const IconMail = () => (
  <svg {...svgProps} className={ico}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);
const IconShield = () => (
  <svg {...svgProps} className={ico}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconPhone = () => (
  <svg {...svgProps} className={ico}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </svg>
);
const IconClock = () => (
  <svg {...svgProps} className={ico}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2.5 text-sm text-zinc-400">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold text-white">{children}</dd>
    </div>
  );
}

const Ok = ({ children }: { children: ReactNode }) => <span className="text-pix">✓ {children}</span>;
const Muted = ({ children }: { children: ReactNode }) => <span className="font-medium text-zinc-500">{children}</span>;

/* ------------------------------ Página ------------------------------ */

export default function AccountPage({ account, game, onBack, onBuy, favorite, onFavorite }: Props) {
  const [detail, setDetail] = useState<Account>(account);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<string | null>(null);

  const info = gameInfo(game);
  const raw = account as Record<string, unknown>;
  const accountId = String(raw.item_id ?? raw.itemId ?? account.id);

  const load = (signal?: AbortSignal) =>
    fetchAccountDetails(accountId, game, signal).then((res) => {
      const d = res.account as Record<string, unknown>;
      setDetail({ ...account, ...res.account, price: pickPrice(d?.price, account.price) });
      setSkins(res.skins ?? []);
      setError(null);
    });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const ctrl = new AbortController();
    setLoading(true);
    load(ctrl.signal)
      .catch((e: Error) => {
        if (!ctrl.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, accountId, game]);

  const meta = getAccountMeta(detail);
  const allStats = useMemo(() => getAccountStats(detail, skins, game), [detail, skins, game]);
  const summary = useMemo(() => summaryStats(allStats, game), [allStats, game]);
  const price = pickPrice(detail.price, account.price);
  const sold = looksUnavailable(detail);
  const discount = discountOf(detail);

  const region = regionOf(detail);
  const regionLabel = region.label ?? allStats.find((s) => s.kind === 'region')?.value ?? null;
  const email = emailOf(detail);
  const twoFa = twoFactorOf(detail);
  const phone = phoneOf(detail);
  const activity = lastActivityOf(detail);

  const canBuy = !sold && accepted;

  const verify = async () => {
    setChecking(true);
    setAvailability(null);
    try {
      await load();
      setAvailability('verificada');
    } catch {
      setAvailability('erro');
    } finally {
      setChecking(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    await downloadAccountImage(meta.image, {
      id: accountId,
      title: meta.title,
      game: info.label,
      accent: info.accent,
      price: formatBRL(price),
      stats: summary.map((s) => ({ label: s.label, value: s.value })),
    });
    setDownloading(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-6">
      {/* Cabeçalho: voltar + título/badge */}
      <header className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Voltar ao catálogo
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line bg-card px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
            {info.label}
          </span>
          <span className="rounded-md border border-pix/30 bg-pix/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-pix">
            {sold ? 'Vendida' : 'Full acesso'}
          </span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{meta.title}</h1>
          <FavoriteButton active={favorite} onToggle={() => onFavorite(detail)} className="h-10 shrink-0 px-3" label={favorite ? 'Favoritada' : 'Favoritar'} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-6">
          {sold && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
              Esta conta já foi vendida e não está mais disponível para compra.
            </p>
          )}

          {meta.image && (
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <img src={meta.image} alt="" className="max-h-72 w-full object-cover" />
            </div>
          )}

          {/* Cards de resumo (sem repetir métricas) */}
          {summary.length > 0 && (
            <section aria-label="Resumo da conta">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {summary.map((s) => (
                  <li key={s.kind} className="rounded-xl border border-line bg-card px-4 py-3">
                    <p className="text-xs text-zinc-500">{s.label}</p>
                    <p className="mt-0.5 truncate text-xl font-extrabold">{s.value}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {meta.description && <p className="max-w-prose text-sm leading-relaxed text-zinc-300">{meta.description}</p>}

          {/* Informações da conta */}
          <section aria-labelledby="info-title" className="rounded-2xl border border-line bg-card px-5 py-4">
            <h2 id="info-title" className="text-base font-bold">
              Informações da conta
            </h2>
            <dl className="mt-1 divide-y divide-line">
              <InfoRow icon={<IconGlobe />} label="Região">
                {regionLabel ? regionLabel : <Muted>Não informada</Muted>}
              </InfoRow>
              <InfoRow icon={<IconMail />} label="E-mail">
                {email === 'og' ? (
                  <Ok>Incluso (OG)</Ok>
                ) : email === 'included' ? (
                  <Ok>Incluso</Ok>
                ) : email === 'none' ? (
                  <Muted>Sem e-mail</Muted>
                ) : (
                  <Muted>Não informado</Muted>
                )}
              </InfoRow>
              <InfoRow icon={<IconShield />} label="Autenticação em 2 etapas">
                {twoFa === true ? <Ok>Ativada</Ok> : twoFa === false ? <Muted>Desativada</Muted> : <Muted>Não informada</Muted>}
              </InfoRow>
              <InfoRow icon={<IconPhone />} label="Telefone">
                {phone === true ? <Ok>Vinculado</Ok> : phone === false ? <Muted>Sem telefone</Muted> : <Muted>Não informado</Muted>}
              </InfoRow>
            </dl>
          </section>

          {/* Atividade */}
          <section aria-labelledby="atv-title" className="rounded-2xl border border-line bg-card px-5 py-4">
            <h2 id="atv-title" className="text-base font-bold">
              Atividade
            </h2>
            <dl className="mt-1">
              <InfoRow icon={<IconClock />} label="Última atividade">
                {activity ? (
                  <span>
                    {relativeTimePt(activity)}
                    <span className="block text-xs font-normal text-zinc-500">
                      {activity.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </span>
                ) : (
                  <Muted>Não informada</Muted>
                )}
              </InfoRow>
            </dl>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              As datas são as registradas no cadastro da conta e podem não refletir o último acesso real.
            </p>
          </section>

          {/* Inventário */}
          <section aria-labelledby="inv-title" className="rounded-2xl border border-line bg-card p-4 sm:p-5">
            <h2 id="inv-title" className="mb-4 text-base font-bold">
              Inventário da conta {!loading && skins.length > 0 && <span className="text-zinc-500">{skins.length.toLocaleString('pt-BR')}</span>}
            </h2>
            {loading ? (
              <div className="flex items-center gap-3 py-8 text-sm text-zinc-400">
                <Spinner /> Carregando inventário…
              </div>
            ) : (
              <>
                {error && (
                  <p role="alert" className="mb-4 text-sm text-red-300">
                    Não foi possível carregar todos os detalhes. {error}
                  </p>
                )}
                <InventoryGrid skins={skins} game={game} />
              </>
            )}
          </section>
        </div>

        {/* Coluna de compra PIX, fixa ao rolar */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Compra">
          <div className="space-y-4 rounded-2xl border border-line bg-card p-5">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">Preço final</p>
                {discount && (
                  <span className="rounded-md border border-pix/30 bg-pix/10 px-1.5 py-0.5 text-[11px] font-semibold text-pix">
                    −{discount}%
                  </span>
                )}
              </div>
              <p className="text-4xl font-extrabold text-white">{formatBRL(price)}</p>
              <p className="mt-1 text-xs text-zinc-500">Pagamento via PIX, sem taxas extras.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-zinc-400">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#7C5CE6]"
              />
              <span>
                Li e concordo com os{' '}
                {TERMS_URL ? (
                  <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-light underline underline-offset-2">
                    Termos de Compra
                  </a>
                ) : (
                  <strong className="font-semibold text-zinc-200">Termos de Compra</strong>
                )}{' '}
                e estou ciente de que devo gravar a tela até o primeiro login na conta.
              </span>
            </label>

            <button
              type="button"
              disabled={!canBuy}
              onClick={() => onBuy(detail)}
              className="w-full rounded-xl bg-pix px-6 py-3.5 text-base font-bold text-white transition hover:bg-pix-dark disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {sold ? 'Conta vendida' : 'Comprar via PIX'}
            </button>
            {!sold && !accepted && <p className="-mt-2 text-center text-[11px] text-zinc-600">Marque o aceite acima para liberar a compra.</p>}

            <div className="space-y-2">
              <button
                type="button"
                onClick={verify}
                disabled={checking}
                className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
              >
                {checking ? 'Verificando…' : 'Verificar se está disponível'}
              </button>
              <p role="status" aria-live="polite" className="min-h-[1rem] text-center text-xs text-zinc-500">
                {availability === 'verificada' && (sold ? 'Esta conta não está mais disponível.' : 'Conta disponível agora.')}
                {availability === 'erro' && 'Não foi possível verificar agora. Tente de novo.'}
              </p>

              <button
                type="button"
                onClick={download}
                disabled={downloading}
                className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:opacity-60"
              >
                {downloading ? 'Gerando imagem…' : 'Baixar imagem da conta'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
