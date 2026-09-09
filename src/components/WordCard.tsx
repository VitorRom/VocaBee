import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Word } from '../data/words';
import { speechNotice, useSpeaker } from '../speech';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';
import { Surface } from '../ui/primitives';

export default function WordCard({
  word,
  categoryLabel,
  favorite,
  soundOn,
  onToggleFavorite,
}: {
  word: Word;
  categoryLabel: string;
  favorite?: boolean;
  soundOn: boolean;
  onToggleFavorite?: () => void;
}) {
  const { speak, speaking, state } = useSpeaker(soundOn);
  const notice = speechNotice(state);

  return (
    <Surface style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.word}>{word.w}</Text>
          <Text style={styles.phonetic}>{word.ph}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvir a pronúncia de ${word.w}`}
            accessibilityState={{ busy: speaking }}
            onPress={() => speak(word.w)}
            hitSlop={8}
            style={[styles.iconButton, speaking && styles.iconButtonSpeaking]}
          >
            <Icon
              name="sound"
              size={19}
              color={speaking ? theme.colors.primaryDeep : theme.colors.ink60}
            />
          </Pressable>

          {!!onToggleFavorite && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              accessibilityState={{ selected: !!favorite }}
              onPress={onToggleFavorite}
              hitSlop={8}
              style={[styles.iconButton, favorite && styles.iconButtonOn]}
            >
              <Icon
              name="heart"
              size={19}
              filled={!!favorite}
              color={favorite ? theme.colors.danger : theme.colors.inkFaint}
            />
            </Pressable>
          )}
        </View>
      </View>

      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <Text style={styles.translation}>{word.pt}</Text>
      <Text style={styles.definition}>{word.def}</Text>

      <View style={styles.footer}>
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text style={styles.pos}>{word.pos}</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.space.lg, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  headText: { flex: 1 },
  word: { fontFamily: fonts.bodyBold, fontSize: 20, color: theme.colors.ink },
  phonetic: { fontFamily: fonts.body, fontSize: 13, color: theme.colors.inkFaint },
  actions: { flexDirection: 'row', gap: 6 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  iconButtonOn: { backgroundColor: '#FFF3D0' },
  iconButtonSpeaking: { backgroundColor: theme.colors.primarySoft },

  notice: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: theme.colors.danger },

  translation: { fontFamily: fonts.bodySemi, fontSize: 16, color: theme.colors.primaryDeep },
  definition: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: theme.colors.inkMuted },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  category: {
    fontFamily: fonts.display,
    fontSize: 11,
    color: theme.colors.secondaryDeep,
    backgroundColor: theme.colors.secondarySoft,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  pos: { fontFamily: fonts.body, fontSize: 11, color: theme.colors.inkFaint },
});
