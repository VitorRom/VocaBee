import React, { useEffect, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Word } from '../data/words';
import { usePlayer } from '../player/PlayerProvider';
import { XP_PER_WORD } from '../player/progression';
import { LevelReward } from '../player/types';
import { useSpeaker } from '../speech';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';
import { LogoMark } from '../ui/Logo';
import { Button } from '../ui/primitives';

/** Elogio proporcional ao resultado — sem infantilizar. */
function headline(won: boolean, stars: number, perfect: boolean): string {
  if (!won) return 'Acabaram os movimentos';
  if (perfect) return 'Perfeito!';
  if (stars === 3) return 'Mandou muito bem!';
  if (stars === 2) return 'Boa partida!';
  return 'Fase concluída!';
}

export default function LevelCompleteModal({
  visible,
  won,
  level,
  reward,
  movesUsed,
  newWords,
  hasNext,
  onNext,
  onReplay,
  onHome,
}: {
  visible: boolean;
  won: boolean;
  level: number;
  reward: LevelReward | null;
  movesUsed: number;
  newWords: Word[];
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
}) {
  const { player } = usePlayer();
  const pop = useRef(new Animated.Value(0)).current;
  const still = player.settings.reduceMotion;
  const speaker = useSpeaker(player.settings.sound);

  useEffect(() => {
    if (!visible) return;
    if (still) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
  }, [visible, pop, still]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const stars = reward?.stars ?? 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onHome}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity: pop, transform: [{ scale }] }]}>
          <View style={[styles.crest, !won && { backgroundColor: theme.colors.coral50 }]}>
            <Icon
              name={won ? 'trophy' : 'calendar'}
              size={38}
              color={won ? theme.colors.gold : theme.colors.danger}
            />
          </View>
          {/* A Bia comemora junto quando deu certo; numa derrota ela some,
              porque mascote sorrindo em cima de quem perdeu é deboche. */}
          <View style={styles.headRow}>
            {won && (
              <View style={styles.mascot}>
                <LogoMark size={44} />
              </View>
            )}
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.title}>{headline(won, stars, !!reward?.perfect)}</Text>
              <Text style={styles.level}>Fase {level}</Text>
            </View>
          </View>

          {won && (
            <View style={styles.starRow} accessibilityLabel={`${stars} de 3 estrelas`}>
              {[1, 2, 3].map((i) => (
                <Text key={i} style={[styles.star, i > stars && styles.starOff]}>
                  ★
                </Text>
              ))}
            </View>
          )}

          <View style={styles.stats}>
            <Stat label="Movimentos" value={String(movesUsed)} />
            <Stat label="Precisão" value={`${Math.round((reward?.accuracy ?? 1) * 100)}%`} />
            <Stat label="Palavras" value={String(newWords.length)} />
          </View>

          {!!reward && (reward.xp > 0 || reward.coins > 0) && (
            <View style={styles.rewards}>
              {reward.xp > 0 && (
                <View style={[styles.reward, { backgroundColor: '#F1ECFD' }]}>
                  <Icon name="bolt" size={16} filled color={theme.colors.xp} />
                  <Text style={[styles.rewardText, { color: theme.colors.xp }]}>
                    +{reward.xp} XP
                  </Text>
                </View>
              )}
              {reward.coins > 0 && (
                <View style={[styles.reward, { backgroundColor: '#FFF6DC' }]}>
                  <Icon name="coin" size={16} color={theme.colors.gold700} />
                  <Text style={[styles.rewardText, { color: theme.colors.goldInk }]}>
                    +{reward.coins}
                  </Text>
                </View>
              )}
            </View>
          )}

          {reward?.leveledUp && (
            <Text style={styles.levelUp}>Você chegou ao nível {reward.newPlayerLevel}!</Text>
          )}

          {newWords.length > 0 && (
            <View style={styles.wordsBlock}>
              <Text style={styles.wordsTitle}>
                PALAVRAS DESCOBERTAS · +{XP_PER_WORD} XP CADA
              </Text>
              <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                {newWords.map((w) => (
                  <Text
                    key={w.w}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvir ${w.w}`}
                    onPress={() => speaker.speak(w.w)}
                    style={styles.wordLine}
                  >
                    <Text style={styles.wordEn}>{w.w}</Text>
                    <Text style={styles.wordPt}>{'   '}{w.pt}</Text>
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actions}>
            {won && hasNext && <Button label="Próxima fase" full onPress={onNext} />}
            {!won && <Button label="Tentar de novo" full onPress={onReplay} />}
            <Button
              label={won ? 'Voltar ao início' : 'Voltar ao início'}
              variant="ghost"
              full
              onPress={onHome}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  mascot: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: theme.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,40,20,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.xl,
    alignItems: 'center',
  },
  crest: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: theme.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: theme.colors.ink,
    marginTop: 4,
    textAlign: 'center',
  },
  level: { fontFamily: fonts.bodyMed, fontSize: 13, color: theme.colors.inkMuted },

  starRow: { flexDirection: 'row', gap: 6, marginTop: theme.space.md },
  star: { fontSize: 34, color: theme.colors.gold },
  starOff: { color: theme.colors.line },

  stats: {
    flexDirection: 'row',
    marginTop: theme.space.lg,
    alignSelf: 'stretch',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: fonts.displayBold, fontSize: 20, color: theme.colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: theme.colors.inkMuted },

  rewards: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.lg },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },

  rewardText: { fontFamily: fonts.displayBold, fontSize: 15 },

  levelUp: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: theme.colors.xp,
    marginTop: theme.space.md,
  },

  wordsBlock: {
    alignSelf: 'stretch',
    marginTop: theme.space.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
  },
  wordsTitle: {
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.9,
    fontSize: 11,
    color: theme.colors.inkMuted,
    marginBottom: 6,
  },
  wordLine: { paddingVertical: 3 },
  wordEn: { fontFamily: fonts.bodyBold, fontSize: 14, color: theme.colors.ink },
  wordPt: { fontFamily: fonts.body, fontSize: 13, color: theme.colors.inkMuted },

  actions: { alignSelf: 'stretch', gap: theme.space.sm, marginTop: theme.space.xl },
});
