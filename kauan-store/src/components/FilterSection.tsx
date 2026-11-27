import { useState, type ReactNode } from 'react';

export const inputCls =
  'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-brand focus:outline-none';

export function Section({ title, children, icon }: { title: string; children: ReactNode; icon: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-2xl border border-line bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg text-sm" aria-hidden="true">
            {icon}
          </span>
          {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={`text-zinc-500 transition ${open ? '' : 'rotate-180'}`}
          aria-hidden="true"
        >
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
      {open && <div className="space-y-4 px-4 pb-4">{children}</div>}
    </section>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-200">
      {label}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 rounded-full border border-line bg-bg transition peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-light after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-zinc-300 after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-white"
      />
    </label>
  );
}

/** Seletor de 2 a 4 opções lado a lado (ex.: Todos / Com / Sem). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-zinc-400">{label}</p>
      <div role="group" aria-label={label} className="flex rounded-lg border border-line bg-bg p-0.5">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                on ? 'bg-brand/20 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
