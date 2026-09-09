import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import CardFace, { DropTarget } from '../components/CardFace';
import CategorySlotView from '../components/CategorySlotView';
import LevelCompleteModal from '../components/LevelCompleteModal';
import TourOverlay, { Spot, TourStep } from '../components/TourOverlay';
import WordSheet, { SheetEntry } from '../components/WordSheet';
import { TOUR } from '../data/tour';
import { CATEGORY_BY_ID, Word } from '../data/words';
import { usePlayer } from '../player/PlayerProvider';
import { useNarration, useSpeaker } from '../speech';
import { LevelReward } from '../player/types';
import {
  GameCard,
  GameState,
  Source,
  cardAt,
  columnAccepts,
  createLevel,
  draw,
  findHint,
  movableRun,
  moveToColumn,
  playInto,
  sameSource,
  slotAccepts,
  slotFor,
} from '../game/engine';
import { XP_PER_WORD, starsFor } from '../player/progression';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';

const PAD = 16;
const GAP = 11;
const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 4 : 52;

/**
 * Carta de 80×104dp e escada de 34dp — as medidas do design. Com isso cabem 4
 * colunas de até 5 cartas com a palavra sempre visível no topo de cada uma.
 */
const CARD_RATIO = 1.3;
const FD_RATIO = 0.24; // carta virada para baixo — dá para contar uma a uma
const FU_RATIO = 0.327; // carta virada para cima — 34dp numa carta de 104dp
const SLOT_RATIO = 0.923; // vaga de categoria: 96dp para 104dp de carta

/**
 * Alturas fixas do layout — a geometria do arrasto depende delas.
 *
 * O topo é dividido em TRÊS faixas em vez de uma: navegação (voltar · fase ·
 * moedas), estado do jogo (movimentos, com o único número grande da tela) e
 * recursos (descarte e baralho). Antes as três competiam na mesma linha.
 */
const HEADER_H = 52;
const MOVES_MT = 10;
const MOVES_H = 78;
const TOPROW_MT = 14;
const SLOTS_MT = 16;
const TABLEAU_MT = 18;
const ACTIONS_H = 56;
const ACTIONS_MT = 12;
const CHROME_H =
  HEADER_H + MOVES_MT + MOVES_H + TOPROW_MT + SLOTS_MT + TABLEAU_MT + ACTIONS_MT + ACTIONS_H;

/**
 * Em tela curta (iPhone SE e afins) o painel de movimentos vira compacto: ele é
 * um bloco de altura fixa e, sem isso, come o espaço da carta até a palavra
 * ficar ilegível.
 */
/** A carta pousa em 130ms e a jogada vale na hora; voltar é um pouco mais lento. */
const DROP_MS = 130;
const RETURN_MS = 160;

/** Recuo inferior do palco: espaço para a barra de gestos do aparelho. */
const STAGE_BOTTOM = Platform.OS === 'ios' ? 26 : 12;

const COMPACT_BELOW = 640;
const movesHeightFor = (boxH: number) => (boxH > 0 && boxH < COMPACT_BELOW ? 56 : MOVES_H);
const chromeFor = (boxH: number) => CHROME_H - MOVES_H + movesHeightFor(boxH);

/**
 * Teto da largura do tabuleiro. Sem isto, numa janela de navegador ou num
 * tablet as quatro colunas esticam e cada carta vira um cartaz.
 */
const MAX_BOARD_W = 460;

type Toast = { text: string; tone: 'good' | 'bad' } | null;
type Drag = {
  src: Source;
  /** Carta de baixo do monte — é ela que manda nas regras. */
  card: GameCard;
  /** O monte inteiro que anda junto, de cima para baixo. */
  run: GameCard[];
  x0: number;
  y0: number;
} | null;

/** Onde a carta arrastada pode ser solta: num slot de categoria ou numa coluna. */
type Target = { to: 'slot' | 'column'; index: number };

const sameTarget = (a: Target | null, b: Target | null) =>
  !!a && !!b && a.to === b.to && a.index === b.index;

type Props = {
  /** Fase a jogar. */
  level: number;
  /** Sair do gameplay (voltar para a jornada/início). */
  onExit: () => void;
  /** Trocar de fase sem sair do gameplay. */
  onPlayLevel: (level: number) => void;
};

