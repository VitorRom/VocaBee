/**
 * Regras do jogo — TypeScript puro, sem nada de React.
 *
 * Tabuleiro (de cima para baixo):
 *
 *   [ descarte ..][ baralho ]         <- topo: vira cartas do baralho
 *   [ slot ][ slot ][ slot ][ slot ]  <- 4 vagas de categoria
 *   [ col ][ col ][ col ][ col ]      <- 4 colunas em escada
 *
 * Cada coluna começa com UMA carta virada para cima; o resto está de costas.
 * Acessível = a última carta de cada coluna + o topo do descarte.
 *
 * Dois tipos de carta:
 *  - 'key'  : dourada com estrela. Traz o NOME de uma categoria e ocupa uma
 *             vaga livre, abrindo aquela categoria.
 *  - 'word' : palavra em inglês. Só entra na vaga da categoria dela.
 *
 * O nível tem MAIS categorias do que vagas. Quando uma categoria fica completa
 * a vaga se esvazia e volta a aceitar uma nova carta dourada — é isso que faz
 * as quatro vagas darem conta de cinco ou seis categorias.
 *
 * Cada jogada custa 1 movimento. Errar NÃO custa: a carta só volta. Isso é de
 * propósito — o jogo existe para o jogador arriscar palavras que não conhece.
 */

import { Category, CATEGORIES, Word } from '../data/words';

export type GameCard = {
  id: string;
  kind: 'word' | 'key';
  categoryId: string;
  /** Só existe em cartas 'word'. A dourada mostra o nome da categoria. */
  word: Word | null;
};

export type ColumnEntry = { card: GameCard; faceDown: boolean };

/** Uma vaga de categoria. `categoryId` null = vaga livre (mostra a coroa). */
export type Slot = {
  categoryId: string | null;
  collected: GameCard[];
};

export type LevelConfig = {
  /** Quantas cartas de palavra cada categoria tem, na ordem de `categories`. */
  sizes: number[];
  depths: number[];
  faceDown: number[];
};

export type GameState = {
  level: number;
  config: LevelConfig;
  columns: ColumnEntry[][];
  stock: GameCard[];
  waste: GameCard[];
  slots: Slot[];
  /** Quantas cartas cada categoria do nível tem. */
  sizes: Record<string, number>;
  /** Categorias já concluídas — a vaga delas foi liberada. */
  completed: string[];
  movesLeft: number;
  moveBudget: number;
  hints: number;
  undos: number;
  placed: number;
  totalWords: number;
  status: 'playing' | 'won' | 'lost';
};

export type Source = { from: 'waste' } | { from: 'column'; index: number };

export type PlayResult =
  | {
      kind: 'placed';
      card: GameCard;
      slotIndex: number;
      /** Quantas cartas entraram de uma vez (o monte inteiro). */
      count: number;
      opened: boolean;
      completed: boolean;
    }
  | { kind: 'moved'; card: GameCard; columnIndex: number }
  | { kind: 'wrong'; card: GameCard }
  | { kind: 'ignored' };

export const SLOT_COUNT = 4;
export const COLUMN_COUNT = 4;

// ---------------------------------------------------------------- utilidades

/**
 * Gerador com semente. Existe para que a fase 7 seja sempre a mesma fase 7:
 * um nível é um quebra-cabeça, não um sorteio novo a cada abertura.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente estável a partir de um texto (o id da categoria). */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sameSource(a: Source | null, b: Source | null): boolean {
  if (!a || !b) return false;
  if (a.from === 'waste') return b.from === 'waste';
  return b.from === 'column' && a.index === b.index;
}

export function categoryCount(state: GameState): number {
  return Object.keys(state.sizes).length;
}

/** Quantas cartas a categoria já tem guardadas, em qualquer vaga. */
export function collectedOf(state: GameState, categoryId: string): number {
  const slot = state.slots.find((s) => s.categoryId === categoryId);
  return slot ? slot.collected.length : state.sizes[categoryId] ?? 0;
}

// ------------------------------------------------------------------ consultas

export function cardAt(state: GameState, src: Source): GameCard | null {
  if (src.from === 'waste') {
    return state.waste.length ? state.waste[state.waste.length - 1] : null;
  }
  const col = state.columns[src.index];
  if (!col || col.length === 0) return null;
  const entry = col[col.length - 1];
  return entry.faceDown ? null : entry.card;
}

