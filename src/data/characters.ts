import { Rarity, theme } from '../theme';

/**
 * Personagens do jogo.
 *
 * Os avatares são emoji de propósito: são originais o bastante para a primeira
 * versão e não dependem de nenhum asset de terceiros. O campo `image` já existe
 * para quando houver arte própria — a interface passa a usá-lo sem mudar nada
 * mais, porque só o `Avatar` lê estes dados.
 */
export type Character = {
  id: string;
  name: string;
  emoji: string;
  /** Cor de fundo do avatar. */
  tint: string;
  price: number;
  rarity: Rarity;
  blurb: string;
  image?: number;
  /** Desenha a marca em vez de um emoji. Só a Bia, que é a mascote. */
  mark?: boolean;
};

export const CHARACTERS: Character[] = [
  {
    id: 'bia',
    name: 'Bia',
    emoji: '',
    tint: theme.colors.goldSoft,
    price: 0,
    rarity: 'common',
    blurb: 'Sua abelha guia. Gratuita para sempre.',
    mark: true,
  },
  {
    id: 'alex',
    name: 'Alex',
    emoji: '🦊',
    tint: '#F4C7A8',
    price: 300,
    rarity: 'common',
    blurb: 'O companheiro de estudos das primeiras fases.',
  },
  {
    id: 'mia',
    name: 'Mia',
    emoji: '🦉',
    tint: '#CBD9F2',
    price: 500,
    rarity: 'common',
    blurb: 'Estuda de madrugada e nunca esquece uma palavra.',
  },
  {
    id: 'leo',
    name: 'Leo',
    emoji: '🐢',
    tint: '#C4E3C7',
    price: 1000,
    rarity: 'rare',
    blurb: 'Devagar, sempre — e chega em todas as fases.',
  },
  {
    id: 'sofia',
    name: 'Sofia',
    emoji: '🦋',
    tint: '#E3D3F5',
    price: 2000,
    rarity: 'rare',
    blurb: 'Coleciona palavras bonitas como quem coleciona flores.',
  },
  {
    id: 'ravi',
    name: 'Ravi',
    emoji: '🐙',
    tint: '#F7CFD6',
    price: 3500,
    rarity: 'epic',
    blurb: 'Oito braços, oito cartas por vez.',
  },
  {
    id: 'nina',
    name: 'Nina',
    emoji: '🐉',
    tint: '#FBE3A2',
    price: 6000,
    rarity: 'legendary',
    blurb: 'Dizem que ela já leu o dicionário inteiro.',
  },
];

export const CHARACTER_BY_ID: Record<string, Character> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c]),
);

export function characterOf(id: string): Character {
  return CHARACTER_BY_ID[id] ?? CHARACTERS[0];
}
