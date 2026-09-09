import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { speechNotice, useSpeaker } from '../speech';
import { useNavigation } from '../navigation/Router';
import { usePlayer } from '../player/PlayerProvider';
import { fonts, theme } from '../theme';
import Icon, { IconName } from '../ui/Icon';
import Screen from '../ui/Screen';
import { Button, SectionTitle, Surface } from '../ui/primitives';

function Row({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={20} color={theme.colors.ink60} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowText}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: theme.colors.primary, false: theme.colors.line }}
        thumbColor="#FFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { player, updateSettings, setName, resetProgress } = usePlayer();
  const { goBack } = useNavigation();
  const [draftName, setDraftName] = useState(player.name);
  // Ao ligar o som o jogador ouve na hora que funcionou — ou por que não.
  const preview = useSpeaker(true);

  const confirmReset = () => {
    const wipe = () => resetProgress();
    if (Platform.OS === 'web') {
      // O Alert do RN Web não tem botões; aqui a confirmação é do próprio navegador.
      // eslint-disable-next-line no-alert
      if (typeof confirm === 'function' && confirm('Apagar todo o progresso?')) wipe();
      return;
    }
    Alert.alert(
      'Apagar progresso?',
      'Isso remove nível, XP, moedas, palavras e conquistas. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: wipe },
      ],
    );
  };

  return (
    <Screen title="Ajustes" onBack={goBack}>
      <View>
        <SectionTitle title="Seu nome" />
        <Surface>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onBlur={() => setName(draftName)}
            onSubmitEditing={() => setName(draftName)}
            placeholder="Como podemos te chamar?"
            placeholderTextColor={theme.colors.inkFaint}
            maxLength={20}
            accessibilityLabel="Seu nome"
            style={styles.input}
          />
        </Surface>
      </View>

      <View>
        <SectionTitle title="Preferências" />
        <Surface style={{ gap: theme.space.lg }}>
          <Row
            icon="sound"
            title="Sons e pronúncia"
            description="Ouvir a pronúncia das palavras em inglês."
            value={player.settings.sound}
            onChange={(v) => {
              updateSettings({ sound: v });
              if (v) preview.speak('hello');
            }}
          />
          {!!speechNotice(preview.state) && (
            <Text style={styles.speechNotice}>{speechNotice(preview.state)}</Text>
          )}
          <Text style={styles.voiceSummary}>
            A pronúncia vem embarcada no aplicativo, então soa igual em qualquer
            aparelho e funciona sem internet.
          </Text>
          <Row
            icon="shuffle"
            title="Reduzir animações"
            description="Menos movimento na tela. Já vem ligado se o sistema pedir."
            value={player.settings.reduceMotion}
            onChange={(v) => updateSettings({ reduceMotion: v })}
          />
        </Surface>
      </View>

      <View>
        <SectionTitle title="Dados" />
        <Surface style={{ gap: theme.space.md }}>
          <Text style={styles.rowText}>
            Seu progresso fica salvo apenas neste aparelho. Nada é enviado para a internet.
          </Text>
          <Button label="Apagar progresso" variant="ghost" full onPress={confirmReset} />
        </Surface>
      </View>

      <Text style={styles.version}>VocaBee · versão 1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },

  rowTitle: { fontFamily: fonts.display, fontSize: 15, color: theme.colors.ink },
  rowText: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted, lineHeight: 18 },
  speechNotice: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: theme.colors.danger },
  voiceSummary: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: theme.colors.inkFaint },
  input: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: theme.colors.ink,
    paddingVertical: theme.space.sm,
  },
  version: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: theme.colors.inkFaint,
    textAlign: 'center',
  },
});
