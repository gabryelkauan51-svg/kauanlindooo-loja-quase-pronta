import GameCover from './GameCover';
import { gameInfo } from '../lib/games';
import type { GameSlug } from '../types';

interface Props {
  game: GameSlug;
  /** Título grande (ex.: "Valorant Full Acesso"). */
  title: string;
}

const BADGES = ['Entrega instantânea', 'Contas verificadas', 'Suporte 24/7'];

/** Banner compacto do topo da categoria: título, subtítulo curto e 3 selos discretos. */
export default function GameBanner({ game, title }: Props) {
  const info = gameInfo(game);

  return (
    <header className="relative isolate overflow-hidden rounded-2xl border border-line bg-card">
      {/* Arte do jogo à direita, esmaecida para não competir com o texto */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 opacity-50"
        aria-hidden="true"
        style={{
          WebkitMaskImage: 'linear-gradient(to left, #000 30%, transparent)',
          maskImage: 'linear-gradient(to left, #000 30%, transparent)',
        }}
      >
        {info.banner ? (
          <img src={info.banner} alt="" className="h-full w-full object-cover object-right" />
        ) : (
          <GameCover game={game} loading="eager" iconClassName="text-7xl" />
        )}
      </div>

      <div className="px-6 py-7 sm:px-8 sm:py-9">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-1.5 text-sm text-zinc-400">{info.subtitle}</p>

        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Vantagens">
          {BADGES.map((b) => (
            <li key={b} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/70 px-3 py-1 text-xs font-medium text-zinc-300">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-pix" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
