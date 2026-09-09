import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mission } from '../data/missions';
import Icon from '../ui/Icon';
import { fonts, theme } from '../theme';
import { Button, ProgressBar, Surface } from '../ui/primitives';

export default function MissionCard({
  mission,
  current,
  target,
  done,
  claimed,
  onClaim,
}: {
  mission: Mission;
  current: number;
  target: number;
  done: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
  return (
    <Surface style={[styles.card, claimed && styles.claimed]}>
      <View style={styles.row}>
        <Icon name={mission.icon} size={22} color={theme.colors.primary} />

        <View style={styles.middle}>
          <Text style={styles.title}>{mission.title}</Text>
          <View style={styles.barRow}>
            <ProgressBar
              value={current}
              max={target}
              height={8}
              color={done ? theme.colors.good : theme.colors.secondary}
            />
          </View>
          <Text style={styles.progress}>
            {current}/{target} · +{mission.xp} XP · +{mission.coins} moedas
          </Text>
        </View>
      </View>

      {claimed ? (
        <Text style={styles.claimedTag}>Resgatado ✓</Text>
      ) : (
        <Button
          label={done ? 'Resgatar' : 'Em andamento'}
          variant={done ? 'gold' : 'ghost'}
          disabled={!done}
          small
          full
          onPress={onClaim}
          style={{ marginTop: theme.space.md }}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.space.lg },
  claimed: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center' },
  middle: { flex: 1, gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 15, color: theme.colors.ink },
  barRow: { alignSelf: 'stretch' },
  progress: { fontFamily: fonts.bodyMed, fontSize: 11, color: theme.colors.inkMuted },
  claimedTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: theme.colors.good,
    marginTop: theme.space.md,
    textAlign: 'center',
  },
});