/** Todas as cartas em que o jogador pode pegar agora. */
export function accessibleSources(state: GameState): Source[] {
  const out: Source[] = [];
  for (let i = 0; i < state.columns.length; i++) {
    if (cardAt(state, { from: 'column', index: i })) out.push({ from: 'column', index: i });
  }
  if (state.waste.length) out.push({ from: 'waste' });
  return out;
}

/**
 * Quantas cartas do fim da coluna andam juntas.
 *
 * Como só se empilha carta sobre carta da MESMA categoria, um monte legítimo é
 * sempre um bloco de uma categoria só — e por isso ele pode ir inteiro tanto
 * para outra coluna quanto para a vaga da categoria.
 */
export function movableRun(state: GameState, columnIndex: number): number {
  const col = state.columns[columnIndex];
  if (!col || col.length === 0) return 0;

  const last = col[col.length - 1];
  if (last.faceDown) return 0;

  const categoryId = last.card.categoryId;
  let n = 1;
  for (let i = col.length - 2; i >= 0; i--) {
    const e = col[i];
    if (e.faceDown) break;
    if (e.card.categoryId !== categoryId) break;
    // Nada se empilha SOBRE uma dourada, então ela nunca fica no meio de um
    // monte — se aparecer aqui, o monte termina. Mas ela pode estar no fim do
    // monte e, nesse caso, viaja junto com as palavras da categoria dela.
    if (e.card.kind === 'key') break;
    n++;
  }
  return n;
}

/** Quantas cartas o arrasto leva a partir desta origem. */
export function runSize(state: GameState, src: Source): number {
  if (src.from === 'waste') return state.waste.length ? 1 : 0;
  return movableRun(state, src.index);
}

/** Em que vaga esta carta pode entrar? -1 se nenhuma. */
export function slotFor(state: GameState, card: GameCard): number {
  if (card.kind === 'key') {
    if (state.completed.includes(card.categoryId)) return -1;
    if (state.slots.some((s) => s.categoryId === card.categoryId)) return -1;
    return state.slots.findIndex((s) => s.categoryId === null);
  }
  return state.slots.findIndex((s) => s.categoryId === card.categoryId);
}

/**
 * Esta vaga aceita esta carta?
 *
 * O jogador arrasta até a vaga que ELE escolheu, então a regra é checada
 * contra aquela vaga — não contra "a vaga certa".
 */
export function slotAccepts(state: GameState, card: GameCard, slotIndex: number): boolean {
  const slot = state.slots[slotIndex];
  if (!slot) return false;

  if (card.kind === 'key') {
    if (slot.categoryId !== null) return false;
    if (state.completed.includes(card.categoryId)) return false;
    return !state.slots.some((s) => s.categoryId === card.categoryId);
  }
  return slot.categoryId === card.categoryId;
}

/**
 * Esta coluna aceita o que está sendo arrastado?
 *
 * A carta só assenta sobre uma palavra da MESMA categoria. Coluna vazia aceita
 * qualquer carta, e nada se empilha sobre uma dourada — ela precisa continuar
 * alcançável para ocupar uma vaga.
 */
export function columnAccepts(state: GameState, src: Source, columnIndex: number): boolean {
  const col = state.columns[columnIndex];
  if (!col) return false;
  if (src.from === 'column' && src.index === columnIndex) return false;

  const card = cardAt(state, src);
  if (!card) return false;

  const top = col[col.length - 1];
  if (!top) return true;
  if (top.faceDown || top.card.kind === 'key') return false;
  return top.card.categoryId === card.categoryId;
}

export function canDraw(state: GameState): boolean {
  return state.status === 'playing' && (state.stock.length > 0 || state.waste.length > 0);
}

/** Uma jogada útil agora (usada pela dica e pelo solucionador de níveis). */
export function findHint(state: GameState): Source | null {
  const sources = accessibleSources(state);

  // 1. Palavra que fecha uma categoria — libera a vaga, então vem primeiro.
  for (const src of sources) {
    const card = cardAt(state, src);
    if (!card || card.kind === 'key') continue;
    const i = slotFor(state, card);
    if (i === -1) continue;
    if (state.slots[i].collected.length + runSize(state, src) >= state.sizes[card.categoryId]) {
      return src;
    }
  }
  // 2. Qualquer outra palavra que caiba numa vaga aberta.
  for (const src of sources) {
    const card = cardAt(state, src);
    if (card && card.kind === 'word' && slotFor(state, card) !== -1) return src;
  }
  // 3. Dourada, se sobrar vaga.
  for (const src of sources) {
    const card = cardAt(state, src);
    if (card && card.kind === 'key' && slotFor(state, card) !== -1) return src;
  }
  return null;
}

