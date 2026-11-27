import { useEffect, useState } from 'react';
import { gameInfo } from '../lib/games';
import type { GameSlug } from '../types';

interface Props {
  game: GameSlug;
  alt?: string;
  /** Classes do <img>. */
  imgClassName?: string;
  /** Tamanho do ícone de último recurso. */
  iconClassName?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Mostra a capa do jogo. O ícone genérico só aparece como último recurso,
 * quando a imagem realmente falha ao carregar.
 */
export default function GameCover({
  game,
  alt = '',
  imgClassName = 'h-full w-full object-cover',
  iconClassName = 'text-6xl',
  loading = 'lazy',
}: Props) {
  const info = gameInfo(game);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [info.cover]);

  if (!info.cover || failed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `radial-gradient(circle at 70% 0%, ${info.accent}22, transparent 65%), linear-gradient(135deg, #17171e, #0B0B0F)` }}
      >
        <span className={`${iconClassName} opacity-80`} aria-hidden="true">
          {info.emoji}
        </span>
      </div>
    );
  }

  return (
    <img
      src={info.cover}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={imgClassName}
      style={{ objectPosition: info.coverPos }}
    />
  );
}
