import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_BY_ID } from '../data/words';
import { GameCard } from '../game/engine';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';
import { LogoMark } from '../ui/Logo';

type Props = {
  card: GameCard | null;
  faceDown?: boolean;
  width: number;
  height: number;
  /** Carta acessível — mostra a fonética e fica em opacidade cheia. */
  active?: boolean;
  highlighted?: boolean;
  /** Cópia flutuante que segue o dedo. */
  lifted?: boolean;
  /** Muda de valor a cada recusa: pinta a borda de coral e treme. */
  errorToken?: number;
  /** Some do fluxo enquanto a carta está na mão. */
  ghost?: boolean;
  /**
   * Ouvir a pronúncia da carta. Recebe a carta em vez de fechar sobre ela para
   * continuar sendo a mesma função entre renderizações — é o que mantém o
   * `React.memo` valendo alguma coisa durante o arrasto.
   */
  onSpeak?: (card: GameCard) => void;
};

/**
 * Tamanho da palavra: 15px, caindo para 13px acima de 9 letras — nunca menos,
 * porque abaixo disso não se lê numa carta de 80dp.
 */
function wordSize(text: string, width: number): number {
  const scale = width / 80;
  return (text.length > 9 ? 13 : 15) * scale;
}

function CardFace({
  card,
  faceDown,
  width,
  height,
  active = true,
  highlighted,
  lifted,
  errorToken = 0,
  ghost,
  onSpeak,
}: Props) {
  const glow = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [errored, setErrored] = useState(false);

  // A carta segue virada para baixo até a metade da animação de virar.
  const [renderBack, setRenderBack] = useState(!!faceDown);
  const wasFaceDown = useRef(!!faceDown);

  useEffect(() => {
    const was = wasFaceDown.current;
    wasFaceDown.current = !!faceDown;

    if (was && !faceDown) {
      setRenderBack(true);
      Animated.timing(flip, { toValue: 0, duration: 130, useNativeDriver: true }).start(() => {
        setRenderBack(false);
        Animated.timing(flip, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      });
    } else {
      setRenderBack(!!faceDown);
    }
  }, [faceDown, flip]);

  /**
   * Errar é um evento, não um estado da carta. Ao mudar de coluna a carta troca
   * de lista e o componente remonta; sem esta referência a instância nova nasce
   * com o contador de um erro antigo e pisca o X em cima de uma jogada válida.
   */
  const errorSeen = useRef(errorToken);

  useEffect(() => {
    if (errorToken === errorSeen.current) return;
    errorSeen.current = errorToken;
    setErrored(true);
    shake.setValue(0);
    // ±4px, 400ms — o mesmo tempo do tremor da mesa.
    Animated.sequence(
      [1, -1, 0.6, -0.3, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 80, useNativeDriver: true }),
      ),
    ).start();
    const t = setTimeout(() => setErrored(false), 600);
    return () => clearTimeout(t);
  }, [errorToken, shake]);

  useEffect(() => {
    Animated.spring(glow, {
      toValue: highlighted ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [highlighted, glow]);

  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });
  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['1.5deg', '-1.5deg'] });

  const radius = width * 0.15;
  const edge = Math.max(2, width * 0.038);
  const isKey = card?.kind === 'key';
  const category = card ? CATEGORY_BY_ID[card.categoryId] : null;

  /**
   * O alto-falante fica no canto de baixo: o topo da carta é onde a palavra
   * aparece quando ela está empilhada, e cobri-lo esconderia justamente o que
   * o jogador precisa ler.
   */
  const speaker =
    card && onSpeak && active && !ghost && !lifted ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvir a pronúncia de ${card.kind === 'key' ? category?.en : card.word?.w}`}
        onPress={() => onSpeak(card)}
        hitSlop={10}
        style={[styles.speaker, { width: width * 0.3, height: width * 0.3, right: 2, bottom: 2 }]}
      >
        <Icon name="sound" size={width * 0.19} color={theme.colors.ink40} />
      </Pressable>
    ) : null;

  let body: React.ReactNode;

  if (renderBack || !card) {
    // Costas: verde da mesa, moldura tracejada e a marca.
    body = (
      <View style={[styles.fill, styles.back, { borderRadius: radius }]}>
        <View
          style={[
            styles.backPanel,
            { width: width * 0.7, height: height * 0.75, borderRadius: radius * 0.66 },
          ]}
        >
          <LogoMark
            size={width * 0.44}
            body={theme.colors.green200}
            stripe={theme.colors.green800}
            wing={theme.colors.green350}
            detail={false}
          />
        </View>
      </View>
    );
  } else if (isKey) {
    // Dourada: a chave que abre uma vaga de categoria.
    body = (
      <View
        style={[
          styles.fill,
          styles.key,
          { borderRadius: radius, borderBottomWidth: edge },
        ]}
      >
        <Icon name="star" size={width * 0.21} color={theme.colors.gold500} filled />
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.keyName, { fontSize: 13 * (width / 80) }]}
        >
          {category?.en}
        </Text>
        {active && <Text style={styles.keyHint}>ABRE A VAGA</Text>}
        {speaker}
      </View>
    );
  } else {
    const label = card.word?.w ?? '';
    body = (
      <View
        style={[
          styles.fill,
          styles.paper,
          {
            borderRadius: radius,
            borderBottomWidth: edge,
            borderColor: errored ? theme.colors.coral500 : theme.colors.cardEdge,
            borderWidth: errored ? 2 : 0,
            borderBottomColor: errored ? '#C08276' : theme.colors.cardEdge,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={[styles.word, { fontSize: wordSize(label, width), marginTop: height * 0.085 }]}
        >
          {label}
        </Text>

        {errored ? (
          <View style={{ marginTop: 4 }}>
            <Icon name="close" size={width * 0.19} color={theme.colors.coral500} />
          </View>
        ) : (
          active && (
            <Text numberOfLines={1} style={[styles.phonetic, { fontSize: 10 * (width / 80) }]}>
              {card.word?.ph}
            </Text>
          )
        )}
        {speaker}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        lifted && theme.shadow.lifted,
        {
          width,
          height,
          opacity: ghost ? 0.22 : active ? 1 : 0.94,
          transform: [
            { translateX },
            { rotate: lifted ? '-4deg' : rotate },
            { scale: lifted ? 1.06 : 1 },
            { scaleX: flip },
            { scale },
          ],
        },
      ]}
    >
      {body}
      {highlighted && (
        <View style={[styles.ring, { borderRadius: radius + 3 }]} pointerEvents="none" />
      )}
    </Animated.View>
  );
}

/** Impede o navegador de selecionar o texto da carta ao arrastar no PC. */
/**
 * Memoizado de propósito: durante o arrasto, cada mudança de alvo re-renderiza
 * o tabuleiro, e são mais de vinte cartas com animação própria.
 */
export default React.memo(CardFace);

const noSelect = { userSelect: 'none' } as const;

const styles = StyleSheet.create({
  wrap: { position: 'relative', ...noSelect },
  fill: { flex: 1, overflow: 'hidden', alignItems: 'center' },

  paper: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.cardEdge,
    borderBottomColor: theme.colors.cardEdge,
  },
  word: { ...noSelect, fontFamily: fonts.bodySemi, color: theme.colors.ink, textAlign: 'center', paddingHorizontal: 4 },
  phonetic: { ...noSelect, fontFamily: fonts.body, color: theme.colors.ink40, marginTop: 3 },
  speaker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },

  key: {
    backgroundColor: theme.colors.goldCard,
    borderWidth: 1.5,
    borderColor: theme.colors.gold500,
    borderBottomColor: theme.colors.gold300,
    justifyContent: 'center',
    gap: 4,
  },
  keyName: { ...noSelect, fontFamily: fonts.display, color: theme.colors.gold700, textAlign: 'center', paddingHorizontal: 3 },
  keyHint: {
    ...noSelect,
    fontFamily: fonts.bodySemi,
    fontSize: 9,
    letterSpacing: 0.7,
    color: '#C79A4A',
  },

  back: {
    backgroundColor: theme.colors.green700,
    borderWidth: 1,
    borderColor: theme.colors.green400,
    justifyContent: 'center',
  },
  backPanel: {
    borderWidth: 1.5,
    borderColor: theme.colors.green350,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderWidth: 3,
    borderColor: theme.colors.green300,
  },

  dropTarget: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.green300,
    backgroundColor: 'rgba(127,199,155,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    ...noSelect,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.9,
    color: theme.colors.green300,
    textAlign: 'center',
  },
});

/** Contorno tracejado de onde o monte vai pousar. */
export function DropTarget({ width, height }: { width: number; height: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.dropTarget, { width, height, borderRadius: width * 0.15 }]}
    >
      <Text style={styles.dropText}>SOLTE{'\n'}AQUI</Text>
    </View>
  );
}