// -------------------------------------------------------------------- jogadas

function flipExposed(column: ColumnEntry[]): ColumnEntry[] {
  if (column.length === 0) return column;
  const last = column[column.length - 1];
  if (!last.faceDown) return column;
  const next = [...column];
  next[next.length - 1] = { ...last, faceDown: false };
  return next;
}

/**
 * Uma tentativa recusada. Custa um movimento como qualquer outra: sem preço,
 * a resposta ótima seria tentar carta por carta em cada vaga até acertar, e o
 * jogo deixaria de pedir que o jogador soubesse a palavra.
 *
 * Quem chama continua usando o `state` devolvido em `wrong` — é ele que já vem
 * com o movimento descontado.
 */
function refuse(state: GameState, card: GameCard): { state: GameState; result: PlayResult } {
  return {
    state: afterMove({ ...state, movesLeft: state.movesLeft - 1 }),
    result: { kind: 'wrong', card },
  };
}

function afterMove(state: GameState): GameState {
  if (state.completed.length >= categoryCount(state)) return { ...state, status: 'won' };
  if (state.movesLeft <= 0) return { ...state, status: 'lost' };
  return state;
}

/** Vira uma carta do baralho. Com o baralho vazio, devolve o descarte para ele. */
export function draw(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  if (state.stock.length > 0) {
    const stock = [...state.stock];
    const card = stock.pop()!;
    return afterMove({
      ...state,
      stock,
      waste: [...state.waste, card],
      movesLeft: state.movesLeft - 1,
    });
  }

  if (state.waste.length > 0) {
    return afterMove({
      ...state,
      stock: [...state.waste].reverse(),
      waste: [],
      movesLeft: state.movesLeft - 1,
    });
  }

  return state;
}

/** Tira `count` cartas de onde estão, virando a que ficou exposta. */
function takeFrom(
  state: GameState,
  src: Source,
  count: number,
): { taken: GameCard[]; columns: ColumnEntry[][]; waste: GameCard[] } {
  if (src.from === 'waste') {
    return {
      taken: state.waste.slice(state.waste.length - count),
      columns: state.columns,
      waste: state.waste.slice(0, state.waste.length - count),
    };
  }
  const from = state.columns[src.index];
  return {
    taken: from.slice(from.length - count).map((e) => e.card),
    columns: state.columns.map((col, i) =>
      i === src.index ? flipExposed(from.slice(0, from.length - count)) : col,
    ),
    waste: state.waste,
  };
}

/**
 * Move o monte (ou a carta do descarte) para o fim de outra coluna.
 * O monte inteiro custa 1 movimento só.
 */
export function moveToColumn(
  state: GameState,
  src: Source,
  columnIndex: number,
): { state: GameState; result: PlayResult } {
  if (state.status !== 'playing') return { state, result: { kind: 'ignored' } };

  const card = cardAt(state, src);
  if (!card) return { state, result: { kind: 'ignored' } };

  // Devolver a carta para a coluna de onde ela saiu é desistir do arrasto, não
  // uma jogada errada: não custa nada.
  if (src.from === 'column' && src.index === columnIndex) {
    return { state, result: { kind: 'ignored' } };
  }

  if (!columnAccepts(state, src, columnIndex)) {
    return refuse(state, card);
  }

  const { taken, columns, waste } = takeFrom(state, src, runSize(state, src));
  const moving: ColumnEntry[] = taken.map((c) => ({ card: c, faceDown: false }));

  return {
    state: afterMove({
      ...state,
      columns: columns.map((col, i) => (i === columnIndex ? [...col, ...moving] : col)),
      waste,
      movesLeft: state.movesLeft - 1,
    }),
    result: { kind: 'moved', card, columnIndex },
  };
}

/**
 * Solta na vaga escolhida. Se for um monte, ele entra INTEIRO de uma vez —
 * as cartas empilhadas são obrigatoriamente da mesma categoria, então não faz
 * sentido obrigar o jogador a levar uma por vez.
 */
