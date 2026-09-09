import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito-sans';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BottomNav, NavigationProvider, useNavigation } from './src/navigation/Router';
import { PlayerProvider, usePlayer } from './src/player/PlayerProvider';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import JourneyScreen from './src/screens/JourneyScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/screens/ShopScreen';
import VocabularyScreen from './src/screens/VocabularyScreen';
import { theme } from './src/theme';

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.table, justifyContent: 'center' }}>
      <ActivityIndicator color="#FFF" />
    </View>
  );
}

/** Decide o que aparece: onboarding, gameplay ou uma das telas com abas. */
function AppShell() {
  const { player, ready, nextLevel } = usePlayer();
  const { current, navigate, goBack } = useNavigation();

  if (!ready) return <Splash />;
  if (!player.onboarded) return <OnboardingScreen />;

  // O gameplay ocupa a tela inteira: sem barra de abas competindo com o tabuleiro.
  if (current.route === 'game') {
    const level = current.level ?? nextLevel;
    return (
      <GameScreen
        key={level}
        level={level}
        onExit={goBack}
        onPlayLevel={(n) => navigate('game', { level: n })}
      />
    );
  }

  const screen = () => {
    switch (current.route) {
      case 'journey':
        return <JourneyScreen />;
      case 'rewards':
        return <RewardsScreen />;
      case 'shop':
        return <ShopScreen />;
      case 'vocabulary':
        return <VocabularyScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {screen()}
      <BottomNav />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  // Sem a fonte carregada o texto pularia de tamanho no primeiro quadro.
  if (!fontsLoaded) return <Splash />;

  return (
    <PlayerProvider>
      <NavigationProvider>
        <StatusBar style="light" />
        <AppShell />
      </NavigationProvider>
    </PlayerProvider>
  );
}
