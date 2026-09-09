import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, theme } from '../theme';
import Icon, { IconName } from '../ui/Icon';
import { TAB_BAR_H } from '../ui/Screen';

/**
 * Navegação própria, sem dependência externa.
 *
 * React Native não tem URL: o que faz sentido aqui é uma pilha de telas em
 * estado. São nove telas e uma barra de abas — `expo-router` ou
 * `react-navigation` trariam configuração e peso sem resolver nada que isto
 * não resolva. Os nomes seguem as rotas pedidas (`/journey`, `/shop`...).
 */
export type Route =
  | 'home'
  | 'journey'
  | 'game'
  | 'rewards'
  | 'shop'
  | 'vocabulary'
  | 'profile'
  | 'settings';

export type Screen = { route: Route; level?: number };

type Ctx = {
  current: Screen;
  navigate: (route: Route, params?: { level?: number }) => void;
  goBack: () => void;
  canGoBack: boolean;
};

const NavContext = createContext<Ctx | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ route: 'home' }]);

  const navigate = useCallback((route: Route, params?: { level?: number }) => {
    setStack((prev) => {
      const next: Screen = { route, ...params };
      // Trocar de aba não empilha: evita "voltar" percorrer todas as abas.
      if (TABS.some((t) => t.route === route)) return [next];
      return [...prev, next];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      current: stack[stack.length - 1],
      navigate,
      goBack,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, goBack],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNavigation(): Ctx {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNavigation precisa estar dentro de <NavigationProvider>');
  return ctx;
}

export const TABS: { route: Route; icon: IconName; label: string }[] = [
  { route: 'home', icon: 'home', label: 'Início' },
  { route: 'journey', icon: 'path', label: 'Jornada' },
  { route: 'rewards', icon: 'trophy', label: 'Prêmios' },
  { route: 'shop', icon: 'store', label: 'Loja' },
  { route: 'profile', icon: 'user', label: 'Perfil' },
];

/** Barra inferior. Some durante o gameplay para não roubar espaço do tabuleiro. */
export function BottomNav() {
  const { current, navigate } = useNavigation();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active = current.route === tab.route;
        return (
          <Pressable
            key={tab.route}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => navigate(tab.route)}
            style={styles.tab}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={active ? theme.colors.primary : theme.colors.inkFaint}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_H + (Platform.OS === 'ios' ? 16 : 0),
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    ...theme.shadow.lifted,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6 },
  label: { fontFamily: fonts.bodyMed, fontSize: 10, color: theme.colors.inkFaint },
  labelActive: { color: theme.colors.primaryDeep, fontFamily: fonts.bodySemi },
});
