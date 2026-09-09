import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Rect } from 'react-native-svg';
import { fonts, theme } from '../theme';

/**
 * A Bia, a abelha da marca — de perfil: cabeça embaixo à esquerda, corpo
 * listrado inclinado e as asas abertas por cima.
 *
 * Ela aparece de 27dp (o verso da carta) a 150dp (a abertura), então o desenho
 * é feito de formas cheias. `detail` liga as antenas, os olhos e a segunda
 * asa: abaixo de uns 36dp eles viram sujeira, e quem chama decide.
 *
 * As listras são retângulos recortados pelo corpo, e não faixas desenhadas à
 * mão: assim elas acompanham a curva da elipse em qualquer tamanho.
 */
export function LogoMark({
  size = 40,
  body = theme.colors.gold500,
  stripe = theme.colors.green800,
  wing = '#FFFFFF',
  detail = true,
}: {
  size?: number;
  body?: string;
  stripe?: string;
  wing?: string;
  detail?: boolean;
}) {
  // Um id por instância: o verso de vinte cartas desenha vinte abelhas ao
  // mesmo tempo, e ids repetidos de clipPath se atrapalham.
  const clip = `bia-${useId()}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Defs>
        <ClipPath id={clip}>
          <G rotation={-18} origin="23, 25.6">
            <Ellipse cx={23} cy={25.6} rx={11.4} ry={8.6} />
          </G>
        </ClipPath>
      </Defs>

      {/* Asas, atrás do corpo. */}
      <G rotation={-34} origin="18.4, 12.2">
        <Ellipse cx={18.4} cy={12.2} rx={8.2} ry={4.4} fill={wing} opacity={0.95} />
      </G>
      {detail && (
        <G rotation={-12} origin="27.2, 14.6">
          <Ellipse cx={27.2} cy={14.6} rx={6.4} ry={3.6} fill={wing} opacity={0.7} />
        </G>
      )}

      {/* Cabeça e antenas. */}
      <Circle cx={12.2} cy={26.2} r={5.6} fill={stripe} />
      {detail && (
        <>
          <Line x1={10.4} y1={21.6} x2={8.2} y2={16.4} stroke={stripe} strokeWidth={1.7} strokeLinecap="round" />
          <Line x1={14.2} y1={20.2} x2={14.4} y2={14.8} stroke={stripe} strokeWidth={1.7} strokeLinecap="round" />
          <Circle cx={7.9} cy={15.2} r={1.5} fill={stripe} />
          <Circle cx={14.5} cy={13.6} r={1.5} fill={stripe} />
        </>
      )}

      {/* Corpo listrado. */}
      <G rotation={-18} origin="23, 25.6">
        <Ellipse cx={23} cy={25.6} rx={11.4} ry={8.6} fill={body} />
      </G>
      <G clipPath={`url(#${clip})`}>
        <G rotation={-18} origin="23, 25.6">
          <Rect x={17.6} y={12} width={4.6} height={28} fill={stripe} />
          <Rect x={26} y={12} width={4.6} height={28} fill={stripe} />
        </G>
      </G>
    </Svg>
  );
}

/** A Bia dentro do quadrado arredondado — ícone do app e cabeçalhos. */
export function LogoBadge({
  size = 64,
  background = theme.colors.green500,
  body = theme.colors.gold500,
  stripe = theme.colors.green800,
}: {
  size?: number;
  background?: string;
  body?: string;
  stripe?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.29,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LogoMark size={size * 0.74} body={body} stripe={stripe} detail={size >= 40} />
    </View>
  );
}

/** Assinatura completa: nome e linha de apoio. */
export default function Logo({
  size = 38,
  onDark = false,
  tagline = true,
}: {
  size?: number;
  onDark?: boolean;
  tagline?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.word,
          { fontSize: size, lineHeight: size * 1.08, color: onDark ? '#FFFFFF' : theme.colors.green800 },
        ]}
      >
        Voca
        <Text style={{ color: onDark ? theme.colors.gold500 : theme.colors.gold700 }}>Bee</Text>
      </Text>
      {tagline && (
        <Text style={[styles.tagline, { color: onDark ? theme.colors.onTable : theme.colors.ink40 }]}>
          COLECIONE PALAVRAS COMO MEL
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
  word: { fontFamily: fonts.displayBold, letterSpacing: -0.6 },
  tagline: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 2.2,
    marginTop: 6,
  },
});
