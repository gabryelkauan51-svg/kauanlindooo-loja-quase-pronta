import { formatBRL } from '../../lib/format';
import { gameInfo } from '../../lib/games';
import type { DbFavorite } from '../../types';

interface Props {
  favorites: DbFavorite[];
  loading: boolean;
  onOpen: (f: DbFavorite) => void;
  onRemove: (f: DbFavorite) => void;
}

export default function FavoritesTab({ favorites, loading, onOpen, onRemove }: Props) {
  if (loading && favorites.length === 0) return <p className="py-10 text-center text-sm text-zinc-500">Carregando favoritos…</p>;
  if (favorites.length === 0) {
    return <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-zinc-400">Você ainda não favoritou nada. Toque no coração de uma conta para guardar aqui.</div>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {favorites.map((f) => {
        const info = gameInfo(f.game);
        const s = f.snapshot ?? {};
        return (
          <li key={f.id} className="flex gap-3 rounded-2xl border border-line bg-card p-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg text-2xl">
              {s.image ? <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span aria-hidden="true">{info.emoji}</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{info.label}</p>
              <p className="truncate text-sm font-bold" title={s.title}>{s.title ?? `Conta #${f.item_id}`}</p>
              <p className="text-sm font-extrabold">{formatBRL(typeof s.price === 'number' ? s.price : null)}</p>
              <div className="mt-auto flex gap-2 pt-2">
                <button type="button" onClick={() => onOpen(f)} className="rounded-lg bg-pix px-3 py-1.5 text-xs font-bold text-white transition hover:bg-pix-dark">Ver conta</button>
                <button type="button" onClick={() => onRemove(f)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500">Remover</button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
