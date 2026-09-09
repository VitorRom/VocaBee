import React, { useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Rarity, fonts, theme } from '../theme';
import Icon, { IconName } from './Icon';
import { LogoMark } from './Logo';

const noSelect = { userSelect: 'none' } as const;

// ------------------------------------------------------------------ Surface

/** Cartão branco padrão — a base de quase toda a interface fora do tabuleiro. */
export function Surface({
  children,
  style,
  padded = true,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <View style={[styles.surface, padded && { padding: theme.space.lg }, style]}>{children}</View>
  );
}

// ------------------------------------------------------------------- Button

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'ghost';

/**
 * A "sombra sólida" de 4px embaixo é o que dá cara de botão de jogo. Em RN não
 * existe box-shadow com deslocamento seco: usamos borda inferior.
 */
const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; edge?: string; border?: string }> = {
  primary: { bg: theme.colors.primary, fg: '#FFFFFF', edge: theme.colors.primaryDeep },
  secondary: { bg: theme.colors.secondary, fg: '#FFFFFF', edge: theme.colors.secondaryDeep },
  gold: { bg: theme.colors.gold, fg: theme.colors.goldInk, edge: theme.colors.gold700 },
  ghost: { bg: 'transparent', fg: theme.colors.ink, border: theme.colors.line },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  small,
  full,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: IconName;
  small?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const v = VARIANTS[variant];
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <Animated.View style={[full && { alignSelf: 'stretch' }, { transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() =>
          Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.timing(press, { toValue: 0, duration: 120, useNativeDriver: true }).start()
        }
        style={[
          styles.button,
          small && styles.buttonSmall,
          {
            backgroundColor: v.bg,
            borderColor: v.border ?? 'transparent',
            borderWidth: v.border ? 1.5 : 0,
            borderBottomWidth: v.edge ? 4 : v.border ? 1.5 : 0,
            borderBottomColor: v.edge ?? v.border ?? 'transparent',
          },
          disabled && styles.disabled,
        ]}
      >
        {!!icon && <Icon name={icon} size={small ? 17 : 19} color={v.fg} />}
        <Text style={[styles.buttonLabel, small && { fontSize: 14 }, { color: v.fg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// -------------------------------------------------------------- ProgressBar

export function ProgressBar({
  value,
  max,
  color = theme.colors.primary,
  height = 10,
  label,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value, text: label }}
      style={{ alignSelf: 'stretch' }}
    >
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            borderRadius: height / 2,
            backgroundColor: color,
          }}
        />
      </View>
      {!!label && <Text style={styles.progressLabel}>{label}</Text>}
    </View>
  );
}

// -------------------------------------------------------------------- Badge

export function Badge({
  text,
  color = theme.colors.danger,
  style,
}: {
  text: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------- Avatar

export function Avatar({
  emoji,
  tint,
  size = 56,
  rarity,
  mark,
}: {
  emoji: string;
  tint: string;
  size?: number;
  rarity?: Rarity;
  /** A mascote não é emoji: é a própria marca desenhada. */
  mark?: boolean;
}) {
  const ring = rarity ? theme.rarity[rarity].ring : 'rgba(255,255,255,0.9)';
  return (
    <View
      style={{
        width: size,
        height: size,
        // Quadrado arredondado, como no design — não círculo.
        borderRadius: size * 0.32,
        backgroundColor: tint,
        borderWidth: 2.5,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {mark ? (
        <LogoMark size={size * 0.68} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      )}
    </View>
  );
}

// ----------------------------------------------------------------- StatChip

/** Pílula de valor: moedas, XP, sequência. Ícone + número, sempre com rótulo. */
export function StatChip({
  icon,
  value,
  color = theme.colors.ink,
  bg = 'rgba(255,255,255,0.9)',
  label,
}: {
  icon: IconName;
  value: string | number;
  color?: string;
  bg?: string;
  label?: string;
}) {
  return (
    <View
      accessibilityLabel={label ? `${label}: ${value}` : undefined}
      style={[styles.chip, { backgroundColor: bg }]}
    >
      <Icon name={icon} size={15} color={color} />
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

// -------------------------------------------------------------------- Texto

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole={'header' as AccessibilityRole} style={styles.sectionTitle}>
        {title}
      </Text>
      {!!action && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <Surface style={styles.empty}>
      <Icon name={icon} size={34} color={theme.colors.inkFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </Surface>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.shadow.soft,
  },

  button: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    ...noSelect,
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: theme.space.lg, borderRadius: theme.radius.sm },
  buttonLabel: { fontFamily: fonts.display, fontSize: 16, ...noSelect },
  disabled: { opacity: 0.45 },

  track: { backgroundColor: theme.colors.line, overflow: 'hidden', alignSelf: 'stretch' },
  progressLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: theme.colors.inkMuted,
    marginTop: 4,
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#FFF', fontFamily: fonts.display, fontSize: 11, ...noSelect },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  chipValue: { fontFamily: fonts.displayBold, fontSize: 14, ...noSelect },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.md,
  },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: theme.colors.ink },
  sectionAction: { fontFamily: fonts.bodySemi, fontSize: 13, color: theme.colors.secondaryDeep },

  empty: { alignItems: 'center', gap: 6, paddingVertical: theme.space.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 16, color: theme.colors.ink },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: theme.colors.inkMuted,
    textAlign: 'center',
  },

  muted: { fontFamily: fonts.body, fontSize: 13, color: theme.colors.inkMuted },
});