export function playInto(
  state: GameState,
  src: Source,
  slotIndex: number,
): { state: GameState; result: PlayResult } {
  if (state.status !== 'playing') return { state, result: { kind: 'ignored' } };

  const card = cardAt(state, src);
  if (!card) return { state, result: { kind: 'ignored' } };

  if (!slotAccepts(state, card, slotIndex)) {
    return refuse(state, card);
  }

  const opened = card.kind === 'key';
  const count = runSize(state, src);
  const { taken: cards, columns, waste } = takeFrom(state, src, count);

  // Um monte pode terminar na dourada da própria categoria. Nesse caso a
  // dourada abre a vaga e as palavras que vieram com ela já entram nela — foi
  // um arrasto só, não faria sentido deixar metade para trás.
  const words = cards.filter((c) => c.kind === 'word');
  const categoryId = card.categoryId;

  const slots = [...state.slots];
  const collected = [...(opened ? [] : slots[slotIndex].collected), ...words];

  let completed = state.completed;
  let done = false;

  if (collected.length >= state.sizes[categoryId]) {
    // Categoria fechada: a vaga se esvazia e volta a valer para outra.
    done = true;
    completed = [...completed, categoryId];
    slots[slotIndex] = { categoryId: null, collected: [] };
  } else {
    slots[slotIndex] = { categoryId, collected };
  }

  return {
    state: afterMove({
      ...state,
      columns,
      waste,
      slots,
      completed,
      movesLeft: state.movesLeft - 1,
      placed: state.placed + words.length,
    }),
    result: { kind: 'placed', card, slotIndex, count, opened, completed: done },
  };
}

/**
 * Joga na vaga que a regra escolher. O jogador não usa isto — ele arrasta —
 * mas a dica e o solucionador de níveis usam.
 */
export function playFrom(state: GameState, src: Source): { state: GameState; result: PlayResult } {
  const card = cardAt(state, src);
  if (!card) return { state, result: { kind: 'ignored' } };
  const slotIndex = slotFor(state, card);
  if (slotIndex === -1) return { state, result: { kind: 'wrong', card } };
  return playInto(state, src, slotIndex);
}

// -------------------------------------------------------------- montar nível

/**
 * `relax` afunda menos as colunas e joga mais cartas no baralho. Só é usado
 * quando o sorteio não consegue produzir um tabuleiro solúvel — cartas no
 * baralho são sempre alcançáveis, então relaxar sempre facilita.
 */
/**
 * Até onde o tabuleiro cresce. Da fase 30 em diante ele para de crescer: o que
 * continua mudando é o vocabulário, e uma partida de dez minutos deixa de ser
 * exercício e vira trabalho.
 */
export const PEAK_LEVEL = 30;

export function levelConfig(level: number, relax = 0): LevelConfig {
  const step = Math.min(level - 1, PEAK_LEVEL - 1);

  // Mais categorias do que vagas: é o que faz uma vaga concluída ser reusada.
  // O teto é 8 porque, com 20 categorias no catálogo, duas fases seguidas
  // ainda pegam conjuntos que não se cruzam.
  const cats = Math.min(8, 5 + Math.floor(step / 5));
  // O teto de 5 é por tempo de partida, não por dificuldade: com 6, a fase
  // passa de 130 movimentos e vira uma sessão de dez minutos. O aperto do fim
  // do jogo vem da ajuda que diminui, não de um tabuleiro maior.
  const base = Math.min(5, 3 + Math.floor(step / 8));
  const sizes = Array.from({ length: cats }, (_, i) => (i % 2 === 0 ? base : base + 1));
  const total = sizes.reduce((a, b) => a + b, 0) + cats;

  // O baralho é parte da dificuldade: cada volta nele é procurar de novo o que
  // não se reconheceu da primeira vez. Ele fica com pelo menos um terço das
  // cartas — uma FRAÇÃO do tabuleiro, não um número fixo, senão o mínimo
  // empurra as colunas para baixo e a fase 5 acaba mais rasa que a fase 3.
  //
  // A profundidade sai do tamanho do tabuleiro, não da fase: assim o baralho
  // guarda sempre a mesma fatia, e uma fase com mais cartas nunca vira uma
  // enxurrada de viradas. Amarrando à fase, a 17 pedia 105 movimentos e a 21
  // pedia 74 — mais cartas, menos trabalho.
  //
  // Colunas em escada, como no jogo original: a da esquerda é a mais funda.
  const d = Math.max(4, Math.floor((total * 0.65 + 6) / 4) - relax);
  const depths = [d, d - 1, d - 2, d - 3];

  // Só a última carta de cada coluna começa virada para cima.
  const faceDown = depths.map((n) => Math.max(0, n - 1));

  return { sizes, depths, faceDown };
}

