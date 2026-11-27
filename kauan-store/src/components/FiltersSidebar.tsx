import { EloRegionSection, SecuritySection } from './ValorantFilterBlocks';
import AdvancedFilters from './AdvancedFilters';
import { Section, Toggle, inputCls } from './FilterSection';
import type { AdvValues, FilterDef } from '../lib/filters';
import type { GameSlug, InventoryFilters, ValorantFilters } from '../types';

export interface PriceRange {
  label: string;
  from: string;
  to: string;
}

/** Faixas sobre o preço FINAL exibido no card (já com margem). */
export const PRICE_RANGES: PriceRange[] = [
  { label: 'Qualquer', from: '', to: '' },
  { label: 'Até R$ 30', from: '', to: '30' },
  { label: 'R$ 30–80', from: '30', to: '80' },
  { label: 'R$ 80–200', from: '80', to: '200' },
  { label: 'R$ 200–500', from: '200', to: '500' },
  { label: 'R$ 500–1 mil', from: '500', to: '1000' },
  { label: 'R$ 1–2,5 mil', from: '1000', to: '2500' },
  { label: 'R$ 2,5–5 mil', from: '2500', to: '5000' },
];

interface Props {
  game: GameSlug;
  priceIndex: number;
  onPrice: (index: number) => void;
  inventory: InventoryFilters;
  onInventory: (f: InventoryFilters) => void;
  valorant: ValorantFilters;
  onValorant: (f: ValorantFilters) => void;
  advDefs: FilterDef[];
  adv: AdvValues;
  onAdv: (v: AdvValues) => void;
  onClear: () => void;
  /** Filtros de inventário que a lista atual não permite aplicar (a API não traz o dado). */
  unavailable: string[];
}

export default function FiltersSidebar({ game, priceIndex, onPrice, inventory, onInventory, valorant, onValorant, advDefs, adv, onAdv, onClear, unavailable }: Props) {
  const set = (patch: Partial<InventoryFilters>) => onInventory({ ...inventory, ...patch });

  return (
    <aside className="w-full shrink-0 space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:w-72 lg:self-start lg:overflow-y-auto lg:pr-1" aria-label="Filtros">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-display text-base font-bold uppercase tracking-wide">Filtros</h2>
        <button type="button" onClick={onClear} className="text-xs font-semibold text-zinc-400 transition hover:text-white">
          Limpar tudo
        </button>
      </div>

      {game === 'valorant' && <EloRegionSection value={valorant} onChange={onValorant} />}

      {game === 'valorant' && (
        <Section title="Inventário" icon="🎯">
          <Toggle label="Com skins" checked={inventory.withSkins} onChange={(v) => set({ withSkins: v })} />
          <Toggle label="Com faca" checked={inventory.withKnife} onChange={(v) => set({ withKnife: v })} />

          <div>
            <label htmlFor="skin-query" className="mb-1.5 block text-xs font-semibold text-zinc-400">
              Skins específicas
            </label>
            <input
              id="skin-query"
              type="search"
              value={inventory.skinQuery}
              onChange={(e) => set({ skinQuery: e.target.value })}
              placeholder="Buscar skins..."
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="min-skins" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Skins
              </label>
              <input id="min-skins" type="number" min={0} inputMode="numeric" placeholder="0" value={inventory.minSkins} onChange={(e) => set({ minSkins: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label htmlFor="min-knives" className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Facas
              </label>
              <input id="min-knives" type="number" min={0} inputMode="numeric" placeholder="0" value={inventory.minKnives} onChange={(e) => set({ minKnives: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="min-vp" className="mb-1.5 block text-xs font-semibold text-zinc-400">
              VP gasto
            </label>
            <input id="min-vp" type="number" min={0} inputMode="numeric" placeholder="0" value={inventory.minVp} onChange={(e) => set({ minVp: e.target.value })} className={inputCls} />
          </div>

        </Section>
      )}

      {game === 'valorant' && <SecuritySection value={valorant} onChange={onValorant} />}

      {game !== 'valorant' && <AdvancedFilters defs={advDefs} values={adv} onChange={onAdv} />}

      <Section title="Preço" icon="💲">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Faixa de preço">
          {PRICE_RANGES.map((r, i) => {
            const active = i === priceIndex;
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => onPrice(i)}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active ? 'border-brand/60 bg-brand/15 text-white' : 'border-line bg-bg text-zinc-300 hover:border-brand/60 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </Section>
      {unavailable.length > 0 && (
        <p className="rounded-xl border border-line bg-card p-3 text-xs leading-relaxed text-zinc-400">
          Esta lista não traz o dado de {unavailable.join(', ')} das contas, então esse filtro não foi aplicado.
        </p>
      )}
    </aside>
  );
}
