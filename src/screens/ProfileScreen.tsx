import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { characterOf } from '../data/characters';
import { ACHIEVEMENTS, isUnlocked } from '../data/achievements';
import { useNavigation } from '../navigation/Router';
import { usePlayer } from '../player/PlayerProvider';
import { totalStars } from '../player/progression';
import { fonts, theme } from '../theme';
import Icon, { IconName } from '../ui/Icon';
import Screen from '../ui/Screen';
import { Avatar, Button, ProgressBar, SectionTitle, Surface } from '../ui/primitives';

export default function ProfileScreen() {
  const { player, level } = usePlayer();
  const { goBack, navigate } = useNavigation();

  const character = characterOf(player.equipped);
  const drops = player.stats.correctDrops + player.stats.wrongDrops;
  const accuracy = drops === 0 ? 100 : Math.round((player.stats.correctDrops / drops) * 100);
  const favorites = Object.values(player.words).filter((w) => w.favorite).length;
  const unlocked = ACHIEVEMENTS.filter((a) => isUnlocked(a, player)).length;

  const stats: { icon: IconName; color: string; value: string; label: string }[] = [
    { icon: 'flame', color: theme.colors.streak, value: `${player.streak}`, label: 'sequência atual' },
    { icon: 'calendar', color: theme.colors.ink60, value: `${player.bestStreak}`, label: 'melhor sequência' },
    { icon: 'book', color: theme.colors.secondary, value: `${Object.keys(player.words).length}`, label: 'palavras' },
    { icon: 'star', color: theme.colors.gold, value: `${totalStars(player.levels)}`, label: 'estrelas' },
    { icon: 'deck', color: theme.colors.primary, value: `${Object.keys(player.levels).length}`, label: 'fases concluídas' },
    { icon: 'target', color: theme.colors.primary, value: `${accuracy}%`, label: 'precisão' },
    { icon: 'heart', color: theme.colors.danger, value: `${favorites}`, label: 'favoritas' },
    { icon: 'trophy', color: theme.colors.gold700, value: `${unlocked}`, label: 'conquistas' },
  ];

  return (
    <Screen title="Perfil" onBack={goBack}>
      <Surface style={styles.head}>
        <Avatar emoji={character.emoji} tint={character.tint} rarity={character.rarity} mark={character.mark} size={78} />
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.character}>
          {character.name} · {theme.rarity[character.rarity].label}
        </Text>

        <View style={styles.xpRow}>
          <Text style={styles.levelText}>Nível {level.level}</Text>
          <Text style={styles.xpText}>
            {level.into} / {level.need} XP
          </Text>
        </View>
        <ProgressBar value={level.into} max={level.need} color={theme.colors.xp} />
      </Surface>

      <View>
        <SectionTitle title="Seus números" />
        <View style={styles.grid}>
          {stats.map((s, i) => (
            <Surface key={i} style={styles.stat}>
              <Icon name={s.icon} size={20} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Surface>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.space.sm }}>
        <Button
          label="Meu vocabulário"
          icon="book"
          variant="secondary"
          full
          onPress={() => navigate('vocabulary')}
        />
        <Button label="Ajustes" icon="gear" variant="ghost" full onPress={() => navigate('settings')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 4 },
  name: { fontFamily: fonts.displayBold, fontSize: 22, color: theme.colors.ink, marginTop: 6 },
  character: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: theme.space.lg,
    marginBottom: 4,
  },
  levelText: { fontFamily: fonts.display, fontSize: 14, color: theme.colors.ink },
  xpText: { fontFamily: fonts.bodyMed, fontSize: 12, color: theme.colors.inkMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  stat: { flexGrow: 1, flexBasis: '44%', alignItems: 'center', gap: 2, paddingVertical: theme.space.lg },

  statValue: { fontFamily: fonts.displayBold, fontSize: 20, color: theme.colors.ink },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: theme.colors.inkMuted, textAlign: 'center' },
});
