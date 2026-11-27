import type { GameSlug } from '../types';

export interface GameCoverAsset {
  /** Imagem em /public/img/games (ou URL válida). */
  src: string;
  /** Enquadramento dentro do cartão (CSS object-position). */
  pos: string;
}

/**
 * Mapeamento explícito de capa para CADA jogo/plataforma.
 * O tipo Record<GameSlug, ...> obriga o TypeScript a acusar erro de build
 * se um jogo novo for adicionado sem capa.
 */
export const GAME_COVERS: Record<GameSlug, GameCoverAsset> = {
  valorant: { src: '/img/games/valorant.jpg', pos: 'center 30%' },
  fortnite: { src: '/img/games/fortnite.jpg', pos: 'center 18%' },
  steam: { src: '/img/games/steam.jpg', pos: 'center' },
  roblox: { src: '/img/games/roblox.jpg', pos: 'center' },
  'league-of-legends': { src: '/img/games/league-of-legends.jpg', pos: 'center' },
  'clash-royale': { src: '/img/games/clash-royale.jpg', pos: 'center 22%' },
  'genshin-impact': { src: '/img/games/genshin-impact.jpg', pos: 'center 55%' },
  'brawl-stars': { src: '/img/games/brawl-stars.jpg', pos: 'center 85%' },
  'rocket-league': { src: '/img/games/rocket-league.jpg', pos: 'center 28%' },
  'epic-games': { src: '/img/games/epic-games.jpg', pos: 'center' },
  ea: { src: '/img/games/ea.jpg', pos: 'center' },
  ubisoft: { src: '/img/games/ubisoft.jpg', pos: 'center' },
};

/** Banner largo, usado no topo do catálogo (só o Valorant tem). */
export const GAME_BANNERS: Partial<Record<GameSlug, string>> = {
  valorant: '/img/valorant-full-acesso.jpg',
};
