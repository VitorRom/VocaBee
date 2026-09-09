import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CelebrationModal, { CelebrationPayload } from '../components/CelebrationModal';
import { CHARACTERS } from '../data/characters';
import { useNavigation } from '../navigation/Router';
import { usePlayer } from '../player/PlayerProvider';
import { fonts, theme } from '../theme';
import Screen from '../ui/Screen';
import { Avatar, Badge, Button, StatChip, Surface } from '../ui/primitives';

export default function ShopScreen() {
  const { player, buyCharacter, equipCharacter } = usePlayer();
  const { goBack } = useNavigation();
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  return (
    <Screen
      title="Loja"
      subtitle="Personagens para a sua jornada"
      onBack={goBack}
      right={<StatChip icon="coin" value={player.coins} bg="rgba(255,255,255,0.18)" color="#FFF" />}
    >
      <Text style={styles.note}>
        Tudo aqui é comprado com as moedas que você ganha jogando. Não existe compra com dinheiro
        real.
      </Text>

      <View style={{ gap: theme.space.md }}>
        {CHARACTERS.map((c) => {
          const owned = player.characters.includes(c.id);
          const equipped = player.equipped === c.id;
          const affordable = player.coins >= c.price;
          const rarity = theme.rarity[c.rarity];

          return (
            <Surface key={c.id} style={styles.card}>
              <Avatar emoji={c.emoji} tint={c.tint} rarity={c.rarity} mark={c.mark} size={62} />

              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Badge text={rarity.label} color={rarity.color} />
                </View>
                <Text style={styles.blurb}>{c.blurb}</Text>

                {!owned && (
                  <Text style={[styles.price, !affordable && styles.priceShort]}>
                    {c.price.toLocaleString('pt-BR')} moedas
                    {!affordable && '  · faltam moedas'}
                  </Text>
                )}
              </View>

              <View style={styles.action}>
                {equipped ? (
                  <Text style={styles.equipped}>Equipado ✓</Text>
                ) : owned ? (
                  <Button label="Equipar" variant="secondary" small onPress={() => equipCharacter(c.id)} />
                ) : (
                  <Button
                    label="Comprar"
                    variant="gold"
                    small
                    disabled={!affordable}
                    onPress={() => {
                      if (!buyCharacter(c.id)) return;
                      setCelebration({
                        icon: 'store',
                        title: `${c.name} chegou!`,
                        subtitle: 'Já equipamos para você.',
                        rewards: [{ icon: 'coin' as const, label: `−${c.price}` }],
                      });
                    }}
                  />
                )}
              </View>
            </Surface>
          );
        })}
      </View>

      <CelebrationModal payload={celebration} onClose={() => setCelebration(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: theme.colors.inkMuted,
    textAlign: 'center',
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  name: { fontFamily: fonts.displayBold, fontSize: 16, color: theme.colors.ink },
  blurb: { fontFamily: fonts.body, fontSize: 12, color: theme.colors.inkMuted },
  price: { fontFamily: fonts.bodySemi, fontSize: 12, color: theme.colors.goldInk },
  priceShort: { color: theme.colors.inkFaint },
  action: { minWidth: 92, alignItems: 'flex-end' },
  equipped: { fontFamily: fonts.bodySemi, fontSize: 12, color: theme.colors.good },
});
