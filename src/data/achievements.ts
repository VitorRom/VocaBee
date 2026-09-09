import { PlayerState } from '../player/types';
import { totalStars } from '../player/progression';
import { IconName } from '../ui/Icon';

/**
 * Conquistas.
 *
 * Cada uma sabe sozinha se já foi alcançada (`reached`) e quanto vale. Repare
 * no que é premiado: fases concluídas, estrelas, constância e — sobretudo —
 * palavras consultadas. Nenhuma conquista premia rapidez ou número de toques.
 */
export type Achievement = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  xp: number;
  coins: number;
  /** Progresso atual e alvo, para desenhar a barrinha. */
  progress: (p: PlayerState) => { current: number; target: number };
};

const levelsDone = (p: PlayerState) => Object.keys(p.levels).length;
const wordsSeen = (p: PlayerState) => Object.keys(p.words).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-win',
    icon: 'trophy',
    title: 'Primeira vitória',
    description: 'Complete sua primeira fase.',
    xp: 100,
    coins: 50,
    progress: (p) => ({ current: levelsDone(p), target: 1 }),
  },
  {
    id: 'ten-words',
    icon: 'book',
    title: 'Curioso',
    description: 'Descubra o significado de 10 palavras.',
    xp: 100,
    coins: 50,
    progress: (p) => ({ current: wordsSeen(p), target: 10 }),
  },
  {
    id: 'fifty-words',
    icon: 'grid',
    title: 'Vocabulário em construção',
    description: 'Descubra o significado de 50 palavras.',
    xp: 300,
    coins: 150,
    progress: (p) => ({ current: wordsSeen(p), target: 50 }),
  },
  {
    id: 'five-levels',
    icon: 'deck',
    title: 'Pegando o ritmo',
    description: 'Complete 5 fases.',
    xp: 150,
    coins: 80,
    progress: (p) => ({ current: levelsDone(p), target: 5 }),
  },
  {
    id: 'fifteen-stars',
    icon: 'star',
    title: 'Colecionador de estrelas',
    description: 'Conquiste 15 estrelas.',
    xp: 250,
    coins: 120,
    progress: (p) => ({ current: totalStars(p.levels), target: 15 }),
  },
  {
    id: 'streak-3',
    icon: 'flame',
    title: 'Três dias seguidos',
    description: 'Jogue em 3 dias diferentes seguidos.',
    xp: 200,
    coins: 100,
    progress: (p) => ({ current: p.bestStreak, target: 3 }),
  },
  {
    id: 'streak-7',
    icon: 'flame',
    title: 'Uma semana inteira',
    description: 'Jogue em 7 dias seguidos.',
    xp: 500,
    coins: 200,
    progress: (p) => ({ current: p.bestStreak, target: 7 }),
  },
  {
    id: 'flawless',
    icon: 'target',
    title: 'Sem titubear',
    description: 'Termine uma fase sem nenhum erro.',
    xp: 200,
    coins: 100,
    progress: (p) => ({
      current: p.stats.levelsPlayed > 0 && p.stats.wrongDrops === 0 ? 1 : 0,
      target: 1,
    }),
  },
];

export function isUnlocked(a: Achievement, p: PlayerState): boolean {
  const { current, target } = a.progress(p);
  return current >= target;
}

/** Conquistas alcançadas que ainda não foram registradas no save. */
export function pendingAchievements(p: PlayerState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => isUnlocked(a, p) && !p.achievements.includes(a.id));
}
