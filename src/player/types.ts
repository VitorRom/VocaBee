/** Estado do jogador — tudo que sobrevive a fechar o app. */

export type LevelRecord = {
  /** 1 a 3. Guardamos sempre o melhor resultado. */
  stars: number;
  bestMoves: number;
};

export type WordRecord = {
  /** Quantas vezes o jogador abriu o verbete desta palavra. */
  views: number;
  /** ISO date do primeiro contato. */
  firstSeen: string;
  favorite: boolean;
};

export type Settings = {
  sound: boolean;
  /** Corta animações não essenciais. Também alimentado pelo sistema. */
  reduceMotion: boolean;
};

export type DailyState = {
  /** 'YYYY-MM-DD' do último resgate. */
  lastClaim: string | null;
  /** Posição no ciclo de 7 dias (0..6). */
  index: number;
};

export type MissionState = {
  /** Dia a que estas missões pertencem. */
  day: string;
  progress: Record<string, number>;
  claimed: string[];
};

export type PlayerState = {
  /** Versão do formato salvo — permite migrar sem perder o progresso. */
  version: number;
  name: string;
  xp: number;
  coins: number;

  streak: number;
  bestStreak: number;
  lastPlayed: string | null;

  levels: Record<number, LevelRecord>;
  words: Record<string, WordRecord>;

  achievements: string[];
  characters: string[];
  equipped: string;

  daily: DailyState;
  missions: MissionState;

  stats: {
    levelsPlayed: number;
    correctDrops: number;
    wrongDrops: number;
  };

  settings: Settings;
  onboarded: boolean;
};

/** Resumo de uma partida terminada, do gameplay para o meta-jogo. */
export type LevelOutcome = {
  level: number;
  won: boolean;
  movesUsed: number;
  moveBudget: number;
  movesLeft: number;
  correctDrops: number;
  wrongDrops: number;
  /** Palavras cujo verbete o jogador abriu nesta partida. */
  wordsSeen: string[];
};

/** O que a partida rendeu, já calculado. */
export type LevelReward = {
  stars: number;
  xp: number;
  coins: number;
  newWords: string[];
  accuracy: number;
  perfect: boolean;
  leveledUp: boolean;
  newPlayerLevel: number;
};
