import { Section, Segmented, inputCls } from './FilterSection';
import type { AdvValues, FilterDef } from '../lib/filters';

interface Props {
  defs: FilterDef[];
  values: AdvValues;
  onChange: (v: AdvValues) => void;
}

function Control({ def, values, set }: { def: FilterDef; values: AdvValues; set: (k: string, v: string) => void }) {
  const id = `adv-${def.id}`;

  if (def.kind === 'range') {
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold text-zinc-400">{def.label}</p>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label={`${def.label}, mínimo`} type="number" min={0} inputMode="numeric" placeholder="Mín." value={values[`${def.id}:min`] ?? ''} onChange={(e) => set(`${def.id}:min`, e.target.value)} className={inputCls} />
          <input aria-label={`${def.label}, máximo`} type="number" min={0} inputMode="numeric" placeholder="Máx." value={values[`${def.id}:max`] ?? ''} onChange={(e) => set(`${def.id}:max`, e.target.value)} className={inputCls} />
        </div>
      </div>
    );
  }
  if (def.kind === 'min') {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-zinc-400">{def.label}</label>
        <input id={id} type="number" min={0} inputMode="numeric" placeholder="0" value={values[def.id] ?? ''} onChange={(e) => set(def.id, e.target.value)} className={inputCls} />
      </div>
    );
  }
  if (def.kind === 'select') {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-zinc-400">{def.label}</label>
        <select id={id} value={values[def.id] ?? ''} onChange={(e) => set(def.id, e.target.value)} className={inputCls}>
          {(def.options ?? []).map((o) => (
            <option key={o.value || 'any'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }
  if (def.kind === 'tri') {
    const [yes, no] = def.triLabels ?? ['Sim', 'Não'];
    return (
      <Segmented
        label={def.label}
        value={values[def.id] ?? ''}
        onChange={(v) => set(def.id, v)}
        options={[{ value: '', label: 'Todos' }, { value: 'yes', label: yes }, { value: 'no', label: no }]}
      />
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-zinc-400">{def.label}</label>
      <input id={id} type="search" placeholder={def.placeholder ?? 'Buscar'} value={values[def.id] ?? ''} onChange={(e) => set(def.id, e.target.value)} className={inputCls} />
    </div>
  );
}

/** Filtros avançados dos jogos que não são Valorant (cada jogo tem os seus). */
export default function AdvancedFilters({ defs, values, onChange }: Props) {
  if (defs.length === 0) return null;
  const set = (k: string, v: string) => onChange({ ...values, [k]: v });
  const account = defs.filter((d) => d.group === 'account');
  const resources = defs.filter((d) => d.group === 'resources');

  return (
    <>
      {account.length > 0 && (
        <Section title="Conta e segurança" icon="🛡️">
          {account.map((d) => <Control key={d.id} def={d} values={values} set={set} />)}
        </Section>
      )}
      {resources.length > 0 && (
        <Section title="Recursos da conta" icon="🎒">
          {resources.map((d) => <Control key={d.id} def={d} values={values} set={set} />)}
        </Section>
      )}
    </>
  );
}
