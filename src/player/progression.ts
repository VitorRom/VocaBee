/**
 * Regras de progressão — XP, estrelas, moedas, streak.
 *
 * Tudo aqui é função pura, sem React e sem storage, pelo mesmo motivo do
 * `game/engine.ts`: dá para provar o comportamento rodando com node.
 */

import { LevelOutcome, LevelReward, PlayerState } from './types';

export const XP_BASE = 100;
export const XP_STEP = 50;

/** XP necessário para sair do nível `n` para o `n + 1`. */
export function xpForLevel(n: number): number {
  return XP_BASE + (n - 1) * XP_STEP;
}

/** Converte XP acumulado em nível + progresso dentro do nível. */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

/** Sobrar isto do orçamento é ter jogado com folga. */
const SPARE = 0.12;

/**
 * As estrelas medem as duas coisas que o jogo ensina: acertar a categoria de
 * primeira e não desperdiçar movimentos.
 *
 * - vencer vale a primeira estrela;
 * - vencer sem errar nenhuma carta vale mais uma;
 * - vencer com movimentos de sobra vale mais uma.
 *
 * Só a economia não servia: dava para terminar com 100% de acerto e duas
 * estrelas, o que não faz sentido num jogo de vocabulário.
 */
export function starsFor(movesLeft: number, budget: number, wrongDrops = 0): number {
  if (budget <= 0) return 1;
  const spare = movesLeft / budget >= SPARE;
  return 1 + (wrongDrops === 0 ? 1 : 0) + (spare ? 1 : 0);
}

export const XP_LEVEL_CLEAR = 50;
export const XP_PERFECT = 20;
export const XP_PER_WORD = 5;
export const COINS_LEVEL_CLEAR = 30;
export const COINS_PER_STAR = 10;

/**
 * Quanto a partida rendeu.
 *
 * Repare no que é premiado: economia de movimentos (estrelas), jogar sem
 * chutar (perfeito) e **palavras novas consultadas**. Nada recompensa
 * velocidade ou quantidade de toques — clicar rápido não rende nada.
 */
export function rewardFor(player: PlayerState, outcome: LevelOutcome): LevelReward {
  const previous = levelFromXp(player.xp).level;

  const stars = outcome.won ? starsFor(outcome.movesLeft, outcome.moveBudget, outcome.wrongDrops) : 0;
  const total = outcome.correctDrops + outcome.wrongDrops;
  const accuracy = total === 0 ? 1 : outcome.correctDrops / total;
  const perfect = outcome.won && outcome.wrongDrops === 0;

  const newWords = outcome.wordsSeen.filter((w) => !player.words[w]);

  const xp = outcome.won
    ? XP_LEVEL_CLEAR + (perfect ? XP_PERFECT : 0) + newWords.length * XP_PER_WORD
    : newWords.length * XP_PER_WORD;

  const coins = outcome.won ? COINS_LEVEL_CLEAR + (stars - 1) * COINS_PER_STAR : 0;

  const after = levelFromXp(player.xp + xp).level;

  return {
    stars,
    xp,
    coins,
    newWords,
    accuracy,
    perfect,
    leveledUp: after > previous,
    newPlayerLevel: after,
  };
}

// ------------------------------------------------------------------- datas

/** 'YYYY-MM-DD' no fuso do aparelho. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + 'T00:00:00');
  const b = Date.parse(to + 'T00:00:00');
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * Atualiza a sequência de dias.
 *
 * Perder um dia zera a contagem, mas o recorde fica guardado e a interface
 * trata isso como recomeço, não como punição — o objetivo é voltar a estudar,
 * não castigar quem faltou.
 */
export function bumpStreak(
  streak: number,
  bestStreak: number,
  lastPlayed: string | null,
  day: string,
): { streak: number; bestStreak: number } {
  if (lastPlayed === day) return { streak, bestStreak };
  const gap = lastPlayed ? daysBetween(lastPlayed, day) : Infinity;
  const next = gap === 1 ? streak + 1 : 1;
  return { streak: next, bestStreak: Math.max(bestStreak, next) };
}

/** Até que fase o jogador pode entrar: a maior concluída + 1. */
export function unlockedLevel(levels: Record<number, unknown>): number {
  const done = Object.keys(levels).map(Number).filter((n) => !Number.isNaN(n));
  return done.length === 0 ? 1 : Math.max(...done) + 1;
}

export function totalStars(levels: Record<number, { stars: number }>): number {
  return Object.values(levels).reduce((a, l) => a + l.stars, 0);
}
