import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '../navigation/Router';
import { INTRO } from '../data/tour';
import { usePlayer } from '../player/PlayerProvider';
import { useNarration } from '../speech';
import { fonts, theme } from '../theme';
import Icon, { IconName } from '../ui/Icon';
import Honeycomb from '../ui/Honeycomb';
import Logo, { LogoBadge } from '../ui/Logo';
import { TOP_INSET } from '../ui/Screen';
import { Button } from '../ui/primitives';

/** O ícone de cada tela. O texto vem de `src/data/tour.ts`, com a narração. */
const ICONS: Record<string, IconName> = {
  'intro-1': 'deck',
  'intro-2': 'deck',
  'intro-3': 'book',
};

export default function OnboardingScreen() {
  const { player, finishOnboarding } = usePlayer();
  const { navigate } = useNavigation();
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const slide = INTRO[index];
  useNarration(slide.id, player.settings.sound);

  /**
   * Da apresentação direto para a fase 1: a mecânica se aprende jogando, e é lá
   * que o tour continua, passo a passo. Passar pela Home antes só adiaria isso.
   *
   * Navegar explicitamente também conserta quem apagou o progresso a partir dos
   * Ajustes — sem isto, ele voltava para os Ajustes.
   */
  const start = () => {
    finishOnboarding();
    navigate('game', { level: 1 });
  };
  const last = index === INTRO.length - 1;

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryDeep]}
      style={styles.root}
    >
      {/* A colmeia é decoração: fica atrás de tudo e em opacidade baixa. */}
      <View style={styles.comb} pointerEvents="none">
        <Honeycomb width={width} height={230} radius={40} opacity={0.28} />
      </View>

      <View style={styles.content}>
        <View style={styles.crest}>
          {index === 0 ? (
            <LogoBadge size={104} background="transparent" />
          ) : (
            <Icon name={ICONS[slide.id]} size={56} color="#FFFFFF" />
          )}
        </View>
        {index === 0 ? (
          <Logo size={38} onDark tagline={false} />
        ) : (
          <Text style={styles.title}>{slide.title}</Text>
        )}
        <Text style={styles.text}>{slide.text}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {INTRO.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>

        <Button
          label={last ? 'Jogar a fase 1' : 'Continuar'}
          variant="gold"
          full
          onPress={() => (last ? start() : setIndex(index + 1))}
        />

        {!last && (
          <Text accessibilityRole="button" onPress={start} style={styles.skip}>
            Pular
          </Text>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: TOP_INSET, paddingHorizontal: theme.space.xl, paddingBottom: 40 },
  comb: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, overflow: 'hidden' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.md },
  crest: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: theme.colors.green500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 27,
    color: '#FFF',
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.textMuted,
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: { gap: theme.space.lg, alignItems: 'center', width: '100%', maxWidth: 380, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotOn: { backgroundColor: '#FFF', width: 22 },
  skip: { fontFamily: fonts.bodySemi, fontSize: 13, color: theme.colors.textMuted },
});
