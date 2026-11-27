import { useState } from 'react';
import GameCover from './GameCover';
import { GAMES } from '../lib/games';
import type { GameSlug } from '../types';

interface Props {
  value: GameSlug;
  onSelect: (g: GameSlug) => void;
  onClearFilters: () => void;
}

/** Jogos em destaque (os demais aparecem em "Ver todos"). */
const FEATURED: GameSlug[] = ['roblox', 'brawl-stars', 'clash-royale', 'fortnite', 'valorant', 'steam'];

export default function GameCards({ value, onSelect, onClearFilters }: Props) {
  const [all, setAll] = useState(false);
  const list = all ? GAMES : GAMES.filter((g) => FEATURED.includes(g.slug)).sort((a, b) => FEATURED.indexOf(a.slug) - FEATURED.indexOf(b.slug));

  return (
    <section id="jogos" aria-labelledby="jogos-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="jogos-title" className="font-display text-2xl font-bold tracking-tight">
            Escolha o seu jogo
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Toque em um jogo para ver as contas disponíveis.</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button type="button" onClick={() => setAll(!all)} className="text-brand-light transition hover:text-white">
            {all ? 'Ver menos' : 'Ver todos'}
          </button>
          <button type="button" onClick={onClearFilters} className="text-zinc-400 transition hover:text-white">
            Limpar filtros
          </button>
        </div>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {list.map((g) => {
          const active = g.slug === value;
          return (
            <li key={g.slug}>
              <article
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition ${
                  active ? 'border-brand/70 shadow-glow' : 'border-line hover:border-zinc-600'
                }`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-bg">
                  <GameCover
                    game={g.slug}
                    alt={`Capa de ${g.label}`}
                    iconClassName="text-5xl"
                    imgClassName="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-card" aria-hidden="true" />
                  <span className="absolute inset-x-0 top-0 h-[3px] opacity-60" style={{ background: g.accent }} aria-hidden="true" />

                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 p-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg/90 text-lg"
                      style={{ boxShadow: `inset 0 0 0 1px ${g.accent}33` }}
                      aria-hidden="true"
                    >
                      {g.emoji}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-bold leading-tight">{g.label}</h3>
                      <p className="truncate text-xs text-zinc-300">{g.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => onSelect(g.slug)}
                    className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg"
                  >
                    Ver produto
                  </button>
                </div>
              </article>
            </li>
          );
        })}

        {!all && (
          <li>
            <button
              type="button"
              onClick={() => setAll(true)}
              className="flex h-full min-h-[14rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card/50 text-sm font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl" aria-hidden="true">+</span>
              Procurar outro jogo
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
