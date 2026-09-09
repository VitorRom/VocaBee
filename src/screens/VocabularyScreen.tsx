import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import WordCard from '../components/WordCard';
import { CATEGORIES, Word } from '../data/words';
import { useNavigation } from '../navigation/Router';
import { usePlayer } from '../player/PlayerProvider';
import { fonts, theme } from '../theme';
import Screen from '../ui/Screen';
import { EmptyState } from '../ui/primitives';

type Filter = 'all' | 'favorites' | 'recent';

/** Índice palavra → { verbete, categoria } montado uma vez. */
const INDEX: Record<string, { word: Word; categoryEn: string; categoryPt: string }> = {};
for (const cat of CATEGORIES) {
  for (const w of cat.words) {
    INDEX[w.w] = { word: w, categoryEn: cat.en, categoryPt: cat.pt };
  }
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'recent', label: 'Recentes' },
];

export default function VocabularyScreen() {
  const { player, toggleFavorite } = usePlayer();
  const { goBack } = useNavigation();
  const [filter, setFilter] = useState<Filter>('all');

  const entries = useMemo(() => {
    const all = Object.entries(player.words)
      .filter(([w]) => INDEX[w])
      .map(([w, rec]) => ({ w, rec, ...INDEX[w] }));

    if (filter === 'favorites') return all.filter((e) => e.rec.favorite);
    if (filter === 'recent') {
      return [...all].sort((a, b) => b.rec.firstSeen.localeCompare(a.rec.firstSeen)).slice(0, 20);
    }
    return all.sort((a, b) => a.w.localeCompare(b.w));
  }, [player.words, filter]);

  const total = Object.keys(player.words).length;

  return (
    <Screen
      title="Meu vocabulário"
      subtitle={`${total} ${total === 1 ? 'palavra descoberta' : 'palavras descobertas'}`}
      onBack={goBack}
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f.id)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon={filter === 'favorites' ? 'heart' : 'book'}
          title={filter === 'favorites' ? 'Nenhuma favorita ainda' : 'Seu vocabulário está vazio'}
          text={
            filter === 'favorites'
              ? 'Toque na estrela de uma palavra para guardá-la aqui.'
              : 'Durante o jogo, segure o dedo numa carta para descobrir o significado. As palavras aparecem aqui.'
          }
        />
      ) : (
        <View style={{ gap: theme.space.md }}>
          {entries.map((e) => (
            <WordCard
              key={e.w}
              word={e.word}
              categoryLabel={`${e.categoryEn} · ${e.categoryPt}`}
              favorite={e.rec.favorite}
              soundOn={player.settings.sound}
              onToggleFavorite={() => toggleFavorite(e.w)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: theme.space.sm },
  filter: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
  },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { fontFamily: fonts.bodySemi, fontSize: 13, color: theme.colors.inkMuted },
  filterTextActive: { color: '#FFF' },
});
