/**
 * Design system do VocaBee — tokens do redesenho.
 *
 * Fredoka na interface (números, títulos, botões): arredondada, com peso e sem
 * ser infantil. Nunito Sans nas palavras em inglês e em todo texto corrido:
 * x-height alta e letras abertas, legível a 13px numa carta de 80dp.
 *
 * Toda cor, espaçamento, raio e sombra da aplicação sai daqui.
 */
export const fonts = {
  displayMed: 'Fredoka_500Medium',
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',

  body: 'NunitoSans_400Regular',
  bodyMed: 'NunitoSans_600SemiBold',
  bodySemi: 'NunitoSans_700Bold',
  bodyBold: 'NunitoSans_800ExtraBold',
};

/**
 * Escala tipográfica do design. `label` leva letterSpacing de +9%, que em RN
 * é um valor absoluto — por isso vem calculado por tamanho.
 */
export const type = {
  display1: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  display2: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  title1: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  title2: { fontFamily: fonts.displayMed, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  support: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.08,
  },
  /** Palavra na carta. Acima de 9 letras cai para 13, nunca menos. */
  word: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 18 },
};

export const theme = {
  colors: {
    // ---------------------------------------------------------------- verde
    /** A mesa do jogo. Fundo escuro faz a carta branca ser o objeto mais claro. */
    table: '#0E3527',
    tableDeep: '#0A2A1F',
    green800: '#0C4530',
    green700: '#157049',
    green600: '#16553C',
    green500: '#1E8C5F',
    green400: '#2FA06E',
    green350: '#3FAF7C',
    green300: '#7FC79B',
    green200: '#CDE4D7',
    green50: '#E8F4EC',
    /** Texto de apoio sobre a mesa escura. */
    onTable: '#9FBFAE',
    onTableLabel: '#7FA893',

    // ----------------------------------------------------------------- azul
    blue700: '#1B4AAF',
    blue500: '#2F6BEA',
    blue50: '#EAF0FE',

    // -------------------------------------------------------------- dourado
    gold700: '#A56C12',
    gold600: '#7A4F0B',
    gold500: '#E5A62C',
    gold300: '#DFC38B',
    gold100: '#FBEFD5',
    goldCard: '#FDF3DC',
    goldInk: '#3A2705',

    // ------------------------------------------------------------ vermelho
    coral500: '#D9503F',
    coral700: '#A5372A',
    coral50: '#FDECE9',

    // ------------------------------------------------------- neutros claros
    ink: '#10201A',
    ink60: '#4B5F56',
    ink40: '#7C8C84',
    ink30: '#9AA8A1',
    line: '#E2E9E3',
    lineSoft: '#EDF1EC',
    bg: '#F4F6F2',
    card: '#FFFFFF',
    /** Borda inferior sólida que dá espessura à carta branca. */
    cardEdge: '#C9D6CE',
    locked: '#E7ECE8',
    lockedLine: '#C2CDC6',

    // ------------------------------------------------------ texto invertido
    text: '#FFFFFF',
    textMuted: '#CDE4D7',

    // ------------------------------------------------------------ semântica
    // A paleta acima diz QUE COR é; estes dizem PARA QUE SERVE. As telas usam
    // só estes — trocar a paleta não obriga a mexer em componente nenhum.
    primary: '#1E8C5F',
    primaryDeep: '#0C4530',
    primarySoft: '#E8F4EC',
    secondary: '#2F6BEA',
    secondaryDeep: '#1B4AAF',
    secondarySoft: '#EAF0FE',
    gold: '#E5A62C',
    goldSoft: '#FBEFD5',

    surface: '#FFFFFF',
    surfaceAlt: '#F4F6F2',
    inkMuted: '#4B5F56',
    inkFaint: '#9AA8A1',

    good: '#1E8C5F',
    danger: '#D9503F',
    warn: '#E5A62C',
    badge: '#D9503F',
    action: '#2F6BEA',

    /** Gamificação: XP verde, moeda dourada, sequência coral. */
    xp: '#157049',
    coin: '#E5A62C',
    streak: '#D9503F',

    // fundo escuro do gameplay, por nome antigo
    felt: '#0E3527',
    feltTop: '#0E3527',
    feltDeep: '#0A2A1F',
    feltDark: '#0C4530',

    sheet: '#FFFFFF',
    sheetText: '#10201A',
    sheetMuted: '#7C8C84',
  },

  /** Espaçamento em passos de 4. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 40 },

  radius: { sm: 12, md: 14, lg: 18, xl: 22, xxl: 32, pill: 999 },

  shadow: {
    /** Sombra suave dos cartões do meta-jogo. */
    soft: {
      shadowColor: '#0C281E',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    /** Carta na mão do jogador. */
    lifted: {
      shadowColor: '#04140E',
      shadowOpacity: 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 18,
    },
  },

  motion: { fast: 130, base: 220, slow: 400 },

  /** Raridades — cor E rótulo, para não depender só de cor. */
  rarity: {
    common: { label: 'COMUM', color: '#7C8C84', bg: '#EDF1EC', fg: '#4B5F56', ring: '#C7D0D6' },
    rare: { label: 'RARO', color: '#2F6BEA', bg: '#EAF0FE', fg: '#1B4AAF', ring: '#A9CDF7' },
    epic: { label: 'ÉPICO', color: '#8A4FD0', bg: '#F1E8FA', fg: '#6B34AF', ring: '#C9B4EE' },
    legendary: { label: 'LENDÁRIO', color: '#E5A62C', bg: '#FBEFD5', fg: '#7A4F0B', ring: '#FBDD9A' },
  },
};

export type Rarity = keyof typeof theme.rarity;
export type Theme = typeof theme;
