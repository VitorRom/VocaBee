---
name: frontend-design
description: Sistema visual do jogo — cores, tipografia, tokens do theme.ts, aparência das cartas, geometria do tabuleiro e responsividade. Use ao mexer em estilo, layout, fontes, paleta, sombras, gradientes, tamanho/posição de carta, ou quando algo "não está bonito", "está feio", "cortado", "em zoom" ou "estourando a tela". Para o que o jogador ENTENDE (feedback, estados, regras), use game-ui-ux.
---

# Frontend Design

Sistema visual do VocaBee: um clone de *Solitaire Associations* em
Expo/React Native cujo objetivo é ensinar vocabulário de inglês a brasileiros.

**Escopo desta skill: a aparência.** O que o jogador precisa *entender* é a
`game-ui-ux`. A mecânica de gesto é a `mobile-game-development`.

## O que já existe (não reinvente)

- `src/theme.ts` exporta `theme.colors`, `theme.radius` e `fonts`. **Toda cor e
  toda fonte saem daí.** Nunca escreva um hex solto num componente.
- Fontes: **Fredoka** (`fonts.display*`) na interface — números, títulos, nomes
  de categoria; **Poppins** (`fonts.body*`) nas palavras e textos longos.
  Carregadas em `App.tsx` com `useFonts`; a tela só monta depois de prontas.
- `expo-linear-gradient` está instalado e é usado **só no fundo**. As cartas e
  os botões são chapados de propósito — o jogo original é plano.
- Componentes visuais: `CardFace.tsx` (costas azuis / palavra / dourada),
  `CategorySlotView.tsx` (vaga + contador + abinha), `WordSheet.tsx` (dicionário).

## Linguagem visual

Referência é o *Solitaire Associations*: **plano, arredondado, limpo**.

- verde de feltro no fundo, cartas brancas, dourado só nas cartas de categoria
- cantos generosos (`width * 0.15` de raio), sombra suave, borda de 1px
- hierarquia por tamanho e peso, não por cor gritante
- o texto da carta é cinza-ardósia (`cardText`), não preto

Evite: gradiente em carta, glassmorphism, roxo genérico de IA, sombra pesada,
decoração que não ajude a ler a palavra.

## Regra que não pode ser quebrada

**Nada na aparência pode entregar a categoria de uma palavra.** Nunca colora,
agrupe ou marque uma carta pela categoria dela. Descobrir a categoria É o
exercício — se a interface entregar, o jogo deixa de ensinar.

A carta dourada é a exceção: ela *é* o nome da categoria, então é dourada.

## Geometria do tabuleiro

Está em `metrics` (`GameScreen.tsx`) e é o ponto onde mais se erra:

- o tamanho da carta sai do **menor** entre o que a largura e a altura permitem;
  dimensionar só pela largura estoura a tela no navegador (já aconteceu)
- `MAX_BOARD_W` limita o tabuleiro e o centraliza — sem isso, tablet e desktop
  viram cartazes
- `CHROME_H` é a soma das alturas fixas fora do tabuleiro. **Se você mudar a
  altura do cabeçalho, do aviso ou dos botões, atualize `CHROME_H`** — a
  matemática do arrasto depende dela
- quando uma coluna cresce por empilhamento, as cartas **se sobrepõem mais**;
  o tamanho da carta não muda no meio do nível

Depois de mexer aqui, confira a conta em várias telas antes de dizer que está
pronto (ver `mobile-game-development`).

## Texto que não cabe

Palavra longa em carta estreita é o caso comum. Use `adjustsFontSizeToFit` com
`minimumFontScale` e a função `fontFor()` de `CardFace.tsx`, que já reduz o
corpo conforme o comprimento. Não deixe `numberOfLines` cortar a palavra.

## Antes de criar componente novo

1. Veja se `CardFace` já resolve com uma prop. Ele desenha costas, palavra e
   dourada, e é reusado até dentro da vaga de categoria.
2. Não duplique estilo — mova para `theme.ts`.
3. Não adicione dependência de UI sem necessidade real.

## Ao terminar

Rode `npx tsc --noEmit` e `npx expo export --platform android`. Diga
explicitamente que **não viu rodando** se não viu — o julgamento visual é do
usuário, e ele testa no Expo Go.
