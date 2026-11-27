import { STEAM_BASE_FROM } from '../lib/steam';
import { formatBRL } from '../lib/format';

interface Props {
  /** Leva o cliente para a lista de contas Steam logo abaixo. */
  onBrowse: () => void;
}

const Badge = ({ children }: { children: string }) => (
  <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-zinc-300">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-pix" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
    {children}
  </li>
);

/**
 * Dois produtos da Steam, lado a lado. Os valores "a partir de" são preços finais ao cliente;
 * o preço dos itens vindos do fornecedor recebe margem de 70% (aplicada nas Edge Functions).
 */
export default function SteamSection({ onBrowse }: Props) {
  const products = [
    { title: 'Skin / Item de jogo', desc: 'Itens e skins para os seus jogos da Steam, entregues na hora.', from: STEAM_BASE_FROM.item },
    { title: 'Steam Key Random', desc: 'Chaves aleatórias de jogos. Você resgata na sua conta Steam.', from: STEAM_BASE_FROM.key },
  ];

  return (
    <section aria-labelledby="steam-title" className="mb-8 space-y-4">
      <div>
        <h2 id="steam-title" className="font-display text-xl font-bold">Steam</h2>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Vantagens">
          <Badge>Entrega automática</Badge>
          <Badge>Pix</Badge>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <article key={p.title} className="flex flex-col rounded-2xl border border-line bg-card p-5">
            <h3 className="text-base font-bold">{p.title}</h3>
            <p className="mt-1 flex-1 text-sm text-zinc-400">{p.desc}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-400">
                a partir de <span className="text-xl font-extrabold text-white">{formatBRL(p.from)}</span>
              </p>
              <button type="button" onClick={onBrowse} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-light hover:text-bg">
                Ver produtos
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
