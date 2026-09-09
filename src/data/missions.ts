/**
 * Missões diárias.
 *
 * O progresso é contado por métrica (`metric`) e zerado a cada dia. As três
 * métricas premiam terminar fases, descobrir palavras e jogar bem — nunca
 * velocidade.
 */
import { IconName } from '../ui/Icon';

export type MissionMetric = 'levels' | 'words' | 'stars';

export type Mission = {
  id: string;
  icon: IconName;
  title: string;
  metric: MissionMetric;
  target: number;
  xp: number;
  coins: number;
};

export const DAILY_MISSIONS: Mission[] = [
  {
    id: 'daily-levels',
    icon: 'target',
    title: 'Complete 3 fases',
    metric: 'levels',
    target: 3,
    xp: 100,
    coins: 40,
  },
  {
    id: 'daily-words',
    icon: 'book',
    title: 'Descubra 10 palavras',
    metric: 'words',
    target: 10,
    xp: 100,
    coins: 40,
  },
  {
    id: 'daily-stars',
    icon: 'star',
    title: 'Conquiste 5 estrelas',
    metric: 'stars',
    target: 5,
    xp: 150,
    coins: 60,
  },
];
