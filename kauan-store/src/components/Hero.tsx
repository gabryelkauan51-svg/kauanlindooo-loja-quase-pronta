import { GAMES } from '../lib/games';
import type { GameSlug } from '../types';

interface Props {
  value: GameSlug;
  onSelect: (g: GameSlug) => void;
}

export default function Hero({ value, onSelect }: Props) {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-5xl px-4 pb-4 pt-12 text-center sm:pt-16">
      <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-1.5 text-xs font-semibold text-zinc-300">
        <span className="h-1.5 w-1.5 rounded-full bg-pix" aria-hidden="true" />
        Pague com Pix, receba na hora
      </p>

      <h1 id="hero-title" className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">
        Encontre a sua conta
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
        Contas de Valorant, Fortnite, Roblox e mais. Filtre por skin, rank e preço.
      </p>

      <nav aria-label="Jogos" className="mt-8 flex flex-wrap justify-center gap-2">
        {GAMES.map((g) => {
          const active = g.slug === value;
          return (
            <button
              key={g.slug}
              type="button"
              onClick={() => onSelect(g.slug)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active ? 'border-brand/60 bg-brand/15 text-white' : 'border-line bg-card text-zinc-300 hover:border-zinc-500 hover:text-white'
              }`}
            >
              <span aria-hidden="true">{g.emoji}</span>
              {g.label}
            </button>
          );
        })}
      </nav>
    </section>
  );
}
