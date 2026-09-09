/** Ciclo de 7 dias da recompensa diária. O sétimo dia é o baú. */
export type DailyReward = {
  day: number;
  coins: number;
  xp: number;
  chest?: boolean;
};

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 20, xp: 0 },
  { day: 2, coins: 30, xp: 0 },
  { day: 3, coins: 50, xp: 20 },
  { day: 4, coins: 75, xp: 20 },
  { day: 5, coins: 100, xp: 40 },
  { day: 6, coins: 150, xp: 40 },
  { day: 7, coins: 300, xp: 100, chest: true },
];
