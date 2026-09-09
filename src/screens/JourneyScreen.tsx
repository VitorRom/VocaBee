import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { levelConfig } from '../game/engine';
import { useNavigation } from '../navigation/Router';
import { usePlayer } from '../player/PlayerProvider';
import { COINS_LEVEL_CLEAR, XP_LEVEL_CLEAR, totalStars } from '../player/progression';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';
import Screen from '../ui/Screen';
import { StatChip } from '../ui/primitives';

/** Um capítulo a cada dez fases, fechado por uma medalha. */
const CHAPTER = 10;
const HORIZON = 6;
const NODE = 58;

/**
 * Os limiares acompanham as formas de tabuleiro de `levelConfig`: 17, 21, 27,
 * 31, 36 e 44 palavras. Calibrados na curva antiga, quase tudo caía em
 * "Difícil" e o rótulo deixava de informar.
 */
function difficultyOf(level: number) {
  const cfg = levelConfig(level);
  const cards = cfg.sizes.reduce((a, b) => a + b, 0);
  const label =
    cards <= 17 ? 'Fácil' : cards <= 27 ? 'Médio' : cards <= 36 ? 'Difícil' : 'Desafio';
  return { label, categories: cfg.sizes.length, cards };
}

type Step =
  | { kind: 'level'; level: number }
  | { kind: 'medal'; chapter: number; unlocked: boolean };

