import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../player/PlayerProvider';
import { fonts, theme } from '../theme';
import Icon, { IconName } from '../ui/Icon';
import { Button } from '../ui/primitives';

export type CelebrationPayload = {
  icon: IconName;
  title: string;
  subtitle?: string;
  rewards?: { icon: IconName; label: string }[];
};

/**
 * Modal de comemoração — recompensa diária, subir de nível, conquista.
 * Um componente só para os três, em vez de três parecidos.
 */
export default function CelebrationModal({
  payload,
  onClose,
}: {
  payload: CelebrationPayload | null;
  onClose: () => void;
}) {
  const { player } = usePlayer();
  const pop = useRef(new Animated.Value(0)).current;
  const still = player.settings.reduceMotion;

  useEffect(() => {
    if (!payload) return;
    if (still) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [payload, pop, still]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Modal visible={!!payload} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {payload && (
          <Animated.View style={[styles.card, { opacity: pop, transform: [{ scale }] }]}>
            <View style={styles.iconBadge}>
              <Icon name={payload.icon} size={38} color={theme.colors.primaryDeep} />
            </View>
            <Text style={styles.title}>{payload.title}</Text>
            {!!payload.subtitle && <Text style={styles.subtitle}>{payload.subtitle}</Text>}

            {!!payload.rewards?.length && (
              <View style={styles.rewards}>
                {payload.rewards.map((r, i) => (
                  <View key={i} style={styles.reward}>
                    <Icon name={r.icon} size={16} color={theme.colors.gold700} />
                    <Text style={styles.rewardLabel}>{r.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <Button label="Continuar" onPress={onClose} full style={{ marginTop: theme.space.lg }} />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,32,18,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.xl,
    alignItems: 'center',
  },
  iconBadge: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: theme.colors.ink,
    marginTop: theme.space.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: theme.colors.inkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  rewards: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.lg },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rewardLabel: { fontFamily: fonts.displayBold, fontSize: 15, color: theme.colors.ink },
});