export default function GameScreen({ level, onExit, onPlayLevel }: Props) {
  const { width } = useWindowDimensions();
  const { player, finishLevel } = usePlayer();
  const speaker = useSpeaker(player.settings.sound);

  const [game, setGame] = useState<GameState>(() => createLevel(level));
  const [sheet, setSheet] = useState<SheetEntry | null>(null);
  const [looked, setLooked] = useState<Set<string>>(new Set());
  const [hintSrc, setHintSrc] = useState<Source | null>(null);
  const [pulseTokens, setPulseTokens] = useState<number[]>(() => game.slots.map(() => 0));
  const [toast, setToast] = useState<Toast>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<Drag>(null);
  const [hover, setHover] = useState<Target | null>(null);
  /** Erros do jogador nesta partida — vira "precisão" no resultado. */
  const [wrongDrops, setWrongDrops] = useState(0);
  /** Passo atual do tour; -1 quando ele já acabou ou foi pulado. */
  const [tourStep, setTourStep] = useState(0);
  /** Um contador por carta: mudar o valor faz a carta piscar e tremer. */
  const [errorTokens, setErrorTokens] = useState<Record<string, number>>({});
  const [reward, setReward] = useState<LevelReward | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const newWordsRef = useRef<Word[]>([]);
  /** Garante que a partida só é contabilizada uma vez. */
  const settled = useRef(false);

  const history = useRef<GameState[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const boardShake = useRef(new Animated.Value(0)).current;
  const dragRef = useRef<Drag>(null);
  const hoverRef = useRef<Target | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const say = useCallback((text: string, tone: 'good' | 'bad' = 'bad') => {
    setToast({ text, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1700);
  }, []);

  // ------------------------------------------------------------- geometria

  /**
   * O tamanho da carta sai do MENOR entre o que a largura permite e o que a
   * altura permite. Só pela largura, uma janela larga (navegador, tablet)
   * produz cartas gigantes e o tabuleiro não cabe na vertical.
   */
  const metrics = useMemo(() => {
    // `box` mede o palco COM o padding; o tabuleiro vive dentro dele. Descontar
    // aqui é o que mantém a margem lateral: sem isso o tabuleiro nasce 32dp
    // largo demais, transborda o padding e as cartas encostam nas duas bordas
    // da tela — e a altura sobra 78dp, esticando as cartas para além do que
    // cabe.
    const w = (box.w || width) - PAD * 2;
    const h = box.h > 0 ? box.h - TOP_INSET - STAGE_BOTTOM : 0;

    const byWidth = Math.min((w - GAP * 3) / 4, (MAX_BOARD_W - GAP * 3) / 4);

    let byHeight = byWidth;
    if (h > 0) {
      const deepest = Math.max(
        ...game.config.depths.map((d, i) => {
          const down = Math.min(game.config.faceDown[i], d);
          return down * FD_RATIO + Math.max(0, d - down - 1) * FU_RATIO + 1;
        }),
      );
      const factor = 1 + SLOT_RATIO + deepest;
      const avail = h - chromeFor(h);
      if (avail > 0) byHeight = avail / factor / CARD_RATIO;
    }

    const cardW = Math.max(38, Math.min(byWidth, byHeight));
    const cardH = cardW * CARD_RATIO;
    const slotH = cardH * SLOT_RATIO;

    const movesH = movesHeightFor(h);
    const topRowY = HEADER_H + MOVES_MT + movesH + TOPROW_MT;
    const slotsY = topRowY + cardH + SLOTS_MT;
    // Sem abinha: a vaga começa onde a faixa começa.
    const slotCardY = slotsY;
    const tableauY = slotsY + slotH + TABLEAU_MT;
    const tableauBottom = (h || 10000) - (ACTIONS_MT + ACTIONS_H);
    const tableauH = Math.max(cardH, tableauBottom - tableauY);

    // O tamanho da carta é fixo no nível inteiro, mas empilhar faz uma coluna
    // crescer. Quando isso ameaça estourar a tela, as cartas passam a se
    // sobrepor mais — como no jogo original — em vez de vazarem para fora.
    let fd = cardH * FD_RATIO;
    let fu = cardH * FU_RATIO;
    let worst = 0;
    for (const col of game.columns) {
      let h = 0;
      for (let i = 0; i < col.length - 1; i++) h += col[i].faceDown ? fd : fu;
      if (h > worst) worst = h;
    }
    if (worst > 0 && worst + cardH > tableauH) {
      const k = Math.max(0.22, (tableauH - cardH) / worst);
      fd *= k;
      fu *= k;
    }

    return {
      cardW,
      cardH,
      slotH,
      movesH,
      /** Recuo do leque do descarte: a carta de cima fica deslocada. */
      wasteX: cardW * 0.175,
      boardW: cardW * 4 + GAP * 3,
      topRowY,
      slotsY,
      slotCardY,
      tableauY,
      /** Onde a area das colunas termina (acima do aviso e dos botoes). */
      tableauBottom,
      fd,
      fu,
    };
  }, [box, width, game.config, game.columns]);

  const { cardW, cardH, slotH, boardW } = metrics;

  /** Deslocamento vertical de cada carta dentro da coluna. */
  const columnTops = useMemo(
    () =>
      game.columns.map((col) => {
        const tops: number[] = [];
        let y = 0;
        for (const entry of col) {
          tops.push(y);
          y += entry.faceDown ? metrics.fd : metrics.fu;
        }
        return tops;
      }),
    [game.columns, metrics],
  );

  // Os gestos leem estes refs para nunca trabalhar com estado velho.
  const gameRef = useRef(game);
  gameRef.current = game;
  const geomRef = useRef({ metrics, columnTops });
  geomRef.current = { metrics, columnTops };

  // ---------------------------------------------------------- arrasta/solta

  /** Canto superior esquerdo do monte arrastado, em coordenadas do tabuleiro. */
  const originOf = (src: Source, runLen: number) => {
    const { metrics: m, columnTops: tops } = geomRef.current;
    if (src.from === 'waste') return { x: m.wasteX, y: m.topRowY };
    const col = gameRef.current.columns[src.index];
    const start = Math.max(0, col.length - runLen);
    return { x: src.index * (m.cardW + GAP), y: m.tableauY + (tops[src.index]?.[start] ?? 0) };
  };

  /** Em qual das quatro faixas verticais o centro caiu? */
  const laneUnder = (cx: number) => {
    const m = geomRef.current.metrics;
    for (let i = 0; i < 4; i++) {
      const left = i * (m.cardW + GAP) - GAP / 2;
      if (cx >= left && cx <= left + m.cardW + GAP) return i;
    }
    return -1;
  };

  /** Sobre o que esta o centro da carta arrastada? null se nao e alvo. */
  const targetUnder = (x: number, y: number): Target | null => {
    const m = geomRef.current.metrics;
    const lane = laneUnder(x + m.cardW / 2);
    if (lane === -1) return null;
    const cy = y + m.cardH / 2;

    // Faixa dos slots — generosa, mas sem encostar na fileira do baralho.
    if (cy >= m.slotCardY - m.cardH * 0.45 && cy <= m.slotCardY + m.cardH) {
      return { to: 'slot', index: lane };
    }
    // Abaixo dela, ate onde as colunas vao, e empilhar no tabuleiro.
    if (cy > m.slotCardY + m.cardH && cy <= m.tableauBottom) {
      return { to: 'column', index: lane };
    }
    return null;
  };

  /** Onde a carta pousa ao ser empilhada nesta coluna. */
  const landingY = (columnIndex: number) => {
    const { metrics: m, columnTops: tops } = geomRef.current;
    const col = gameRef.current.columns[columnIndex];
    if (!col || col.length === 0) return m.tableauY;
    return m.tableauY + (tops[columnIndex]?.[col.length - 1] ?? 0) + m.fu;
  };

  const shakeBoard = () => {
    if (player.settings.reduceMotion) return;
    boardShake.setValue(0);
    Animated.sequence(
      [1, -1, 0.6, -0.35, 0].map((v) =>
        Animated.timing(boardShake, { toValue: v, duration: 45, useNativeDriver: true }),
      ),
    ).start();
  };

  const endDrag = () => {
    dragRef.current = null;
    setDrag(null);
    hoverRef.current = null;
    setHover(null);
    pan.setValue({ x: 0, y: 0 });
  };

  const remember = (state: GameState) => {
    history.current.push(state);
    if (history.current.length > 40) history.current.shift();
  };

  const commit = (src: Source, target: Target) => {
    const before = gameRef.current;
    const { state, result } =
      target.to === 'slot'
        ? playInto(before, src, target.index)
        : moveToColumn(before, src, target.index);

    if (result.kind === 'wrong' || result.kind === 'ignored') {
      endDrag();
      return;
    }

    remember(before);
    endDrag();
    setHintSrc(null);
    setGame(state);

    if (result.kind !== 'placed') return;
    setPulseTokens((t) => t.map((v, i) => (i === result.slotIndex ? v + 1 : v)));

    // A dourada pode chegar acompanhada e fechar a categoria de uma vez, então
    // o aviso de "completa" vem antes do de "aberta".
    const cat = CATEGORY_BY_ID[result.card.categoryId];
    if (result.completed) {
      say(`${cat.en} completa — vaga liberada!`, 'good');
    } else if (result.opened) {
      say(`Categoria aberta: ${cat.en} — ${cat.pt}`, 'good');
    }
  };

  const finishDrag = (g: PanResponderGestureState) => {
    const d = dragRef.current;
    if (!d) return;

    const target = targetUnder(d.x0 + g.dx, d.y0 + g.dy);
    const state = gameRef.current;
    const m = geomRef.current.metrics;

    hoverRef.current = null;
    setHover(null);

    const accepted =
      !!target &&
      (target.to === 'slot'
        ? slotAccepts(state, d.card, target.index)
        : columnAccepts(state, d.src, target.index));

    if (target && accepted) {
      const destY = target.to === 'slot' ? m.slotCardY : landingY(target.index);
      // Timing, não mola: a jogada só é confirmada quando a animação termina, e
      // mola converge de forma assintótica — levava mais de meio segundo para
      // relatar o fim, o que aparecia como atraso entre soltar e a carta valer.
      Animated.timing(pan, {
        toValue: { x: target.index * (m.cardW + GAP) - d.x0, y: destY - d.y0 },
        duration: DROP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => commit(d.src, target));
      return;
    }

    // Alvo inválido: o motor cobra o movimento, a tela treme e a carta volta.
    // Devolver na própria coluna é desistir do arrasto — de lá vem 'ignored'.
    if (target) {
      const { state: after, result } =
        target.to === 'slot'
          ? playInto(state, d.src, target.index)
          : moveToColumn(state, d.src, target.index);

      if (result.kind === 'wrong') {
        remember(state);
        setGame(after);
        setWrongDrops((n) => n + 1);
        setErrorTokens((t) => ({ ...t, [d.card.id]: (t[d.card.id] ?? 0) + 1 }));
        shakeBoard();

        if (target.to === 'column') {
          const top = state.columns[target.index]?.slice(-1)[0];
          say(
            top && top.card.kind === 'key'
              ? 'Nada se empilha em cima de uma carta dourada · −1 movimento'
              : 'Só empilha sobre uma palavra da mesma categoria · −1 movimento',
          );
        } else {
          say(
            d.card.kind === 'key'
              ? 'Essa vaga já está ocupada · −1 movimento'
              : 'Essa palavra não é dessa categoria · −1 movimento',
          );
        }
      }
    }

    Animated.timing(pan, {
      toValue: { x: 0, y: 0 },
      duration: RETURN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(endDrag);
  };

  /**
   * Um PanResponder por posição arrastável (4 colunas + descarte).
   * `onMoveShouldSet` só assume depois de o dedo andar alguns pixels — assim
   * segurar parado continua abrindo o dicionário.
   */
  const responders = useMemo(() => {
    const make = (src: Source) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
        onPanResponderGrant: (_e, g) => {
          const state = gameRef.current;
          if (state.status !== 'playing') return;
          const card = cardAt(state, src);
          if (!card) return;

          const run: GameCard[] =
            src.from === 'waste'
              ? [card]
              : state.columns[src.index]
                  .slice(state.columns[src.index].length - movableRun(state, src.index))
                  .map((e) => e.card);

          const origin = originOf(src, run.length);
          pan.setValue({ x: g.dx, y: g.dy });
          dragRef.current = { src, card, run, x0: origin.x, y0: origin.y };
          setDrag(dragRef.current);
        },
        onPanResponderMove: (_e, g) => {
          const d = dragRef.current;
          if (!d) return;
          pan.setValue({ x: g.dx, y: g.dy });
          const t = targetUnder(d.x0 + g.dx, d.y0 + g.dy);
          if (!sameTarget(t, hoverRef.current)) {
            hoverRef.current = t;
            setHover(t);
          }
        },
        onPanResponderRelease: (_e, g) => finishDrag(g),
        onPanResponderTerminate: (_e, g) => finishDrag(g),
      });

    return {
      columns: [0, 1, 2, 3].map((i) => make({ from: 'column', index: i } as Source)),
      waste: make({ from: 'waste' }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------- ações

  const onDraw = () => {
    const state = gameRef.current;
    if (state.status !== 'playing') return;
    if (state.stock.length === 0 && state.waste.length === 0) return;
    remember(state);
    setHintSrc(null);
    setGame(draw(state));
  };

  const onUndo = () => {
    if (game.undos <= 0 || history.current.length === 0) return;
    const prev = history.current.pop()!;
    setHintSrc(null);
    setGame({ ...prev, undos: game.undos - 1, hints: game.hints });
  };

  const onHint = () => {
    if (game.hints <= 0 || game.status !== 'playing') return;
    const src = findHint(game);
    if (!src) {
      say('Nenhuma jogada à vista — vire uma carta do baralho');
      return;
    }
    setGame({ ...game, hints: game.hints - 1 });
    setHintSrc(src);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintSrc(null), 3500);
  };

  const openWord = (word: Word) => {
    setSheet({ type: 'word', word });
    setLooked((s) => {
      if (s.has(word.w)) return s;
      // Primeira vez que esta palavra aparece para o jogador, em qualquer
      // partida: é uma palavra nova de verdade, e vale XP no fim da fase.
      if (!player.words[word.w]) {
        newWordsRef.current = [...newWordsRef.current, word];
        say(`Nova palavra! ${word.w} · +${XP_PER_WORD} XP`, 'good');
      }
      return new Set(s).add(word.w);
    });
  };

  const openCategory = (categoryId: string) => {
    setSheet({ type: 'category', category: CATEGORY_BY_ID[categoryId] });
  };

  const longPressFor = (card: GameCard) =>
    card.word ? () => openWord(card.word!) : () => openCategory(card.categoryId);

  /**
   * Ouvir a palavra da carta sem abrir o dicionário. Estável entre
   * renderizações de propósito: é prop de um componente memoizado.
   */
  const speakCard = useCallback(
    (card: GameCard) => {
      const text = card.kind === 'key' ? CATEGORY_BY_ID[card.categoryId]?.en : card.word?.w;
      if (text) speaker.speak(text);
    },
    [speaker],
  );

  /** Recomeça a fase atual do zero. */
  const restart = useCallback(() => {
    const next = createLevel(level);
    history.current = [];
    endDrag();
    setGame(next);
    setPulseTokens(next.slots.map(() => 0));
    setToast(null);
    setHintSrc(null);
    setMenuOpen(false);
    setWrongDrops(0);
    setReward(null);
    setResultOpen(false);
    setLooked(new Set());
    newWordsRef.current = [];
    settled.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // O tabuleiro inicial já veio do useState — recriar aqui rodaria o
  // solucionador de nível duas vezes a cada montagem. Este efeito só serve
  // para o caso de a fase mudar sem remontar o componente.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    restart();
  }, [restart]);

  /**
   * A partida acabou: contabiliza no perfil do jogador uma única vez e abre o
   * resultado. Sair no meio também conta as palavras descobertas.
   */
  const settle = useCallback(
    (won: boolean, state: GameState, words: Set<string>) => {
      if (settled.current) return null;
      settled.current = true;
      const { reward: got } = finishLevel({
        level,
        won,
        movesUsed: state.moveBudget - state.movesLeft,
        moveBudget: state.moveBudget,
        movesLeft: Math.max(0, state.movesLeft),
        correctDrops: state.placed,
        wrongDrops,
        wordsSeen: [...words],
      });
      return got;
    },
    [finishLevel, level, wrongDrops],
  );

  useEffect(() => {
    if (game.status === 'playing') return;
    const got = settle(game.status === 'won', game, looked);
    if (got) setReward(got);
    setResultOpen(true);
  }, [game, looked, settle]);

  /** Sair pelo botão de voltar: registra o que já foi aprendido e sai. */
  const exit = () => {
    if (game.status === 'playing') settle(false, game, looked);
    onExit();
  };

  // ------------------------------------------------------------------ tour

  /**
   * O tour roda na primeira partida de quem ainda não terminou nenhuma fase —
   * inclusive depois de apagar o progresso, que é como se grava uma
   * demonstração. Os passos de gesto esperam o gesto de verdade.
   */
  const tourOn = tourStep >= 0 && level === 1 && Object.keys(player.levels).length === 0;

  const tourSteps = useMemo<TourStep[]>(() => {
    const m = metrics;
    // As coordenadas dos passos são as do tabuleiro; a sobreposição vive na
    // raiz da tela, então elas são deslocadas pela origem do tabuleiro.
    const board = (x: number, y: number, w: number, h: number): Spot => ({ x, y, w, h });

    // Qual carta dourada o holofote aponta.
    //
    // Não pode ser simplesmente a primeira da esquerda. O passo seguinte pede
    // uma palavra daquela categoria, e a categoria só passa a ter palavra à mão
    // se abrir uma ao ser recolhida. Na fase 1 há duas douradas no topo:
    // [school] revela `blizzard`, que é de outra categoria — o jogador fica sem
    // nada para arrastar —, e [clothing] revela `scarf`, que serve. Por isso a
    // escolha é simulada: jogo a dourada e olho o que fica acessível depois.
    const goldSpot = (ci: number, depth: number) =>
      board(ci * (cardW + GAP), m.tableauY + (columnTops[ci]?.[depth] ?? 0), cardW, cardH);

    let gold: Spot | null = null;
    let anyGold: Spot | null = null;
    game.columns.forEach((col, ci) => {
      const last = col[col.length - 1];
      if (gold || !last || last.faceDown || last.card.kind !== 'key') return;
      const here = goldSpot(ci, col.length - 1);
      if (!anyGold) anyGold = here;

      const slotIndex = slotFor(game, last.card);
      if (slotIndex < 0) return;
      const after = playInto(game, { from: 'column', index: ci }, slotIndex);
      if (after.result.kind !== 'placed') return;

      const teaches = after.state.columns.some((other) => {
        const top = other[other.length - 1];
        return (
          !!top &&
          !top.faceDown &&
          top.card.kind === 'word' &&
          top.card.categoryId === last.card.categoryId
        );
      });
      if (teaches) gold = here;
    });
    // Nenhuma dourada destrava uma palavra: aponto a primeira mesmo assim, que
    // é melhor do que holofote nenhum.
    if (!gold) gold = anyGold ?? board(0, m.topRowY, boardW, cardH);

    // O texto vem de `src/data/tour.ts`, que é a mesma fonte da narração; aqui
    // fica só o que depende da tela: onde cai o holofote e o que o passo espera.
    const extra: Record<string, { spot: Spot | null; waits?: boolean; done?: boolean }> = {
      welcome: { spot: null },
      slots: { spot: board(0, m.slotsY, boardW, m.slotH) },
      gold: {
        spot: gold,
        waits: true,
        done: game.slots.some((slot) => slot.categoryId !== null),
      },
      word: {
        spot: board(0, m.slotsY, boardW, m.slotH),
        waits: true,
        done: game.placed > 0,
      },
      hold: {
        spot: board(0, m.tableauY, boardW, Math.max(cardH, m.tableauBottom - m.tableauY)),
        waits: true,
        done: looked.size > 0,
      },
      moves: { spot: board(0, HEADER_H + MOVES_MT, boardW, m.movesH) },
    };

    return TOUR.map((line) => ({
      id: line.id,
      title: line.title,
      text: line.text,
      ...extra[line.id],
    }));
  }, [metrics, game, columnTops, cardW, cardH, boardW, looked.size]);

  const step = tourOn ? tourSteps[tourStep] ?? null : null;

  // A voz acompanha o passo que está na tela.
  useNarration(step?.id ?? null, player.settings.sound);

  // Passo de gesto: quem avança é o gesto.
  useEffect(() => {
    if (step?.waits && step.done) setTourStep((n) => n + 1);
  }, [step?.id, step?.waits, step?.done, step]);

  // Origem do tabuleiro dentro da tela, para o holofote cair no lugar certo.
  const boardOrigin = useMemo(
    () => ({ x: PAD + Math.max(0, ((box.w || width) - PAD * 2 - boardW) / 2), y: TOP_INSET }),
    [box.w, width, boardW],
  );

  const tourStepOnScreen = useMemo<TourStep | null>(() => {
    if (!step) return null;
    if (!step.spot) return step;
    return {
      ...step,
      spot: {
        ...step.spot,
        x: step.spot.x + boardOrigin.x,
        y: step.spot.y + boardOrigin.y,
      },
    };
  }, [step, boardOrigin]);

  // ----------------------------------------------------------------- view

  /** Últimas cartas do descarte, em leque. */
  const wasteView = game.waste.slice(-2);
  const dragRun = drag?.run.length ?? 1;
  const lowMoves = game.movesLeft <= 5;
  const boardTranslate = boardShake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });
  const starsNow = starsFor(game.movesLeft, game.moveBudget, wrongDrops);

  return (
    <View style={styles.root}>
      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setBox((prev) => (Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h }));
        }}
      >
        <Animated.View
          style={{ width: boardW, flex: 1, transform: [{ translateX: boardTranslate }] }}
        >
          {/* ─────────────────────────── faixa 1: navegação ───────────── */}
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={8}
              onPress={exit}
              style={styles.headerButton}
            >
              <Icon name="back" size={22} color={theme.colors.green200} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.levelText}>Fase {level}</Text>
              <Text style={styles.levelSub}>
                {Object.keys(game.sizes).length} CATEGORIAS
              </Text>
            </View>

            <View style={styles.coins}>
              <Icon name="coin" size={17} color={theme.colors.gold500} />
              <Text style={styles.coinsText}>{player.coins}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menu"
              hitSlop={8}
              onPress={() => setMenuOpen(true)}
              style={styles.headerButton}
            >
              <Icon name="gear" size={20} color={theme.colors.green200} />
            </Pressable>
          </View>

          {/* ──────────────────── faixa 2: estado do jogo ─────────────── */}
          <View style={[styles.moves, { height: metrics.movesH }, lowMoves && styles.movesLow]}>
            <View style={styles.movesNumber}>
              <Text
                style={[
                  styles.movesValue,
                  metrics.movesH < MOVES_H && { fontSize: 28, lineHeight: 30 },
                  lowMoves && { color: '#FFE3DE' },
                ]}
              >
                {Math.max(0, game.movesLeft)}
              </Text>
              <Text style={styles.movesLabel}>MOVIMENTOS</Text>
            </View>

            <View style={styles.movesRight}>
              <View style={styles.movesTrack}>
                <View
                  style={[
                    styles.movesFill,
                    {
                      width: `${Math.max(0, Math.min(1, game.movesLeft / Math.max(1, game.moveBudget))) * 100}%`,
                      backgroundColor: lowMoves ? theme.colors.coral500 : theme.colors.green300,
                    },
                  ]}
                />
              </View>
              <View style={styles.movesFoot}>
                <Text style={styles.movesFootText}>
                  {game.placed} de {game.totalWords} cartas
                </Text>
                <View style={styles.starRow}>
                  {[1, 2, 3].map((i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={13}
                      filled={i <= starsNow}
                      color={i <= starsNow ? theme.colors.gold500 : theme.colors.green600}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ───────────────── faixa 3: descarte e baralho ────────────── */}
          <View style={[styles.topRow, { height: cardH }]}>
            <View style={{ width: cardW * 1.4, height: cardH }}>
              {wasteView.map((card, i) => {
                const isTop = i === wasteView.length - 1;
                const dragging = isTop && !!drag && drag.src.from === 'waste';
                return (
                  <View
                    key={card.id}
                    style={{
                      position: 'absolute',
                      left: isTop ? metrics.wasteX : 0,
                      top: isTop ? 0 : cardH * 0.06,
                      opacity: isTop ? 1 : 0.5,
                      transform: isTop ? undefined : [{ rotate: '-6deg' }],
                      zIndex: i + 1,
                    }}
                    {...(isTop ? responders.waste.panHandlers : {})}
                  >
                    <Pressable onLongPress={longPressFor(card)} delayLongPress={280}>
                      <CardFace
                        card={card}
                        width={cardW}
                        height={cardH}
                        active={isTop}
                        ghost={dragging}
                        highlighted={isTop && sameSource(hintSrc, { from: 'waste' })}
                        errorToken={errorTokens[card.id] ?? 0}
                        onSpeak={speakCard}
                      />
                    </Pressable>
                  </View>
                );
              })}
              {wasteView.length === 0 && (
                <View style={[styles.emptyWaste, { width: cardW, height: cardH }]}>
                  <Text style={styles.emptyWasteText}>DESCARTE</Text>
                </View>
              )}
            </View>

            <View style={styles.deckSide}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.deckCount}>{game.stock.length}</Text>
                <Text style={styles.deckLabel}>NO BARALHO</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  game.stock.length > 0 ? 'Virar carta do baralho' : 'Devolver o descarte ao baralho'
                }
                onPress={onDraw}
                style={{ width: cardW, height: cardH }}
              >
                {game.stock.length > 0 ? (
                  <CardFace card={null} faceDown width={cardW} height={cardH} />
                ) : (
                  <View
                    style={[styles.recycle, { borderRadius: cardW * 0.15 }]}
                  >
                    <Icon name="shuffle" size={cardW * 0.32} color={theme.colors.green350} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* ─────────────────────── vagas de categoria ───────────────── */}
          <View style={styles.slotsRow}>
            {game.slots.map((slot, i) => (
              <CategorySlotView
                key={i}
                slot={slot}
                total={slot.categoryId ? game.sizes[slot.categoryId] ?? 0 : 0}
                width={cardW}
                height={slotH}
                pulseToken={pulseTokens[i] ?? 0}
                hovered={sameTarget(hover, { to: 'slot', index: i })}
                onLongPressCategory={openCategory}
              />
            ))}
          </View>

          {/* ───────────────────────────── colunas ────────────────────── */}
          <View style={styles.tableau}>
            {game.columns.map((col, ci) => {
              const tops = columnTops[ci] ?? [];
              const lastIndex = col.length - 1;
              const targeted = sameTarget(hover, { to: 'column', index: ci });

              const landing = targeted && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    zIndex: 900,
                    top: col.length ? tops[lastIndex] + metrics.fu : 0,
                  }}
                >
                  <DropTarget width={cardW} height={(dragRun - 1) * metrics.fu + cardH} />
                </View>
              );

              if (col.length === 0) {
                return (
                  <View key={ci} style={{ width: cardW, height: cardH }}>
                    <View
                      style={[
                        styles.emptyColumn,
                        { width: cardW, height: cardH, borderRadius: cardW * 0.15 },
                      ]}
                    />
                    {landing}
                  </View>
                );
              }

              return (
                <View key={ci} style={{ width: cardW, height: tops[lastIndex] + cardH }}>
                  {landing}
                  {col.map((entry, ri) => {
                    const isLast = ri === lastIndex;
                    const draggable = isLast && !entry.faceDown;
                    const inHand = !!drag && drag.src.from === 'column' && drag.src.index === ci;
                    const dragging = inHand && ri >= col.length - drag.run.length;

                    return (
                      <View
                        key={entry.card.id}
                        style={{ position: 'absolute', top: tops[ri], left: 0, zIndex: ri + 1 }}
                        {...(draggable ? responders.columns[ci].panHandlers : {})}
                      >
                        <Pressable
                          onLongPress={entry.faceDown ? undefined : longPressFor(entry.card)}
                          delayLongPress={280}
                        >
                          <CardFace
                            card={entry.card}
                            faceDown={entry.faceDown}
                            width={cardW}
                            height={cardH}
                            active={draggable || entry.faceDown}
                            ghost={dragging}
                            highlighted={
                              draggable && sameTarget(hintSrc && { to: 'column', index: ci }, { to: 'column', index: ci })
                                ? sameSource(hintSrc, { from: 'column', index: ci })
                                : false
                            }
                            errorToken={errorTokens[entry.card.id] ?? 0}
                            onSpeak={speakCard}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* ───────────────────────────── ações ──────────────────────── */}
          <View style={styles.actions}>
            <Text style={styles.hintText} numberOfLines={2}>
              {toast
                ? toast.text
                : 'Segure qualquer carta para ver o significado. Sempre de graça.'}
            </Text>

            <View style={styles.actionButtons}>
              <ActionButton
                icon="bulb"
                count={game.hints}
                onPress={onHint}
                accessibilityLabel="Dica"
                solid
              />
              <ActionButton
                icon="undo"
                count={game.undos}
                onPress={onUndo}
                accessibilityLabel="Desfazer"
              />
            </View>
          </View>

          {/* ─────────────────── a carta que segue o dedo ─────────────── */}
          {drag && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: drag.x0,
                top: drag.y0,
                zIndex: 1000,
                elevation: 30,
                width: cardW,
                height: (drag.run.length - 1) * metrics.fu + cardH,
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              }}
            >
              {drag.run.map((c, i) => (
                <View key={c.id} style={{ position: 'absolute', top: i * metrics.fu, left: 0 }}>
                  <CardFace card={c} width={cardW} height={cardH} lifted />
                </View>
              ))}
            </Animated.View>
          )}
        </Animated.View>
      </View>

      <TourOverlay
        step={tourStepOnScreen}
        total={tourSteps.length}
        index={tourStep}
        topInset={TOP_INSET}
        onNext={() => setTourStep((n) => (n + 1 >= tourSteps.length ? -1 : n + 1))}
        onSkip={() => setTourStep(-1)}
      />

      {/* Depois do tour de propósito: no passo do toque longo, o dicionário é a
          própria lição e precisa aparecer por cima do escuro. */}
      <WordSheet entry={sheet} soundOn={player.settings.sound} onClose={() => setSheet(null)} />

      {/* ----------------------------------------------------------- menus */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={restart}>
              <Icon name="shuffle" size={20} color={theme.colors.ink60} />
              <Text style={styles.menuText}>Reiniciar fase</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setHelpOpen(true);
              }}
            >
              <Icon name="book" size={20} color={theme.colors.ink60} />
              <Text style={styles.menuText}>Como jogar</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
              <Icon name="close" size={20} color={theme.colors.ink30} />
              <Text style={[styles.menuText, styles.menuMuted]}>Voltar ao jogo</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={helpOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setHelpOpen(false)}>
          <View style={styles.help}>
            <Text style={styles.helpTitle}>Como jogar</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              <Text style={styles.helpText}>
                <Text style={styles.b}>Segure o dedo</Text> em qualquer carta virada para cima para
                ver a tradução e a definição em português. Isso nunca gasta movimento — é para isso
                que o jogo existe.
                {'\n\n'}
                <Text style={styles.b}>Arraste</Text> a carta até a vaga da categoria a que ela
                pertence. Se soltar no lugar errado, a tela treme e a carta volta — sem custo nenhum.
                {'\n\n'}
                As <Text style={styles.b}>cartas douradas com estrela</Text> trazem o nome de uma
                categoria. Arraste uma delas até uma vaga livre (a do cadeado) para abri-la. O nível
                tem <Text style={styles.b}>mais categorias do que vagas</Text>: quando você completa
                uma categoria, ela sai e a vaga fica livre para a próxima.
                {'\n\n'}
                Só dá para arrastar a <Text style={styles.b}>última carta de cada coluna</Text> e a
                carta do topo do descarte. Toque no <Text style={styles.b}>baralho</Text> para virar
                mais cartas; quando ele acaba, o descarte volta para ele.
                {'\n\n'}
                Você também pode <Text style={styles.b}>empilhar cartas nas colunas</Text>, mas só
                sobre uma palavra da <Text style={styles.b}>mesma categoria</Text>. É assim que se
                desenterra palavra: a carta sai da frente e a de baixo vira. Nada se empilha em cima
                de uma carta dourada — ela precisa continuar à mão.
                {'\n\n'}
                Cartas da mesma categoria empilhadas viram um <Text style={styles.b}>monte</Text>:
                arraste a de baixo e o monte inteiro vai junto, por 1 movimento. Uma
                <Text style={styles.b}> coluna vazia</Text> aceita qualquer carta ou monte.
                {'\n\n'}
                Um monte também pode ir direto para a vaga da categoria: como as cartas empilhadas
                são todas do mesmo tema, <Text style={styles.b}>elas entram de uma vez</Text>, por 1
                movimento.
                {'\n\n'}
                Cada jogada custa <Text style={styles.b}>1 movimento</Text>. Você vence completando
                todas as categorias antes de eles acabarem.
              </Text>
            </ScrollView>
            <Pressable style={styles.helpButton} onPress={() => setHelpOpen(false)}>
              <Text style={styles.helpButtonText}>Entendi</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <LevelCompleteModal
        visible={resultOpen}
        won={game.status === 'won'}
        level={level}
        reward={reward}
        movesUsed={game.moveBudget - game.movesLeft}
        newWords={newWordsRef.current}
        hasNext
        onNext={() => onPlayLevel(level + 1)}
        onReplay={restart}
        onHome={onExit}
      />
    </View>
  );
}

/** Botão redondo da base: dica (azul, sólido) e desfazer (contorno). */
function ActionButton({
  icon,
  count,
  onPress,
  accessibilityLabel,
  solid,
}: {
  icon: 'bulb' | 'undo';
  count: number;
  onPress: () => void;
  accessibilityLabel: string;
  solid?: boolean;
}) {
  const off = count <= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${count} restantes`}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      style={off && { opacity: 0.4 }}
    >
      <View style={[styles.action, solid ? styles.actionSolid : styles.actionGhost]}>
        <Icon name={icon} size={26} color={solid ? '#FFFFFF' : theme.colors.green200} />
      </View>
      <View style={[styles.badge, solid ? styles.badgeGold : styles.badgeLight]}>
        <Text style={[styles.badgeText, { color: solid ? theme.colors.goldInk : theme.colors.green800 }]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

const noSelect = { userSelect: 'none' } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.table, ...noSelect },
  stage: {
    flex: 1,
    ...noSelect,
    alignItems: 'center',
    paddingTop: TOP_INSET,
    paddingHorizontal: PAD,
    paddingBottom: STAGE_BOTTOM,
  },

  // ------------------------------------------------------ faixa 1: topo
  header: { flexDirection: 'row', alignItems: 'center', height: HEADER_H, gap: 6 },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.green800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  levelText: { ...noSelect, color: '#FFFFFF', fontSize: 18, fontFamily: fonts.displayMed },
  levelSub: {
    ...noSelect,
    color: theme.colors.onTableLabel,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
    letterSpacing: 1,
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.green800,
  },
  coinsText: { ...noSelect, color: theme.colors.gold100, fontSize: 15, fontFamily: fonts.display },

  // -------------------------------------------------- faixa 2: movimentos
  moves: {
    marginTop: MOVES_MT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.green800,
    borderWidth: 1,
    borderColor: theme.colors.green600,
  },
  movesLow: { borderColor: theme.colors.coral500 },
  movesNumber: { minWidth: 64, alignItems: 'center' },
  movesValue: {
    ...noSelect,
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 38,
    lineHeight: 40,
  },
  movesLabel: {
    ...noSelect,
    color: theme.colors.onTableLabel,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
  },
  movesRight: { flex: 1 },
  movesTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#164A36',
    overflow: 'hidden',
  },
  movesFill: { height: '100%', borderRadius: 4 },
  movesFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  movesFootText: { ...noSelect, color: theme.colors.onTable, fontFamily: fonts.body, fontSize: 12 },
  starRow: { flexDirection: 'row', gap: 2 },

  // ----------------------------------------------- faixa 3: descarte/deck
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: TOPROW_MT,
  },
  emptyWaste: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.green600,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWasteText: {
    ...noSelect,
    color: theme.colors.onTableLabel,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
  },
  deckSide: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deckCount: {
    ...noSelect,
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 22,
  },
  deckLabel: {
    ...noSelect,
    color: theme.colors.onTableLabel,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.9,
  },
  recycle: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.green400,
    backgroundColor: theme.colors.green800,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---------------------------------------------------- vagas e tabuleiro
  slotsRow: { flexDirection: 'row', gap: GAP, marginTop: SLOTS_MT },
  tableau: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
    marginTop: TABLEAU_MT,
    alignItems: 'flex-start',
  },
  emptyColumn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.green600,
  },

  // ---------------------------------------------------------------- ações
  actions: {
    height: ACTIONS_H,
    marginTop: ACTIONS_MT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hintText: {
    ...noSelect,
    flex: 1,
    maxWidth: 180,
    color: theme.colors.onTableLabel,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButtons: { flexDirection: 'row', gap: 12 },
  action: {
    width: ACTIONS_H,
    height: ACTIONS_H,
    borderRadius: ACTIONS_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSolid: {
    backgroundColor: theme.colors.blue500,
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.blue700,
  },
  actionGhost: {
    backgroundColor: theme.colors.green800,
    borderWidth: 1.5,
    borderColor: theme.colors.green400,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.table,
  },
  badgeGold: { backgroundColor: theme.colors.gold500 },
  badgeLight: { backgroundColor: theme.colors.green200 },
  badgeText: { ...noSelect, fontSize: 12, fontFamily: fonts.display },

  // --------------------------------------------------------------- modais
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,26,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  menu: {
    width: '100%',
    maxWidth: MAX_BOARD_W,
    backgroundColor: '#FFF',
    borderRadius: theme.radius.xl,
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 22,
  },
  menuText: { fontSize: 16, fontFamily: fonts.bodySemi, color: theme.colors.ink },
  menuMuted: { color: theme.colors.ink30, fontFamily: fonts.bodyMed },

  help: {
    width: '100%',
    maxWidth: MAX_BOARD_W,
    backgroundColor: '#FFF',
    borderRadius: theme.radius.xl,
    padding: 22,
  },
  helpTitle: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: theme.colors.ink,
    marginBottom: 10,
  },
  helpText: { fontSize: 15, lineHeight: 23, color: theme.colors.ink60, fontFamily: fonts.body },
  b: { fontFamily: fonts.bodyBold, color: theme.colors.ink },
  helpButton: {
    marginTop: 16,
    backgroundColor: theme.colors.green500,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.green800,
  },
  helpButtonText: { color: '#FFF', fontFamily: fonts.display, fontSize: 16 },
});
