import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_BY_ID } from '../data/words';
import { Slot } from '../game/engine';
import { fonts, theme } from '../theme';
import Icon from '../ui/Icon';

type Props = {
  slot: Slot;
  /** Quantas cartas a categoria aberta aqui precisa ao todo. */
  total: number;
  width: number;
  height: number;
  pulseToken: number;
  /** O dedo está pairando aqui com uma carta na mão. */
  hovered: boolean;
  onLongPressCategory: (categoryId: string) => void;
};

/**
 * Uma vaga de categoria.
 *
 * Verde saturado é a única superfície colorida do tabuleiro: significa
 * "destino válido". Fechada mostra só o cadeado e a palavra "Fechada" — nunca
 * uma pista do que virá, porque descobrir a categoria é o exercício.
 */
function CategorySlotView({
  slot,
  total,
  width,
  height,
  pulseToken,
  hovered,
  onLongPressCategory,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;
  const radius = width * 0.15;

  useEffect(() => {
    if (pulseToken === 0) return;
    pulse.setValue(0);
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 18 }),
      Animated.timing(pulse, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [pulseToken, pulse]);

  useEffect(() => {
    Animated.spring(hover, {
      toValue: hovered ? 1 : 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: 10,
    }).start();
  }, [hovered, hover]);

  const scale = Animated.multiply(
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }),
    hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
  );

  const category = slot.categoryId ? CATEGORY_BY_ID[slot.categoryId] : null;
  const filled = slot.collected.length;
  const dot = Math.max(5, width * 0.075);

  return (
    <Animated.View style={{ width, height, transform: [{ scale }] }}>
      {!category ? (
        <View style={[styles.closed, { borderRadius: radius }]}>
          <Icon name="lock" size={width * 0.25} color={theme.colors.green350} />
          <Text style={styles.closedText}>Fechada</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Categoria ${category.en}, ${filled} de ${total}`}
          onLongPress={() => onLongPressCategory(category.id)}
          delayLongPress={280}
          style={[styles.open, { borderRadius: radius }, hovered && styles.hovered]}
        >
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[styles.name, { fontSize: 13 * (width / 80) }]}
          >
            {category.en}
          </Text>
          <Text style={styles.count}>
            {filled} / {total}
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  backgroundColor: i < filled ? '#FFFFFF' : theme.colors.green350,
                }}
              />
            ))}
          </View>
        </Pressable>
      )}
    </Animated.View>
  );
}

/**
 * Memoizado de propósito: durante o arrasto, cada mudança de alvo re-renderiza
 * o tabuleiro, e são mais de vinte cartas com animação própria.
 */
export default React.memo(CategorySlotView);

const noSelect = { userSelect: 'none' } as const;

const styles = StyleSheet.create({
  closed: {
    flex: 1,
    backgroundColor: theme.colors.green800,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.green400,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  closedText: { ...noSelect, fontFamily: fonts.displayMed, fontSize: 12, color: theme.colors.onTableLabel },

  open: {
    flex: 1,
    backgroundColor: theme.colors.green500,
    borderWidth: 1.5,
    borderColor: theme.colors.green300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  /** Halo verde-claro: o alvo sob o dedo. */
  hovered: { borderColor: '#FFFFFF', borderWidth: 2.5 },

  name: { ...noSelect, fontFamily: fonts.display, color: '#FFFFFF', textAlign: 'center' },
  count: { ...noSelect, fontFamily: fonts.bodySemi, fontSize: 11, color: theme.colors.green200 },
  dots: { flexDirection: 'row', gap: 3 },
});
