import { useMemo, useState } from 'react';
import { buildInventoryTabs, toInventoryItem, type InventoryItem } from '../lib/account';
import type { GameSlug, Skin } from '../types';

interface Props {
  skins: Skin[];
  game: GameSlug;
}

const PAGE = 60;

function ItemCard({ item }: { item: InventoryItem }) {
  return (
    <li
      className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl border p-2.5"
      style={{
        borderColor: `${item.color}66`,
        background: `radial-gradient(circle at 50% 30%, ${item.color}14, transparent 70%), linear-gradient(180deg, #1b1114 0%, #0b0b0f 100%)`,
      }}
    >
      <span
        className="absolute right-2 top-2 h-3.5 w-3.5 rotate-45 rounded-[3px]"
        style={{ background: item.color }}
        aria-hidden="true"
      />

      <div className="absolute inset-x-2 top-6 bottom-12 flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain drop-shadow-lg" />
        ) : (
          <span className="text-3xl opacity-60" aria-hidden="true">
            🎨
          </span>
        )}
      </div>

      <div className="relative min-w-0">
        <p className="truncate text-xs font-bold text-white" title={item.name}>
          {item.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {item.badge && (
            <span className="font-bold" style={{ color: item.color === '#52525B' ? '#A1A1AA' : item.color }}>
              {item.badge}
            </span>
          )}
          {item.badge && item.extra && ' · '}
          {item.extra}
        </p>
      </div>
    </li>
  );
}

export default function InventoryGrid({ skins, game }: Props) {
  const items = useMemo(() => skins.map(toInventoryItem), [skins]);
  const tabs = useMemo(() => buildInventoryTabs(items, game), [items, game]);

  const [tabKey, setTabKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-bg p-4 text-sm text-zinc-400">
        A lista detalhada de itens desta conta não está disponível agora. Os totais acima vêm do cadastro da conta.
      </p>
    );
  }

  const active = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  const q = query.trim().toLowerCase();
  const shown = q ? active.items.filter((i) => i.name.toLowerCase().includes(q)) : active.items;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Categorias do inventário" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-bg p-1">
          {tabs.map((t) => {
            const on = t.key === active.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTabKey(t.key);
                  setLimit(PAGE);
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  on ? 'bg-card text-white' : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {t.label} <span className={on ? 'text-brand-light' : 'text-zinc-600'}>{t.items.length}</span>
              </button>
            );
          })}
        </div>

        {active.items.length > 12 && (
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Buscar item"
            aria-label="Buscar item no inventário"
            className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand focus:outline-none sm:w-44"
          />
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum item com esse nome.</p>
      ) : (
        <ul role="tabpanel" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {shown.slice(0, limit).map((it, i) => (
            <ItemCard key={`${it.name}-${i}`} item={it} />
          ))}
        </ul>
      )}

      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(limit + PAGE)}
          className="mx-auto block rounded-lg border border-line px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-brand hover:text-white"
        >
          Mostrar mais ({shown.length - limit})
        </button>
      )}
    </div>
  );
}
