import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import CelebrationModal, { CelebrationPayload } from '../components/CelebrationModal';
import MissionCard from '../components/MissionCard';
import { characterOf } from '../data/characters';
import { DAILY_REWARDS } from '../data/dailyRewards';
import { DAILY_MISSIONS } from '../data/missions';
import { useNavigation } from '../navigation/Router';
import { missionStatus, usePlayer } from '../player/PlayerProvider';
import { today, totalStars } from '../player/progression';
import { fonts, theme } from '../theme';
import Honeycomb from '../ui/Honeycomb';
import Icon, { IconName } from '../ui/Icon';
import { TAB_BAR_H, TOP_INSET } from '../ui/Screen';
import { Avatar, Button, ProgressBar, SectionTitle, StatChip, Surface } from '../ui/primitives';

const SHORTCUTS: { route: 'vocabulary' | 'rewards' | 'shop' | 'settings'; icon: IconName; label: string }[] = [
  { route: 'vocabulary', icon: 'grid', label: 'Vocabulário' },
  { route: 'rewards', icon: 'trophy', label: 'Recompensas' },
  { route: 'shop', icon: 'store', label: 'Loja' },
  { route: 'settings', icon: 'gear', label: 'Ajustes' },
];

export default function HomeScreen() {
  const { player, level, nextLevel, claimDaily, claimMission } = usePlayer();
  const { navigate } = useNavigation();
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const character = characterOf(player.equipped);
  const dailyAvailable = player.daily.lastClaim !== today();
  const stars = totalStars(player.levels);
  const wordsLearned = Object.keys(player.words).length;

  const onDaily = () => {
    const got = claimDaily();
    if (!got) return;
    setCelebration({
      icon: got.day === 7 ? 'trophy' : 'coin',
      title: got.day === 7 ? 'Baú da semana!' : `Dia ${got.day}`,
      subtitle: 'Recompensa diária resgatada. Volte amanhã!',
      rewards: [
        { icon: 'coin' as const, label: `+${got.coins}` },
        ...(got.xp ? [{ icon: 'bolt' as const, label: `+${got.xp} XP` }] : []),
      ],
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_BAR_H + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------------------------------------ cabeçalho */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDeep]}
          style={styles.header}
        >
          <View style={styles.headerInner}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
              onPress={() => navigate('profile')}
              style={styles.identity}
            >
              <Avatar emoji={character.emoji} tint={character.tint} rarity={character.rarity} mark={character.mark} />
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.levelLabel}>Nível {level.level}</Text>
              </View>
            </Pressable>

            <View style={styles.headerStats}>
              <StatChip icon="coin" value={player.coins} color={theme.colors.gold700} bg={theme.colors.goldSoft} label="Moedas" />
              <StatChip icon="flame" value={player.streak} color={theme.colors.coral700} bg={theme.colors.coral50} label="Sequência em dias" />
            </View>
          </View>

          <View style={styles.xpBlock}>
            <ProgressBar
              value={level.into}
              max={level.need}
              color={theme.colors.goldSoft}
              height={9}
            />
            <Text style={styles.xpText}>
              {level.need - level.into} XP para o nível {level.level + 1}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* -------------------------------------------------- jogar agora */}
          <Surface style={styles.journey}>
            {/* Colmeia atrás do cartão: o mesmo motivo da abertura. */}
            <View style={styles.journeyComb} pointerEvents="none">
              <Honeycomb width={420} height={180} radius={30} opacity={0.32} />
            </View>

            <View style={styles.journeyTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.journeyKicker}>Jornada do Inglês</Text>
                <Text style={styles.journeyLevel}>Fase {nextLevel}</Text>
              </View>
              <View style={styles.starsBox}>
                <View style={styles.starsRow}>
                <Icon name="star" size={16} filled color={theme.colors.gold} />
                <Text style={styles.starsValue}>{stars}</Text>
              </View>
                <Text style={styles.starsLabel}>estrelas</Text>
              </View>
            </View>

            <Button
              label={nextLevel === 1 ? 'Começar a jogar' : 'Continuar jogando'}
              icon="chevron"
              full
              onPress={() => navigate('game', { level: nextLevel })}
            />

            <Pressable accessibilityRole="button" onPress={() => navigate('journey')}>
              <Text style={styles.journeyLink}>Ver todas as fases →</Text>
            </Pressable>
          </Surface>

          {/* ------------------------------------------------ diária + words */}
          {dailyAvailable ? (
            <Surface style={styles.daily}>
              <View style={styles.dailyBadge}>
                <Icon name="calendar" size={22} color={theme.colors.gold700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyTitle}>Recompensa diária</Text>
                <Text style={styles.dailySub}>
                  Dia {((player.daily.index + 1) % DAILY_REWARDS.length) + 1} do ciclo
                </Text>
              </View>
              <Button label="Resgatar" variant="gold" small onPress={onDaily} />
            </Surface>
          ) : (
            <Surface style={styles.daily}>
              <View style={[styles.dailyBadge, { backgroundColor: theme.colors.primarySoft }]}>
                <Icon name="book" size={22} color={theme.colors.green700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyTitle}>
                  {wordsLearned} {wordsLearned === 1 ? 'palavra' : 'palavras'} no seu vocabulário
                </Text>
                <Text style={styles.dailySub}>Volte amanhã para a próxima recompensa</Text>
              </View>
              <Button
                label="Ver"
                variant="ghost"
                small
                onPress={() => navigate('vocabulary')}
              />
            </Surface>
          )}

          {/* ------------------------------------------------------ missões */}
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

          {/* ------------------------------------------------------ atalhos */}
          <View>
            <SectionTitle title="Atalhos" />
            <View style={styles.shortcuts}>
              {SHORTCUTS.map((s) => (
                <Pressable
                  key={s.route}
                  accessibilityRole="button"
                  accessibilityLabel={s.label}
                  onPress={() => navigate(s.route)}
                  style={styles.shortcut}
                >
                  <Icon name={s.icon} size={22} color={theme.colors.green700} />
                  <Text style={styles.shortcutLabel}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <CelebrationModal payload={celebration} onClose={() => setCelebration(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },

  header: {
    paddingTop: TOP_INSET,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xl,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, flex: 1 },
  identityText: { flex: 1 },
  name: { color: '#FFF', fontFamily: fonts.displayBold, fontSize: 18 },
  levelLabel: { color: theme.colors.textMuted, fontFamily: fonts.bodyMed, fontSize: 12 },
  headerStats: { gap: 6, alignItems: 'flex-end' },
  xpBlock: { marginTop: theme.space.lg, gap: 4 },
  xpText: { color: theme.colors.textMuted, fontFamily: fonts.bodyMed, fontSize: 11 },

  body: {
    padding: theme.space.lg,
    gap: theme.space.xl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },

  // O cartão de jogar é o único escuro da Home: é para onde o olho vai.
  journey: {
    gap: theme.space.md,
    alignItems: 'stretch',
    backgroundColor: theme.colors.table,
    overflow: 'hidden',
  },
  journeyComb: { position: 'absolute', right: -40, bottom: -30 },
  journeyTop: { flexDirection: 'row', alignItems: 'center' },
  journeyKicker: { fontFamily: fonts.bodySemi, fontSize: 12, color: theme.colors.onTableLabel },
  journeyLevel: { fontFamily: fonts.displayBold, fontSize: 26, color: '#FFFFFF' },
  starsBox: { alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsValue: { fontFamily: fonts.displayBold, fontSize: 18, color: '#FFFFFF' },
  starsLabel: { fontFamily: fonts.body, fontSize: 10, color: theme.colors.inkFaint },
  journeyLink: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: theme.colors.secondaryDeep,
    textAlign: 'center',
  },

  daily: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  dailyBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyTitle: { fontFamily: fonts.display, fontSize: 15, color: theme.colors.ink },
  dailySub: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },

  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  shortcut: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 84,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...theme.shadow.soft,
  },

  shortcutLabel: { fontFamily: fonts.display, fontSize: 13, color: theme.colors.ink },
});