export default function JourneyScreen() {
  const { player, nextLevel } = usePlayer();
  const { navigate, goBack } = useNavigation();

  const stars = totalStars(player.levels);
  const words = Object.keys(player.words).length;
  const chapter = Math.floor((nextLevel - 1) / CHAPTER) + 1;

  /** A trilha: as fases em ordem, com uma medalha ao fim de cada capítulo. */
  const steps = useMemo<Step[]>(() => {
    const last = Math.max(CHAPTER, Math.ceil((nextLevel + HORIZON) / CHAPTER) * CHAPTER);
    const out: Step[] = [];
    for (let n = 1; n <= last; n++) {
      out.push({ kind: 'level', level: n });
      if (n % CHAPTER === 0) {
        out.push({ kind: 'medal', chapter: n / CHAPTER, unlocked: nextLevel > n });
      }
    }
    return out;
  }, [nextLevel]);

  return (
    <Screen
      title="Jornada do Inglês"
      subtitle={`Capítulo ${chapter} · fase ${nextLevel}`}
      onBack={goBack}
      right={<StatChip icon="coin" value={player.coins} bg="rgba(255,255,255,0.18)" color="#FFF" />}
    >
      {/* ------------------------------------------------------- resumo */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Icon name="star" size={17} filled color={theme.colors.gold} />
          <Text style={styles.summaryValue}>{stars}</Text>
          <Text style={styles.summaryLabel}>estrelas</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="book" size={17} color={theme.colors.secondary} />
          <Text style={styles.summaryValue}>{words}</Text>
          <Text style={styles.summaryLabel}>palavras</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Icon name="check" size={17} color={theme.colors.primary} />
          <Text style={styles.summaryValue}>{Object.keys(player.levels).length}</Text>
          <Text style={styles.summaryLabel}>fases</Text>
        </View>
      </View>

      {/* -------------------------------------------------------- trilha */}
      <View style={styles.trail}>
        {steps.map((step, i) => {
          // Cada passo desenha o próprio pedaço de trilho acima de si: verde no
          // trecho já andado, cinza à frente. Altura em porcentagem não resolve
          // dentro de um pai de altura automática.
          const reached =
            step.kind === 'medal' ? step.unlocked : step.level <= nextLevel;
          const rail =
            i > 0 ? (
              <View style={[styles.rail, reached && styles.railDone]} />
            ) : null;
          if (step.kind === 'medal') {
            return (
              <View key={`m${step.chapter}`} style={styles.medalRow}>
                {rail}
                <View style={[styles.medal, step.unlocked && styles.medalOn]}>
                  <Icon
                    name="trophy"
                    size={26}
                    color={step.unlocked ? theme.colors.gold : theme.colors.inkFaint}
                  />
                </View>
                <Text style={[styles.medalText, step.unlocked && styles.medalTextOn]}>
                  Medalha do capítulo {step.chapter}
                </Text>
              </View>
            );
          }

          const n = step.level;
          const record = player.levels[n];
          const done = !!record;
          const current = n === nextLevel;
          const locked = n > nextLevel;

          // A fase atual ganha um cartão largo — é a única coisa a fazer aqui.
          if (current) {
            const diff = difficultyOf(n);
            return (
              <View key={n} style={styles.currentWrap}>
                {rail}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Jogar a fase ${n}`}
                  onPress={() => navigate('game', { level: n })}
                  style={styles.currentCard}
                >
                  <View style={styles.currentNumber}>
                    <Text style={styles.currentNumberText}>{n}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentTag}>VOCÊ ESTÁ AQUI</Text>
                    <Text style={styles.currentTitle}>Fase {n}</Text>
                    <Text style={styles.currentMeta}>
                      {diff.label} · {diff.categories} categorias · {diff.cards} cartas
                    </Text>
                    <Text style={styles.currentReward}>
                      +{XP_LEVEL_CLEAR} XP · +{COINS_LEVEL_CLEAR} moedas
                    </Text>
                  </View>

                  <View style={styles.playButton}>
                    <Icon name="chevron" size={22} color="#FFFFFF" />
                  </View>
                </Pressable>
              </View>
            );
          }

          const left = i % 2 === 0;
          const label = (
            <View style={[styles.side, !left && styles.sideEnd]}>
              <Text style={[styles.sideTitle, locked && styles.lockedText]}>Fase {n}</Text>
              {done && <Stars count={record.stars} />}
            </View>
          );

          return (
            <View key={n} style={styles.step}>
              {rail}
              <View style={styles.row}>
                {left ? <View style={styles.side} /> : label}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    locked
                      ? `Fase ${n}, bloqueada`
                      : `Fase ${n}, ${record.stars} de 3 estrelas, melhor: ${record.bestMoves} movimentos`
                  }
                  accessibilityState={{ disabled: locked }}
                  disabled={locked}
                  onPress={() => navigate('game', { level: n })}
                  style={[styles.node, done && styles.nodeDone, locked && styles.nodeLocked]}
                >
                  {locked ? (
                    <Icon name="lock" size={22} color={theme.colors.inkFaint} />
                  ) : (
                    <Icon name="check" size={26} color="#FFFFFF" />
                  )}
                </Pressable>

                {left ? label : <View style={styles.side} />}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3].map((i) => (
        <Icon
          key={i}
          name="star"
          size={13}
          filled={i <= count}
          color={i <= count ? theme.colors.gold : theme.colors.line}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.space.md,
    ...theme.shadow.soft,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontFamily: fonts.displayBold, fontSize: 19, color: theme.colors.ink },
  summaryLabel: { fontFamily: fonts.body, fontSize: 11, color: theme.colors.inkMuted },
  summaryDivider: { width: 1, height: 34, backgroundColor: theme.colors.line },

  // ------------------------------------------------------------- trilha
  trail: { alignItems: 'center' },
  step: { alignItems: 'center', width: '100%' },
  rail: { width: 4, height: 22, borderRadius: 2, backgroundColor: theme.colors.line },
  railDone: { backgroundColor: theme.colors.primary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.md,
    width: '100%',
  },

  node: {
    width: NODE,
    height: NODE,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.primaryDeep,
  },
  nodeDone: { backgroundColor: theme.colors.primary },
  nodeLocked: {
    backgroundColor: theme.colors.locked,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.lockedLine,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.lockedLine,
  },

  /**
   * Os dois lados dividem o que sobra em partes iguais: é isso que mantém o nó
   * sobre o trilho. Largura fixa estouraria a tela de um iPhone SE.
   */
  side: { flex: 1, gap: 4 },
  sideEnd: { alignItems: 'flex-end' },
  sideTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: theme.colors.ink },
  lockedText: { color: theme.colors.inkFaint, fontFamily: fonts.body },
  stars: { flexDirection: 'row', gap: 2 },

  // --------------------------------------------------------- fase atual
  currentCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: theme.space.lg,
    ...theme.shadow.soft,
  },
  currentNumber: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.table,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentNumberText: { fontFamily: fonts.displayBold, fontSize: 26, color: '#FFFFFF' },
  currentTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.9,
    color: theme.colors.primary,
  },
  currentTitle: { fontFamily: fonts.display, fontSize: 20, color: theme.colors.ink },
  currentMeta: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },
  currentReward: { fontFamily: fonts.bodyMed, fontSize: 11, color: theme.colors.gold700 },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primaryDeep,
  },

  // ------------------------------------------------------------ medalha
  medalRow: { alignItems: 'center', gap: 6 },
  currentWrap: { alignItems: 'center', width: '100%' },
  medal: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.lockedLine,
  },
  medalOn: { backgroundColor: theme.colors.goldSoft, borderColor: theme.colors.gold },
  medalText: { fontFamily: fonts.bodyMed, fontSize: 12, color: theme.colors.inkFaint },
  medalTextOn: { color: theme.colors.gold700, fontFamily: fonts.bodySemi },
});
