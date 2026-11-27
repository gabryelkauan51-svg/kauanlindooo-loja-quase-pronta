import { useState } from 'react';
import { DISCORD_SUPPORT } from './AccountMenu';

const ITEMS: { q: string; a: string }[] = [
  { q: 'O que é uma conta NFA?', a: 'NFA é uma conta que não é acesso total. Ela não acompanha o e-mail original nem o acesso completo, como acontece na Full Acesso.' },
  { q: 'Posso trocar a senha ou o e-mail?', a: 'Na Full Acesso, sim: você recebe o acesso completo e pode trocar a senha e o e-mail. Na conta NFA, o acesso é limitado e a troca completa dos dados não está incluída.' },
  { q: 'E o servidor e a entrega?', a: 'A região da conta aparece nos detalhes antes da compra. Depois do PIX confirmado, os dados (contas ou keys) chegam no seu pedido, em Minhas compras.' },
  { q: 'Qual o valor mínimo na carteira e como uso o cupom?', a: 'O depósito mínimo na carteira é de R$ 5,00. O cupom de lançamento dá 20% de desconto: valide na aba Cupons da sua conta.' },
  { q: 'Deu algum problema ou ficou com dúvida?', a: 'Abra um ticket no nosso Discord e a gente te ajuda.' },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="duvidas" aria-labelledby="faq-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24">
      <div className="grid gap-8 border-t border-line pt-12 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <h2 id="faq-title" className="font-display text-2xl font-bold tracking-tight">Perguntas de quem vai comprar</h2>
          <p className="mt-2 text-sm text-zinc-400">Respostas rápidas para as dúvidas mais comuns.</p>
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {ITEMS.map((it, i) => {
            const on = open === i;
            return (
              <li key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold transition hover:bg-bg"
                >
                  {it.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round" className={`shrink-0 text-zinc-500 transition ${on ? 'rotate-180' : ''}`} aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {on && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">
                    {it.a}
                    {i === ITEMS.length - 1 && (
                      <>
                        {' '}
                        <a href={DISCORD_SUPPORT} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-light underline underline-offset-2 hover:text-white">
                          Abrir ticket no Discord
                        </a>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
