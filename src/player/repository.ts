/**
 * Camada de persistência.
 *
 * Hoje grava no aparelho com AsyncStorage. Toda a aplicação fala só com
 * `playerRepository`, então trocar por uma API depois é mexer só neste arquivo.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerState } from './types';
import { today } from './progression';

const KEY = 'vocabpeaks:player:v1';
export const STATE_VERSION = 1;

export function createPlayer(): PlayerState {
  return {
    version: STATE_VERSION,
    name: 'Estudante',
    xp: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayed: null,
    levels: {},
    words: {},
    achievements: [],
    characters: ['bia'],
    equipped: 'bia',
    daily: { lastClaim: null, index: 0 },
    missions: { day: today(), progress: {}, claimed: [] },
    stats: { levelsPlayed: 0, correctDrops: 0, wrongDrops: 0 },
    settings: { sound: true, reduceMotion: false },
    onboarded: false,
  };
}

/**
 * Completa um estado salvo com os campos que faltarem.
 *
 * Um save antigo não pode quebrar o app depois de uma atualização: o que não
 * existir vira o padrão, e o resto do progresso é preservado.
 */
function migrate(raw: unknown): PlayerState {
  const base = createPlayer();
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Partial<PlayerState>;

  return {
    ...base,
    ...saved,
    version: STATE_VERSION,
    levels: saved.levels ?? base.levels,
    words: saved.words ?? base.words,
    achievements: saved.achievements ?? base.achievements,
    // A Bia é da casa: quem já jogava antes dela existir também a recebe.
    characters: [...new Set(['bia', ...(saved.characters ?? [])])],
    equipped: saved.equipped ?? base.equipped,
    daily: { ...base.daily, ...(saved.daily ?? {}) },
    missions: { ...base.missions, ...(saved.missions ?? {}) },
    stats: { ...base.stats, ...(saved.stats ?? {}) },
    settings: { ...base.settings, ...(saved.settings ?? {}) },
  };
}

export const playerRepository = {
  async load(): Promise<PlayerState> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return createPlayer();
      return migrate(JSON.parse(raw));
    } catch {
      // Save corrompido não pode impedir o jogo de abrir.
      return createPlayer();
    }
  },

  async save(state: PlayerState): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Sem espaço ou storage indisponível: o jogo segue, só não persiste.
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      /* nada a fazer */
    }
  },
};
