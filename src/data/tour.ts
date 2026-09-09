/**
 * O roteiro falado do jogo: a apresentação e o tour da primeira partida.
 *
 * Fica aqui, separado das telas, porque `scripts/generate-audio.py` lê estes
 * textos para gerar a narração. Texto escrito e texto falado saem da mesma
 * fonte — se um mudar sem o outro, a narração fica dizendo o que a tela não
 * diz mais.
 *
 * `text` é o que se lê; `say` é o que se ouve. Eles não são iguais de
 * propósito: escrito, o jogador varre a frase com os olhos; falado, ele
 * precisa de uma frase inteira, com o começo situando o assunto.
 */
export type SpokenLine = {
  id: string;
  title: string;
  /** O que aparece escrito na tela. Curto: precisa caber em três linhas. */
  text: string;
  /** O que a narração diz. */
  say: string;
};

/**
 * As três telas de boas-vindas: a abertura, a mecânica e o gesto de aprender.
 * Depois delas o jogador cai direto na fase 1 — a mecânica se aprende jogando,
 * não lendo, e é lá que o tour continua.
 */
export const INTRO: SpokenLine[] = [
  {
    id: 'intro-1',
    title: 'VocaBee',
    text: 'Colete palavras. Aprenda inglês sem perceber.',
    say: 'Bem-vindo ao VocaBee. Eu sou a Bia. Aqui você coleta palavras em inglês e aprende sem perceber.',
  },
  {
    id: 'intro-2',
    title: 'Arraste a palavra para a categoria certa',
    text: 'Nada na carta diz a qual categoria ela pertence — descobrir isso é o jogo.',
    say: 'Cada carta é uma palavra em inglês, e o seu trabalho é levar cada uma até a categoria certa. Nada na carta diz qual é: descobrir isso é o jogo.',
  },
  {
    id: 'intro-3',
    title: 'Segure a carta para ver o significado',
    text: 'Sem custo, sem penalidade, quantas vezes quiser. Cada palavra nova vale +5 XP.',
    say: 'E quando não souber a palavra? Segure a carta para ver o significado e ouvir a pronúncia. Sem custo e quantas vezes quiser. Vamos jogar a fase um.',
  },
];

/**
 * O tour da primeira partida. A ordem importa: ela é a ordem em que o jogo
 * cobra as coisas do jogador.
 */
export const TOUR: SpokenLine[] = [
  {
    id: 'welcome',
    title: 'Cada carta é uma palavra',
    text: 'Toda carta na mesa é uma palavra em inglês. Leve cada uma até a categoria a que ela pertence.',
    say: 'Vamos jogar. Toda carta na mesa é uma palavra em inglês, e o seu trabalho é levar cada uma até a categoria a que ela pertence.',
  },
  {
    id: 'slots',
    title: 'As quatro vagas',
    text: 'As categorias ficam aqui. Começam fechadas, e a fase sempre tem mais categorias do que vagas.',
    say: 'Estas quatro vagas recebem as categorias. Elas começam fechadas, e a fase sempre tem mais categorias do que vagas.',
  },
  {
    id: 'gold',
    title: 'A carta dourada abre a vaga',
    text: 'Ela traz o nome de uma categoria. Arraste-a até uma vaga para abrir.',
    say: 'Esta carta dourada traz o nome de uma categoria. Arraste ela até uma vaga para abrir aquela categoria. A vaga é você quem escolhe.',
  },
  {
    id: 'word',
    title: 'Agora leve uma palavra',
    text: 'Agora arraste uma palavra dessa categoria até a vaga.',
    say: 'Muito bem. Agora arraste uma palavra dessa categoria até a vaga que você abriu.',
  },
  {
    id: 'hold',
    title: 'Não sabe a palavra?',
    text: 'Segure o dedo numa carta para ver o significado e ouvir a pronúncia. É de graça.',
    say: 'E quando não souber a palavra? Segure o dedo nela: aparecem o significado e o botão de ouvir. É de graça e não gasta movimento.',
  },
  {
    id: 'moves',
    title: 'Os movimentos são contados',
    text: 'Cada jogada gasta um movimento, e errar a categoria também. Complete todas antes que acabem.',
    say: 'Cada jogada gasta um movimento, e errar a categoria também gasta. Complete todas antes que eles acabem. Boa partida!',
  },
];
