import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Achievement, pendingAchievements } from '../data/achievements';
import { CHARACTER_BY_ID } from '../data/characters';
import { DAILY_REWARDS } from '../data/dailyRewards';
import { DAILY_MISSIONS, Mission } from '../data/missions';
import { bumpStreak, daysBetween, levelFromXp, rewardFor, today, unlockedLevel } from './progression';
import { createPlayer, playerRepository } from './repository';
import { LevelOutcome, LevelReward, PlayerState, Settings } from './types';

type Ctx = {
  player: PlayerState;
  ready: boolean;
  /** Nível de jogador (XP), progresso dentro dele e quanto falta. */
  level: { level: number; into: number; need: number };
  /** Maior fase liberada na jornada. */
  nextLevel: number;

  finishLevel: (outcome: LevelOutcome) => { reward: LevelReward; unlocked: Achievement[] };
  claimDaily: () => { coins: number; xp: number; day: number } | null;
  claimMission: (id: string) => boolean;
  buyCharacter: (id: string) => boolean;
  equipCharacter: (id: string) => void;
  toggleFavorite: (word: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setName: (name: string) => void;
  finishOnboarding: () => void;
  resetProgress: () => void;
};

const PlayerContext = createContext<Ctx | null>(null);

/** Missões viram um dia novo: o progresso zera, os resgates também. */
function rollMissions(state: PlayerState, day: string): PlayerState {
  if (state.missions.day === day) return state;
  return { ...state, missions: { day, progress: {}, claimed: [] } };
}

/** Concede automaticamente as conquistas já alcançadas. */
function grantAchievements(state: PlayerState): { state: PlayerState; unlocked: Achievement[] } {
  const unlocked = pendingAchievements(state);
  if (unlocked.length === 0) return { state, unlocked };

  return {
    state: {
      ...state,
      xp: state.xp + unlocked.reduce((a, x) => a + x.xp, 0),
      coins: state.coins + unlocked.reduce((a, x) => a + x.coins, 0),
      achievements: [...state.achievements, ...unlocked.map((a) => a.id)],
    },
    unlocked,
  };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerState>(createPlayer);
  const [ready, setReady] = useState(false);

  // Os callbacks leem daqui para nunca calcular em cima de estado velho.
  const ref = useRef(player);
  ref.current = player;

  useEffect(() => {
    let alive = true;
    (async () => {
      const loaded = await playerRepository.load();
      // Respeita "reduzir animações" do sistema já na primeira carga.
      let reduce = loaded.settings.reduceMotion;
      try {
        reduce = reduce || (await AccessibilityInfo.isReduceMotionEnabled());
      } catch {
        /* nem toda plataforma responde */
      }
      if (!alive) return;
      setPlayer({ ...loaded, settings: { ...loaded.settings, reduceMotion: reduce } });
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Grava a cada mudança, depois que a carga inicial terminou.
  useEffect(() => {
    if (ready) void playerRepository.save(player);
  }, [player, ready]);

  const commit = useCallback((next: PlayerState) => {
    ref.current = next;
    setPlayer(next);
  }, []);

  // ------------------------------------------------------------- partidas

  const finishLevel = useCallback(
    (outcome: LevelOutcome) => {
      const day = today();
      const base = rollMissions(ref.current, day);
      const reward = rewardFor(base, outcome);

      const words = { ...base.words };
      for (const w of outcome.wordsSeen) {
        words[w] = words[w]
          ? { ...words[w], views: words[w].views + 1 }
          : { views: 1, firstSeen: day, favorite: false };
      }

      const levels = { ...base.levels };
      if (outcome.won) {
        const prev = levels[outcome.level];
        levels[outcome.level] = {
          stars: Math.max(prev?.stars ?? 0, reward.stars),
          bestMoves: Math.min(prev?.bestMoves ?? Infinity, outcome.movesUsed),
        };
      }

      const streak = bumpStreak(base.streak, base.bestStreak, base.lastPlayed, day);

      const progress = { ...base.missions.progress };
      const add = (k: string, n: number) => {
        if (n > 0) progress[k] = (progress[k] ?? 0) + n;
      };
      add('levels', outcome.won ? 1 : 0);
      add('words', reward.newWords.length);
      add('stars', reward.stars);

      const next: PlayerState = {
        ...base,
        xp: base.xp + reward.xp,
        coins: base.coins + reward.coins,
        words,
        levels,
        streak: streak.streak,
        bestStreak: streak.bestStreak,
        lastPlayed: day,
        missions: { ...base.missions, progress },
        stats: {
          levelsPlayed: base.stats.levelsPlayed + 1,
          correctDrops: base.stats.correctDrops + outcome.correctDrops,
          wrongDrops: base.stats.wrongDrops + outcome.wrongDrops,
        },
      };

      const granted = grantAchievements(next);
      commit(granted.state);
      return { reward, unlocked: granted.unlocked };
    },
    [commit],
  );

  // ------------------------------------------------------- recompensa diária

  const claimDaily = useCallback(() => {
    const day = today();
    const p = ref.current;
    if (p.daily.lastClaim === day) return null;

    // Faltou um dia? O ciclo recomeça, sem drama.
    const gap = p.daily.lastClaim ? daysBetween(p.daily.lastClaim, day) : Infinity;
    const index = gap === 1 ? (p.daily.index + 1) % DAILY_REWARDS.length : 0;
    const reward = DAILY_REWARDS[index];

    commit({
      ...p,
      xp: p.xp + reward.xp,
      coins: p.coins + reward.coins,
      daily: { lastClaim: day, index },
    });
    return { coins: reward.coins, xp: reward.xp, day: reward.day };
  }, [commit]);

  const claimMission = useCallback(
    (id: string) => {
      const p = rollMissions(ref.current, today());
      const mission = DAILY_MISSIONS.find((m) => m.id === id);
      if (!mission) return false;
      if (p.missions.claimed.includes(id)) return false;
      if ((p.missions.progress[mission.metric] ?? 0) < mission.target) return false;

      commit({
        ...p,
        xp: p.xp + mission.xp,
        coins: p.coins + mission.coins,
        missions: { ...p.missions, claimed: [...p.missions.claimed, id] },
      });
      return true;
    },
    [commit],
  );

  // ------------------------------------------------------------- personagens

  const buyCharacter = useCallback(
    (id: string) => {
      const p = ref.current;
      const character = CHARACTER_BY_ID[id];
      if (!character || p.characters.includes(id) || p.coins < character.price) return false;
      commit({
        ...p,
        coins: p.coins - character.price,
        characters: [...p.characters, id],
        equipped: id,
      });
      return true;
    },
    [commit],
  );

  const equipCharacter = useCallback(
    (id: string) => {
      const p = ref.current;
      if (!p.characters.includes(id)) return;
      commit({ ...p, equipped: id });
    },
    [commit],
  );

  // ---------------------------------------------------------------- diversos

  const toggleFavorite = useCallback(
    (word: string) => {
      const p = ref.current;
      const entry = p.words[word] ?? { views: 1, firstSeen: today(), favorite: false };
      commit({ ...p, words: { ...p.words, [word]: { ...entry, favorite: !entry.favorite } } });
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const p = ref.current;
      commit({ ...p, settings: { ...p.settings, ...patch } });
    },
    [commit],
  );

  const setName = useCallback(
    (name: string) => commit({ ...ref.current, name: name.trim() || 'Estudante' }),
    [commit],
  );

  const finishOnboarding = useCallback(() => commit({ ...ref.current, onboarded: true }), [commit]);

  /**
   * Zera tudo, inclusive a apresentação e o tour da primeira partida: quem
   * apaga o progresso quer ver o jogo como quem abre pela primeira vez — é
   * assim que se grava uma demonstração.
   */
  const resetProgress = useCallback(() => commit(createPlayer()), [commit]);

  const value: Ctx = {
    player,
    ready,
    level: levelFromXp(player.xp),
    nextLevel: unlockedLevel(player.levels),
    finishLevel,
    claimDaily,
    claimMission,
    buyCharacter,
    equipCharacter,
    toggleFavorite,
    updateSettings,
    setName,
    finishOnboarding,
    resetProgress,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): Ctx {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer precisa estar dentro de <PlayerProvider>');
  return ctx;
}

/** Estado de uma missão hoje, já com progresso e se dá para resgatar. */
export function missionStatus(player: PlayerState, mission: Mission) {
  const fresh = player.missions.day === today();
  const current = fresh ? player.missions.progress[mission.metric] ?? 0 : 0;
  const claimed = fresh && player.missions.claimed.includes(mission.id);
  return {
    current: Math.min(current, mission.target),
    target: mission.target,
    done: current >= mission.target,
    claimed,
  };
}