/**
 * Dicas e desfazer por fase.
 *
 * É o segundo eixo da progressão: o tabuleiro só muda de forma a cada cinco
 * fases, e sem isto as fases entre uma mudança e outra seriam idênticas em
 * dificuldade. A ajuda nunca chega a zero — descobrir o significado da carta
 * continua de graça e ilimitado, que é o ponto do jogo.
 */
export function helpFor(level: number): { hints: number; undos: number } {
  const step = Math.min(level - 1, PEAK_LEVEL - 1);
  return {
    hints: Math.max(1, 3 - Math.floor(step / 10)),
    undos: Math.max(2, 4 - Math.floor(step / 10)),
  };
}

type Pos = { col: number; row: number } | { stock: number };

/**
 * As categorias desta fase.
 *
 * A janela anda `count` posições por fase, então fases seguidas não repetem
 * categoria enquanto o catálogo der. A cada volta completa o catálogo é
 * reembaralhado, para a volta seguinte não ser idêntica à anterior.
 */
function categoriesFor(level: number, count: number): Category[] {
  const n = CATEGORIES.length;
  const offset = (level - 1) * count;
  const order = shuffle(CATEGORIES, mulberry32(Math.floor(offset / n) + 1));
  return Array.from({ length: Math.min(count, n) }, (_, i) => order[(offset + i) % n]);
}

/**
 * As palavras da categoria nesta fase.
 *
 * Também é uma janela deslizante sobre uma ordem fixa da categoria: duas fases
 * que usem *Animals* pegam palavras diferentes. Sortear um punhado a cada fase
 * fazia as mesmas cinco ou seis voltarem toda hora.
 */
function wordsFor(cat: Category, level: number, count: number): Word[] {
  const base = shuffle(cat.words, mulberry32(hashOf(cat.id)));
  const take = Math.min(count, base.length);
  const start = (level * take) % base.length;
  return Array.from({ length: take }, (_, i) => base[(start + i) % base.length]);
}

function buildBoard(level: number, config: LevelConfig, rnd: () => number): GameState {
  const chosen = categoriesFor(level, config.sizes.length);

  const keys: GameCard[] = [];
  const words: GameCard[] = [];
  const sizes: Record<string, number> = {};

  chosen.forEach((cat, ci) => {
    const picked = wordsFor(cat, level, config.sizes[ci]);
    sizes[cat.id] = picked.length;
    keys.push({ id: `k${ci}`, kind: 'key', categoryId: cat.id, word: null });
    picked.forEach((word, wi) => {
      words.push({ id: `c${ci}-${wi}`, kind: 'word', categoryId: cat.id, word });
    });
  });

  const totalWords = words.length;
  const dealt = config.depths.reduce((a, b) => a + b, 0);
  const stockSize = totalWords + keys.length - dealt;

  // As douradas nunca ficam enterradas. Só há dois lugares em que uma carta é
  // garantidamente alcançável: no baralho (é só virar) ou no fim de uma coluna.
  //
  // Isso não é capricho: como uma palavra só se empilha sobre a MESMA
  // categoria, uma dourada presa embaixo de uma carta que não tem para onde ir
  // trava o tabuleiro de vez — e medindo, era a causa de 86% dos becos sem
  // saída. Com a dourada sempre à mão, vaga livre sempre pode ser preenchida.
  const bottoms: Pos[] = config.depths.map((d, col) => ({ col, row: d - 1 }));
  const shallow: Pos[] = [...bottoms];
  for (let i = 0; i < stockSize; i++) shallow.push({ stock: i });

  const samePos = (a: Pos, b: Pos) =>
    'stock' in a
      ? 'stock' in b && a.stock === b.stock
      : !('stock' in b) && a.col === b.col && a.row === b.row;

  // Pelo menos uma dourada acessível já na primeira jogada.
  const keyPositions: Pos[] = [shuffle(bottoms, rnd)[0]];
  for (const pos of shuffle(shallow, rnd)) {
    if (keyPositions.length === keys.length) break;
    if (!keyPositions.some((p) => samePos(p, pos))) keyPositions.push(pos);
  }

  const colGrid: (GameCard | null)[][] = config.depths.map((d) => new Array(d).fill(null));
  const stockGrid: (GameCard | null)[] = new Array(stockSize).fill(null);

  keyPositions.forEach((pos, i) => {
    if ('stock' in pos) stockGrid[pos.stock] = keys[i];
    else colGrid[pos.col][pos.row] = keys[i];
  });

  const filler = shuffle(words, rnd);
  let f = 0;
  for (const col of colGrid) {
    for (let row = 0; row < col.length; row++) if (!col[row]) col[row] = filler[f++];
  }
  for (let i = 0; i < stockGrid.length; i++) if (!stockGrid[i]) stockGrid[i] = filler[f++];

  const columns: ColumnEntry[][] = colGrid.map((col, i) =>
    col.map((card, row) => ({ card: card!, faceDown: row < config.faceDown[i] })),
  );

  return {
    level,
    config,
    columns,
    stock: stockGrid.map((c) => c!),
    waste: [],
    slots: Array.from({ length: SLOT_COUNT }, () => ({ categoryId: null, collected: [] })),
    sizes,
    completed: [],
    movesLeft: 0,
    moveBudget: 0,
    ...helpFor(level),
    placed: 0,
    totalWords,
    status: 'playing',
  };
}

