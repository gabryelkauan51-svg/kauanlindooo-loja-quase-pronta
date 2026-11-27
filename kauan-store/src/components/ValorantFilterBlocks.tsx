import { Section, Segmented, inputCls } from './FilterSection';
import { INACTIVE_OPTIONS, REGIONS, TIERS } from '../lib/valorant';
import type { RegionKey, TierKey, ValorantFilters } from '../types';

interface Props {
  value: ValorantFilters;
  onChange: (f: ValorantFilters) => void;
}

/* Ícones simples e originais (não usam arte oficial do jogo). */
function TierIcon({ color, all = false }: { color: string; all?: boolean }) {
  if (all) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-zinc-400">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l8 4.5v10l-8 4.5-8-4.5V7z" fill={`${color}26`} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 11.5L12 8l3.5 3.5M8.5 15.5L12 12l3.5 3.5" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Globe() {
  return (
    <svg width="18" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="text-zinc-300">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </svg>
  );
}

/* Bandeiras simplificadas em SVG (emoji de bandeira não aparece no Windows). */
function RegionFlag({ region }: { region: RegionKey | 'all' }) {
  const box = 'h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px]';
  if (region === 'br') {
    return (
      <svg viewBox="0 0 20 14" className={box} aria-hidden="true">
        <rect width="20" height="14" fill="#2E7D32" />
        <path d="M10 2l7.5 5L10 12 2.5 7z" fill="#F2C94C" />
        <circle cx="10" cy="7" r="2.8" fill="#1E3A8A" />
      </svg>
    );
  }
  if (region === 'eu') {
    return (
      <svg viewBox="0 0 20 14" className={box} aria-hidden="true">
        <rect width="20" height="14" fill="#1E40AF" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={10 + Math.cos(a) * 4.4} cy={7 + Math.sin(a) * 4.4} r="0.8" fill="#F2C94C" />;
        })}
      </svg>
    );
  }
  if (region === 'na') {
    return (
      <svg viewBox="0 0 20 14" className={box} aria-hidden="true">
        <rect width="20" height="14" fill="#F4F4F5" />
        {[0, 2, 4, 6, 8, 10, 12].map((y) => (
          <rect key={y} y={y} width="20" height="1.1" fill="#B91C1C" />
        ))}
        <rect width="9" height="7.7" fill="#1E3A8A" />
      </svg>
    );
  }
  return <Globe />;
}

export function EloRegionSection({ value, onChange }: Props) {
  const set = (patch: Partial<ValorantFilters>) => onChange({ ...value, ...patch });

  return (
    <Section title="Elo e região" icon="🏅">
      <div>
        <p className="mb-2 text-xs font-semibold text-zinc-400">Elo</p>
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Elo">
          {[{ key: 'all' as const, label: 'Todos', color: '' }, ...TIERS].map((t) => {
            const on = value.tier === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={on}
                onClick={() => set({ tier: t.key as TierKey | 'all' })}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition ${
                  on ? 'border-brand/60 bg-brand/15 text-white' : 'border-line bg-bg text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <TierIcon color={t.color} all={t.key === 'all'} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-zinc-400">Região</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Região">
          {[{ key: 'all' as const, label: 'Todas' }, ...REGIONS].map((r) => {
            const on = value.region === r.key;
            return (
              <button
                key={r.key}
                type="button"
                aria-pressed={on}
                onClick={() => set({ region: r.key as RegionKey | 'all' })}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                  on ? 'border-brand/60 bg-brand/15 text-white' : 'border-line bg-bg text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <RegionFlag region={r.key} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="min-level" className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Level mínimo
        </label>
        <input
          id="min-level"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Ex: 20"
          value={value.minLevel}
          onChange={(e) => set({ minLevel: e.target.value })}
          className={inputCls}
        />
      </div>
    </Section>
  );
}

export function SecuritySection({ value, onChange }: Props) {
  const set = (patch: Partial<ValorantFilters>) => onChange({ ...value, ...patch });

  return (
    <Section title="Segurança" icon="🛡️">
      <Segmented
        label="Telefone vinculado"
        value={value.phone}
        onChange={(v) => set({ phone: v })}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'with', label: 'Com' },
          { value: 'without', label: 'Sem' },
        ]}
      />

      <Segmented
        label="Tipo de e-mail"
        value={value.email}
        onChange={(v) => set({ email: v })}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'og', label: 'Email OG' },
          { value: 'none', label: 'Sem email' },
        ]}
      />

      <div>
        <label htmlFor="inactive" className="mb-1.5 block text-xs font-semibold text-zinc-400">
          Inativa há
        </label>
        <select
          id="inactive"
          value={value.inactive}
          onChange={(e) => set({ inactive: e.target.value as ValorantFilters['inactive'] })}
          className={inputCls}
        >
          {INACTIVE_OPTIONS.map((o) => (
            <option key={o.value || 'any'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}
