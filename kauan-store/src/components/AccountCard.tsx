import GameCover from './GameCover';
import FavoriteButton from './FavoriteButton';
import { emailOf, phoneOf, twoFactorOf } from '../lib/valorant';
import { cardStats, getAccountStats, getPreviewImages, looksUnavailable } from '../lib/account';
import { formatBRL, getAccountMeta, pickPrice } from '../lib/format';
import { gameInfo } from '../lib/games';
import type { Account, GameSlug } from '../types';

interface Props {
  account: Account;
  game: GameSlug;
  onOpen: (a: Account) => void;
  favorite: boolean;
  onFavorite: (a: Account) => void;
}

export default function AccountCard({ account, game, onOpen, favorite, onFavorite }: Props) {
  const { title, image, tags } = getAccountMeta(account);
  const info = gameInfo(game);
  const allStats = getAccountStats(account, undefined, game);
  const stats = cardStats(allStats, game);
  const level = game === 'fortnite' ? allStats.find((s) => s.kind === 'level') : undefined;
  const preview = getPreviewImages(account);
  const sold = looksUnavailable(account);
  const price = pickPrice(account.price);
  const email = emailOf(account);
  const security = [
    email === 'og' ? 'Email OG' : email === 'included' ? 'E-mail incluso' : null,
    twoFactorOf(account) === true ? '2FA' : null,
    phoneOf(account) === true ? 'Telefone' : null,
  ].filter((x): x is string => Boolean(x));

  // Tags só aparecem quando não há contadores resumidos.
  const showTags = stats.length === 0 && tags.length > 0;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-card transition hover:border-brand/70 ${
        sold ? 'opacity-70' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(account)}
        className="relative block w-full text-left"
        aria-label={`Ver detalhes: ${title}`}
      >
        {preview.urls.length >= 4 ? (
          <div className="grid grid-cols-4 gap-1.5 bg-gradient-to-br bg-bg p-1.5">
            {preview.urls.slice(0, 8).map((u, i) => {
              const last = i === 7 && preview.total > 8;
              return (
                <div key={u} className="relative aspect-square overflow-hidden rounded-lg bg-black/30">
                  <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {last && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-sm font-extrabold text-white">
                      +{(preview.total - 8).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="relative aspect-[16/10] w-full overflow-hidden"
            style={{ background: '#0B0B0F' }}
          >
            {image ? (
              <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <>
                <div className="h-full w-full opacity-70">
                  <GameCover game={game} iconClassName="text-5xl" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" aria-hidden="true" />
              </>
            )}
          </div>
        )}

        {level && (
          <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
            Lvl {level.value}
          </span>
        )}

        <FavoriteButton active={favorite} onToggle={() => onFavorite(account)} className="absolute bottom-2 right-2 h-8 w-8" />

        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur">
          {sold ? 'Vendida' : 'Full acesso'}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{info.label}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-white">{title}</h3>
        </div>

        {security.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Segurança">
            {security.map((t) => (
              <li key={t} className="rounded-md border border-line bg-bg px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
        )}

        {stats.length > 0 && (
          <ul className={`grid gap-1.5 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`} aria-label="Resumo da conta">
            {stats.map((s) => (
              <li key={s.kind} className="rounded-xl border border-line bg-bg px-2 py-2 text-center">
                <p className="truncate text-sm font-extrabold text-white">{s.value}</p>
                <p className="truncate text-[11px] text-zinc-500">{s.label}</p>
              </li>
            ))}
          </ul>
        )}

        {showTags && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li key={t} className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-zinc-300">
                {t}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-2xl font-extrabold text-pix">{formatBRL(price)}</p>
          <button
            type="button"
            onClick={() => onOpen(account)}
            disabled={sold}
            className="rounded-lg bg-pix px-4 py-2 text-sm font-bold text-white transition hover:bg-pix-dark disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {sold ? 'Indisponível' : 'Ver conta'}
          </button>
        </div>
      </div>
    </article>
  );
}
