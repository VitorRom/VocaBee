import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';

/** Um retângulo da tela, em coordenadas da raiz. */
export type Spot = { x: number; y: number; w: number; h: number };

export type TourStep = {
  id: string;
  title: string;
  text: string;
  /** O que fica iluminado. `null` escurece a tela inteira. */
  spot: Spot | null;
  /**
   * Passo que espera o jogador fazer o gesto, em vez de tocar em "Entendi".
   * Aqui o escuro deixa o toque passar — é o gesto que avança o tour.
   */
  waits?: boolean;
  /** Verdadeiro quando o gesto esperado aconteceu. */
  done?: boolean;
};

type Props = {
  step: TourStep | null;
  /** Quantos passos ao todo, para o jogador saber onde está. */
  total: number;
  index: number;
  /** Onde a área segura começa: o cartão encosta logo abaixo dela. */
  topInset: number;
  onNext: () => void;
  onSkip: () => void;
};

/**
 * O tour de primeira partida.
 *
 * Escurece a tela e recorta um buraco em volta do que está sendo explicado. O
 * recorte é feito com quatro faixas escuras em volta do alvo, e não com
 * máscara: máscara em React Native exige biblioteca, e quatro `View` fazem o
 * mesmo em qualquer plataforma.
 *
 * Os passos que ensinam um gesto não têm botão — eles esperam o gesto de
 * verdade. É o que faz alguém aprender a jogar em vez de ler sobre o jogo.
 */
export default function TourOverlay({ step, total, index, topInset, onNext, onSkip }: Props) {
  const { height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!step) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [step?.id, fade, step]);

  useEffect(() => {
    if (!step?.waits) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [step?.id, step?.waits, pulse, step]);

  if (!step) return null;

  const spot = step.spot;
  const pad = 8;
  const ring = spot
    ? { left: spot.x - pad, top: spot.y - pad, width: spot.w + pad * 2, height: spot.h + pad * 2 }
    : null;

  // O cartão fica do lado oposto ao alvo, para nunca cobrir o que se explica.
  //
  // Nos passos de gesto ele vai SEMPRE para o topo: o cartão tem fundo e
  // intercepta o toque, e embaixo ficam as cartas e as vagas — é de lá que o
  // dedo sai e é lá que ele chega. Em cima só existe o cabeçalho.
  const below = step.waits ? false : !ring || ring.top + ring.height < height / 2;
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* As quatro faixas escuras em volta do alvo. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
        {ring ? (
          <>
            <Dim
              style={{ left: 0, right: 0, top: 0, height: Math.max(0, ring.top) }}
              blocks={!step.waits}
              onPress={onNext}
            />
            <Dim
              style={{ left: 0, right: 0, top: ring.top + ring.height, bottom: 0 }}
              blocks={!step.waits}
              onPress={onNext}
            />
            <Dim
              style={{ left: 0, top: ring.top, width: Math.max(0, ring.left), height: ring.height }}
              blocks={!step.waits}
              onPress={onNext}
            />
            <Dim
              style={{ left: ring.left + ring.width, right: 0, top: ring.top, height: ring.height }}
              blocks={!step.waits}
              onPress={onNext}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.ring, ring, step.waits ? { opacity: glow } : null]}
            />
          </>
        ) : (
          <Dim style={{ left: 0, right: 0, top: 0, bottom: 0 }} blocks={!step.waits} onPress={onNext} />
        )}
      </Animated.View>

      {/* O cartão com a explicação. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.cardWrap,
          // Encostado na área segura, não num valor fixo: numa tela pequena o
          // cartão precisa de cada dp acima das vagas para não cobri-las.
          below ? styles.cardBottom : { top: topInset + 4 },
          { opacity: fade },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.step}>
              {index + 1} de {total}
            </Text>
            <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={10}>
              <Text style={styles.skip}>Pular</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.text}>{step.text}</Text>

          {step.waits ? (
            <View style={styles.waiting}>
              <Icon name="target" size={16} color={theme.colors.gold500} />
              <Text style={styles.waitingText}>Faça isso para continuar</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onNext}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {index + 1 === total ? 'Vamos jogar!' : 'Entendi'}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * Uma faixa escura. Em passo de gesto ela não intercepta o toque: o dedo
 * precisa chegar na carta que está embaixo.
 */
function Dim({
  style,
  blocks,
  onPress,
}: {
  style: object;
  blocks: boolean;
  onPress: () => void;
}) {
  if (!blocks) return <View pointerEvents="none" style={[styles.dim, style]} />;
  return <Pressable style={[styles.dim, style]} onPress={onPress} />;
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(4, 22, 16, 0.78)' },
  ring: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: theme.colors.gold500,
  },

  cardWrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 18 },
  cardBottom: { bottom: 28 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.space.lg,
    gap: 6,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    ...theme.shadow.soft,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    color: theme.colors.inkFaint,
  },
  skip: { fontFamily: fonts.bodySemi, fontSize: 13, color: theme.colors.inkMuted },

  title: { fontFamily: fonts.displayBold, fontSize: 20, color: theme.colors.ink },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: theme.colors.inkMuted },

  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  waitingText: { fontFamily: fonts.bodySemi, fontSize: 13, color: theme.colors.gold700 },

  button: {
    marginTop: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primaryDeep,
  },
  buttonText: { fontFamily: fonts.displayBold, fontSize: 15, color: '#FFFFFF' },
});
