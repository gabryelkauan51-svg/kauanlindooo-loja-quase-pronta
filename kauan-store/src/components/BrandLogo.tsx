import { useState } from 'react';
import { BRAND } from '../lib/brand';

const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Kauan Store';

function Crown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5L3 8z" />
    </svg>
  );
}

interface Props {
  /** Classes de altura do logotipo (a largura segue a proporção original). */
  className?: string;
  /** Se falhar ao carregar: mostra o ícone com o nome (true) ou nada (false). */
  textFallback?: boolean;
}

/** Logotipo da Kauan Store. Se a imagem falhar, cai para ícone de coroa + nome. */
export default function BrandLogo({ className = 'h-12', textFallback = true }: Props) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={BRAND.logo}
        alt={STORE_NAME}
        decoding="async"
        onError={() => setFailed(true)}
        className={`w-auto select-none object-contain ${className}`}
        draggable={false}
      />
    );
  }
  if (!textFallback) return null;

  const [first, ...rest] = STORE_NAME.split(' ');
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-light ring-1 ring-brand/30">
        <Crown />
      </span>
      <span className="font-display text-xl font-bold italic tracking-tight">
        {first}
        {rest.length > 0 && <span className="text-brand-light"> {rest.join(' ')}</span>}
      </span>
    </span>
  );
}
