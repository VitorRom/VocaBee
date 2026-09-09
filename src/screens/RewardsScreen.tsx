import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CelebrationModal, { CelebrationPayload } from '../components/CelebrationModal';
import MissionCard from '../components/MissionCard';
import { ACHIEVEMENTS, isUnlocked } from '../data/achievements';
import { DAILY_REWARDS } from '../data/dailyRewards';
import { DAILY_MISSIONS } from '../data/missions';
import { useNavigation } from '../navigation/Router';
import { missionStatus, usePlayer } from '../player/PlayerProvider';
import { today } from '../player/progression';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';
import Screen from '../ui/Screen';
import { Button, ProgressBar, SectionTitle, Surface } from '../ui/primitives';

export default function RewardsScreen() {
  const { player, claimDaily, claimMission } = usePlayer();
  const { goBack } = useNavigation();
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const claimedToday = player.daily.lastClaim === today();
  const cycleIndex = player.daily.index;
  const unlockedCount = ACHIEVEMENTS.filter((a) => isUnlocked(a, player)).length;

  return (
    <Screen
      title="Recompensas"
      subtitle={`${unlockedCount} de ${ACHIEVEMENTS.length} conquistas`}
      onBack={goBack}
    >
      {/* ----------------------------------------------------- sequência */}
      <Surface style={styles.streak}>
        <View style={styles.streakBadge}>
          <Icon name="flame" size={26} color={theme.colors.streak} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakValue}>
            {player.streak} {player.streak === 1 ? 'dia' : 'dias'} seguidos
          </Text>
          <Text style={styles.streakText}>
            {player.streak === 0
              ? 'Jogue hoje para começar uma sequência.'
              : `Seu recorde é de ${player.bestStreak} dias. Continue assim!`}
          </Text>
        </View>
      </Surface>

      {/* -------------------------------------------------- diária 7 dias */}
      <View>
        <SectionTitle title="Recompensa diária" />
        <Surface>
          <View style={styles.days}>
            {DAILY_REWARDS.map((r, i) => {
              const done = claimedToday ? i <= cycleIndex : i < cycleIndex;
              const isNext = !claimedToday && i === (cycleIndex + (player.daily.lastClaim ? 1 : 0)) % 7;
              return (
                <View
                  key={r.day}
                  style={[styles.day, done && styles.dayDone, isNext && styles.dayNext]}
                >
                  <Text style={[styles.dayLabel, done && styles.dayLabelDone]}>D{r.day}</Text>
                  <Icon
                    name={r.chest ? 'trophy' : 'coin'}
                    size={14}
                    color={done ? theme.colors.green700 : theme.colors.gold700}
                  />
                  <Text style={[styles.dayValue, done && styles.dayLabelDone]}>{r.coins}</Text>
                </View>
              );
            })}
          </View>

          <Button
            label={claimedToday ? 'Já resgatado hoje' : 'Resgatar recompensa'}
            variant={claimedToday ? 'ghost' : 'gold'}
            disabled={claimedToday}
            full
            style={{ marginTop: theme.space.lg }}
            onPress={() => {
              const got = claimDaily();
              if (!got) return;
              setCelebration({
                icon: got.day === 7 ? 'trophy' : 'coin',
                title: got.day === 7 ? 'Baú da semana!' : `Dia ${got.day}`,
                subtitle: 'Volte amanhã para continuar o ciclo.',
                rewards: [
                  { icon: 'coin' as const, label: `+${got.coins}` },
                  ...(got.xp ? [{ icon: 'bolt' as const, label: `+${got.xp} XP` }] : []),
                ],
              });
            }}
          />
        </Surface>
      </View>

      {/* ---------------------------------------------------- missões */}
      <View>
        <SectionTitle title="Missões de hoje" />
        <View style={{ gap: theme.space.md }}>
          {DAILY_MISSIONS.map((m) => {
            const s = missionStatus(player, m);
            return (
              <MissionCard
                key={m.id}
                mission={m}
                current={s.current}
                target={s.target}
                done={s.done}
                claimed={s.claimed}
                onClaim={() => {
                  if (!claimMission(m.id)) return;
                  setCelebration({
                    icon: m.icon,
                    title: 'Missão concluída!',
                    subtitle: m.title,
                    rewards: [
                      { icon: 'bolt' as const, label: `+${m.xp} XP` },
                      { icon: 'coin' as const, label: `+${m.coins}` },
                    ],
                  });
                }}
              />
            );
          })}
        </View>
      </View>

      {/* -------------------------------------------------- conquistas */}
      <View>
        <SectionTitle title="Conquistas" />
        <View style={{ gap: theme.space.md }}>
          {ACHIEVEMENTS.map((a) => {
            const { current, target } = a.progress(player);
            const done = current >= target;
            return (
              <Surface key={a.id} style={[styles.achievement, !done && styles.achievementLocked]}>
                <View style={[styles.achievementIcon, done && styles.achievementIconOn]}>
                  <Icon
                    name={a.icon}
                    size={22}
                    color={done ? theme.colors.gold700 : theme.colors.inkFaint}
                  />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.achievementHead}>
                    <Text style={styles.achievementTitle}>{a.title}</Text>
                    {done && <Text style={styles.done}>Concluída ✓</Text>}
                  </View>
                  <Text style={styles.achievementText}>{a.description}</Text>

                  {!done && (
                    <ProgressBar
                      value={current}
                      max={target}
                      height={7}
                      color={theme.colors.secondary}
                      label={`${Math.min(current, target)}/${target}`}
                    />
                  )}

                  <Text style={styles.achievementReward}>
                    +{a.xp} XP · +{a.coins} moedas
                  </Text>
                </View>
              </Surface>
            );
          })}
        </View>
      </View>

      <CelebrationModal payload={celebration} onClose={() => setCelebration(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  streakBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.coral50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: { fontFamily: fonts.displayBold, fontSize: 18, color: theme.colors.ink },
  streakText: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },

  days: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayDone: { backgroundColor: theme.colors.primarySoft },
  dayNext: { borderColor: theme.colors.gold },
  dayLabel: { fontFamily: fonts.display, fontSize: 10, color: theme.colors.inkFaint },
  dayLabelDone: { color: theme.colors.primaryDeep },

  dayValue: { fontFamily: fonts.displayBold, fontSize: 11, color: theme.colors.ink },

  achievement: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center' },
  achievementLocked: { opacity: 0.8 },
  achievementIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  achievementIconOn: { backgroundColor: '#FFF3D0' },
  achievementHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  achievementTitle: { fontFamily: fonts.display, fontSize: 15, color: theme.colors.ink },
  done: { fontFamily: fonts.bodySemi, fontSize: 11, color: theme.colors.good },
  achievementText: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },
  achievementReward: { fontFamily: fonts.bodyMed, fontSize: 11, color: theme.colors.goldInk },
});
