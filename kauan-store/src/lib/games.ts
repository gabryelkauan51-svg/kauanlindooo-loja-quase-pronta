import type { GameSlug } from '../types';
import { GAME_BANNERS, GAME_COVERS } from './covers';

export interface GameInfo {
  slug: GameSlug;
  label: string;
  subtitle: string;
  /** Cor de apoio do jogo (usada só em detalhes discretos). */
  accent: string;
  /** Ícone de último recurso, quando a imagem não carrega. */
  emoji: string;
  cover: string;
  coverPos: string;
  banner?: string;
}

type GameBase = Omit<GameInfo, 'cover' | 'coverPos' | 'banner'>;

const BASE: GameBase[] = [
  { slug: 'valorant', label: 'Valorant', subtitle: 'FPS tático · Skins e agentes', accent: '#FF4655', emoji: '🎯' },
  { slug: 'fortnite', label: 'Fortnite', subtitle: 'Battle royale · Skins e V-Bucks', accent: '#A855F7', emoji: '🪂' },
  { slug: 'steam', label: 'Steam', subtitle: 'Conta Global', accent: '#38BDF8', emoji: '💨' },
  { slug: 'roblox', label: 'Roblox', subtitle: 'Contas com Robux e itens', accent: '#F43F5E', emoji: '🧱' },
  { slug: 'league-of-legends', label: 'League of Legends', subtitle: 'MOBA · Campeões e skins', accent: '#C8A04A', emoji: '⚔️' },
  { slug: 'clash-royale', label: 'Clash Royale', subtitle: 'Estratégia · Cartas e troféus', accent: '#3B82F6', emoji: '👑' },
  { slug: 'genshin-impact', label: 'Genshin Impact', subtitle: 'RPG · Personagens e gemas', accent: '#2DD4BF', emoji: '✨' },
  { slug: 'brawl-stars', label: 'Brawl Stars', subtitle: 'Ação · Brawlers e troféus', accent: '#FACC15', emoji: '⭐' },
  { slug: 'rocket-league', label: 'Rocket League', subtitle: 'Futebol de carros · Itens', accent: '#0EA5E9', emoji: '🚗' },
  { slug: 'epic-games', label: 'Epic Games', subtitle: 'Conta Global', accent: '#E4E4E7', emoji: '🎮' },
  { slug: 'ea', label: 'EA', subtitle: 'EA Play Completo', accent: '#F97316', emoji: '🏆' },
  { slug: 'ubisoft', label: 'Ubisoft', subtitle: 'Uplay Completo', accent: '#60A5FA', emoji: '🌀' },
];

export const GAMES: GameInfo[] = BASE.map((g) => ({
  ...g,
  cover: GAME_COVERS[g.slug].src,
  coverPos: GAME_COVERS[g.slug].pos,
  banner: GAME_BANNERS[g.slug],
}));

export function gameInfo(slug: GameSlug): GameInfo {
  return GAMES.find((g) => g.slug === slug) ?? GAMES[0];
}

export function gameEmoji(slug: GameSlug): string {
  return gameInfo(slug).emoji;
}
