import React, { useEffect, useRef } from 'react';
import { Animated, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Category, Word } from '../data/words';
import { speechNotice, useSpeaker } from '../speech';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';

export type SheetEntry =
  | { type: 'word'; word: Word }
  | { type: 'category'; category: Category };

type Props = {
  entry: SheetEntry | null;
  /** Chave de som das configurações. */
  soundOn: boolean;
  onClose: () => void;
};

/**
 * O dicionário: aparece ao segurar o dedo numa carta.
 * Nunca gasta movimento — é o ponto do jogo inteiro.
 *
 * É uma camada dentro da própria tela, não um `Modal`. O gesto que abre este
 * painel é um toque LONGO, ou seja, o dedo ainda está na tela quando ele sobe;
 * apresentar um modal nativo nesse instante faz o iOS cancelar os toques da
 * view de baixo, e o evento de cancelamento chega sem a lista de toques — que
 * é de onde vinha o `Cannot read property 'forEach' of null` no meio do
 * arrasto. Uma camada comum não interrompe o gesto.
 */
export default function WordSheet({ entry, soundOn, onClose }: Props) {
  const rise = useRef(new Animated.Value(0)).current;
  const speaker = useSpeaker(soundOn);

  useEffect(() => {
    if (!entry) return;
    rise.setValue(0);
    Animated.spring(rise, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [entry, rise]);

  // Sem `Modal`, o botão voltar do Android precisa ser tratado aqui.
  useEffect(() => {
    if (!entry) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [entry, onClose]);

  if (!entry) return null;

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, { opacity: rise, transform: [{ translateY }] }]}>
          <Pressable onPress={() => {}}>
            <View style={styles.grabber} />

            {entry.type === 'word' ? (
              <WordBody word={entry.word} speaker={speaker} />
            ) : (
              <CategoryBody category={entry.category} speaker={speaker} />
            )}

            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Entendi</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}

type Speaker = ReturnType<typeof useSpeaker>;

/**
 * Botão de ouvir: fica ao lado da palavra porque é ali que o olho está quando
 * a pessoa acabou de descobrir que não sabe pronunciar.
 */
function ListenButton({ text, speaker }: { text: string; speaker: Speaker }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvir a pronúncia de ${text}`}
      accessibilityState={{ busy: speaker.speaking }}
      onPress={() => speaker.speak(text)}
      hitSlop={8}
      style={[styles.listen, speaker.speaking && styles.listenOn]}
    >
      <Icon name="sound" size={19} color="#FFFFFF" />
      <Text style={styles.listenText}>Ouvir</Text>
    </Pressable>
  );
}

function WordBody({ word, speaker }: { word: Word; speaker: Speaker }) {
  const notice = speechNotice(speaker.state);

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.title}>{word.w}</Text>
        <Text style={styles.pos}>{word.pos}</Text>
      </View>

      <View style={styles.phRow}>
        <Text style={styles.ph}>{word.ph}</Text>
        <ListenButton text={word.w} speaker={speaker} />
      </View>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.ptBox}>
        <Text style={styles.ptLabel}>Tradução</Text>
        <Text style={styles.pt}>{word.pt}</Text>
      </View>

      <ScrollView style={styles.scroll} bounces={false}>
        <Text style={styles.label}>Definição</Text>
        <Text style={styles.def}>{word.def}</Text>

        <Text style={styles.label}>Exemplo</Text>
        <Text style={styles.ex}>{word.ex}</Text>
        <Text style={styles.exPt}>{word.exPt}</Text>
      </ScrollView>
    </>
  );
}

function CategoryBody({ category, speaker }: { category: Category; speaker: Speaker }) {
  const notice = speechNotice(speaker.state);

  return (
    <>
      <View style={styles.headRow}>
        <Text style={styles.title}>
          {category.emoji} {category.en}
        </Text>
        <Text style={styles.pos}>categoria</Text>
      </View>

      <View style={styles.phRow}>
        <View />
        <ListenButton text={category.en} speaker={speaker} />
      </View>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.ptBox}>
        <Text style={styles.ptLabel}>Em português</Text>
        <Text style={styles.pt}>{category.pt}</Text>
      </View>

      <Text style={styles.label}>Palavras deste tema</Text>
      <Text style={styles.def}>
        {category.words.map((w) => w.w).join(' · ')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.sheet,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7DEE2',
    marginBottom: 14,
  },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  title: { fontSize: 29, fontFamily: fonts.displayBold, color: theme.colors.sheetText },
  pos: { fontSize: 12, color: theme.colors.sheetMuted, fontFamily: fonts.body },
  ph: { fontSize: 15, color: theme.colors.sheetMuted, fontFamily: fonts.body },
  phRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  listenOn: { backgroundColor: theme.colors.primaryDeep },
  listenText: { fontFamily: fonts.bodySemi, fontSize: 13, color: '#FFFFFF' },
  notice: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.danger,
    marginTop: 8,
  },
  ptBox: {
    marginTop: 14,
    backgroundColor: '#F1F6F3',
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ptLabel: {
    fontSize: 11,
    color: theme.colors.sheetMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: fonts.bodySemi,
  },
  pt: { fontSize: 20, fontFamily: fonts.bodySemi, color: '#1B7A4D', marginTop: 2 },
  scroll: { maxHeight: 200, marginTop: 14 },
  label: {
    fontSize: 11,
    color: theme.colors.sheetMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    fontFamily: fonts.bodySemi,
  },
  def: { fontSize: 14.5, lineHeight: 22, color: theme.colors.sheetText, marginTop: 4, fontFamily: fonts.body },
  ex: { fontSize: 14.5, color: theme.colors.sheetText, marginTop: 4, fontFamily: fonts.bodyMed },
  exPt: { fontSize: 13, color: theme.colors.sheetMuted, marginTop: 2, fontFamily: fonts.body },
  button: {
    marginTop: 18,
    backgroundColor: '#16222B',
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: fonts.bodySemi, fontSize: 15 },
});