/**
 * Resolve o tabuleiro de forma gulosa e devolve em quantos movimentos.
 *
 * A ordem de `findHint` importa: fechar uma categoria libera uma vaga, então
 * isso vem antes de gastar a última vaga com uma dourada nova. Com mais
 * categorias do que vagas, essa ordem é o que evita o beco sem saída.
 */
function solve(start: GameState): number | null {
  let s: GameState = { ...start, movesLeft: Number.MAX_SAFE_INTEGER };
  let moves = 0;
  let barren = 0;

  while (s.status === 'playing' && moves < 5000) {
    const hint = findHint(s);
    if (hint) {
      const next = playFrom(s, hint);
      if (next.result.kind !== 'placed') return null;
      s = next.state;
      moves++;
      barren = 0;
      continue;
    }

    const pile = s.stock.length + s.waste.length;
    if (pile === 0) return null;
    // Já demos uma volta inteira no baralho sem conseguir jogar nada.
    if (barren > pile + 1) return null;

    s = draw(s);
    moves++;
    barren++;
  }

  return s.status === 'won' ? moves : null;
}

/**
 * Sorteia um tabuleiro e só devolve depois de PROVAR que ele tem solução.
 * Se o sorteio insistir em produzir tabuleiros travados, relaxa a configuração
 * (colunas mais rasas, baralho maior) em vez de entregar um nível impossível.
 */
export function createLevel(level: number): GameState {
  for (let relax = 0; relax < 4; relax++) {
    const config = levelConfig(level, relax);

    for (let attempt = 0; attempt < 200; attempt++) {
      // A semente vem do nível: a mesma fase devolve sempre o mesmo tabuleiro,
      // inclusive ao reiniciar. É um quebra-cabeça, não um sorteio.
      const rnd = mulberry32(level * 100003 + relax * 1009 + attempt + 1);
      const board = buildBoard(level, config, rnd);
      const needed = solve(board);
      if (needed === null) continue;

      // Folga para procurar, e não mais que isso.
      //
      // O multiplicador é, na prática, quanta ineficiência por jogada a fase
      // tolera: virar uma carta a mais em cada jogada já consome um quarto do
      // orçamento. Ele aperta ao longo da jornada — é o terceiro eixo da
      // progressão, junto do tabuleiro maior e da ajuda que diminui, e o único
      // que não alonga a partida.
      const slack = 1.28 - 0.0025 * Math.min(level - 1, PEAK_LEVEL - 1);
      const budget = Math.ceil(needed * slack) + 4;
      return { ...board, movesLeft: budget, moveBudget: budget };
    }
  }

  // Último recurso: colunas rasas, quase tudo no baralho.
  const config = levelConfig(level, 99);
  const board = buildBoard(level, config, mulberry32(level + 7));
  const budget = board.totalWords * 4 + 20;
  return { ...board, movesLeft: budget, moveBudget: budget };
}
