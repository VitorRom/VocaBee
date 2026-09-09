import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fonts, theme } from '../theme';

export const TOP_INSET = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 6 : 54;
/** Altura reservada para a barra inferior — as telas somam isso ao padding. */
export const TAB_BAR_H = 66;

/**
 * Casca de tela do meta-jogo: cabeçalho colorido com título, conteúdo em fundo
 * claro e largura máxima para não esticar em tablet e navegador.
 */
export default function Screen({
  title,
  subtitle,
  onBack,
  right,
  children,
  scroll = true,
  withTabBar = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  withTabBar?: boolean;
}) {
  const body = (
    <View style={styles.inner}>
      <View style={styles.content}>{children}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDeep]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={onBack}
              hitSlop={12}
              style={styles.back}
            >
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}

          <View style={styles.headerTitles}>
            <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.right}>{right}</View>
        </View>
      </LinearGradient>

      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: withTabBar ? TAB_BAR_H + 24 : 24 }}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { paddingBottom: withTabBar ? TAB_BAR_H : 0 }]}>{body}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingTop: TOP_INSET,
    paddingBottom: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backIcon: { color: '#FFF', fontSize: 26, fontFamily: fonts.display },
  headerTitles: { flex: 1, alignItems: 'center' },
  title: { color: '#FFF', fontFamily: fonts.displayBold, fontSize: 19 },
  subtitle: { color: theme.colors.textMuted, fontFamily: fonts.bodyMed, fontSize: 12, marginTop: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },

  scroll: { flex: 1 },
  inner: { alignItems: 'center' },
  content: { width: '100%', maxWidth: 520, padding: theme.space.lg, gap: theme.space.lg },
});
