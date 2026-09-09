---
name: mobile-game-development
description: Implementação Expo/React Native — arrastar e soltar com PanResponder, toque longo, geometria do arrasto, paridade celular/navegador, estado do jogo em engine.ts, rodar no Expo Go e provar por simulação que o nível tem solução. Use ao mexer em gesto, animação, PanResponder, geometria de arrasto, desempenho, ou ao testar/validar mudança de regra antes de entregar.
---

# Mobile Game Development

Expo SDK 57 · React Native 0.86 · TypeScript. Roda em Android, iOS e navegador
pelo mesmo código.

## Antes de escrever código

O `AGENTS.md` do projeto manda **consultar os docs versionados do Expo**
(https://docs.expo.dev/versions/v57.0.0/) antes de codar. Cumpra isso — e não
confie em memória para API de biblioteca.

## Arquitetura — a regra que sustenta tudo

**`src/game/engine.ts` não sabe que o React existe.** Recebe um estado e devolve
um estado novo, sem mutação. É isso que permite testar as regras sem abrir o
app, e foi assim que a dificuldade foi calibrada.

Nunca coloque `useState`, componente ou animação dentro do engine. Nunca coloque
regra de jogo dentro da tela.

## Gestos

O projeto usa **`PanResponder` + `Animated` do core** — de propósito. Não há
`react-native-reanimated` nem `react-native-gesture-handler` instalados, e não
adicione um deles sem motivo medido: os docs do SDK 57 os destacam, mas trocar
implica risco de build e o arrasto atual funciona.

Convivência toque longo × arrasto (já resolvida, não quebre):

- `onStartShouldSetPanResponder` devolve **false**
- `onMoveShouldSetPanResponder` só assume depois de ~5px de movimento
- até lá, o `Pressable` interno trata o toque longo (dicionário)

Um `PanResponder` por posição arrastável (4 colunas + descarte), criados uma vez
em `useMemo`. Os handlers leem `gameRef.current` e `geomRef.current` — **nunca o
estado do closure**, que fica velho no meio do gesto.

## Geometria do arrasto

Tudo é calculado, nada é medido com `measure()`:

- `originOf(src, runLen)` — canto superior esquerdo do monte
- `targetUnder(x, y)` — decide entre vaga e coluna pelo **centro** da carta
- `landingY(col)` — onde o monte pousa

Essas contas dependem das alturas fixas (`HEADER_H`, `HINT_H`, `ACTIONS_H`...).
Mudou altura de layout? Atualize `CHROME_H` e reconfira a zona de soltura.

Ao soltar: anime primeiro, **confirme a jogada só no callback da animação**. E
`useNativeDriver: false` no `pan` — ele recebe `setValue` do JS durante o gesto.

## Navegador

O jogo roda com `w` no Metro e precisa continuar jogável com mouse:

- **`userSelect: 'none'`** na raiz e em todo texto de carta — sem isso o
  navegador seleciona a palavra e o arrasto não sai do lugar (já aconteceu)
- o tabuleiro tem largura máxima e fica centralizado; não dimensione carta só
  pela largura da janela

## Rodar e testar

```bash
npm start        # QR code para o Expo Go; 'w' navegador, 'r' recarrega
npm start -c     # limpa o cache — obrigatório depois de instalar dependência
npx tsc --noEmit
npx expo export --platform android   # prova que empacota
```

## Provar que a regra continua válida

Mudança de regra **não se entrega sem simulação**. Compile o engine sozinho e
rode com node:

```bash
npx tsc src/game/engine.ts --ignoreConfig --outDir <tmp>/build \
  --module commonjs --target es2019 --esModuleInterop --skipLibCheck
node <tmp>/sim.js
```

O que a simulação precisa cobrir:

- **invariantes do sorteio**: uma carta aberta por coluna, dourada nunca
  enterrada, contagem de cartas por categoria, nenhuma carta duplicada
- **jogo perfeito vence sempre**, com folga de movimentos
- **jogador imperfeito**: com probabilidade `ignorance` ele não reconhece a
  palavra; quando empaca, **consulta o dicionário** — modele isso, senão o
  número mede um jogador que não existe
- **conservação**: palavras no tabuleiro + na vaga + concluídas = total

Cuidado com o harness, que já mentiu três vezes neste projeto: simulador que
desiste antes de tentar consultar/cavar, que desiste com carta ainda no baralho,
e `build/` desatualizado medindo a versão anterior do motor. **Quando a medição
acusar um problema grave de design, imprima um estado real e olhe antes de
reescrever qualquer coisa.**

## Desempenho

Durante o arrasto, só faça `setState` quando o alvo **mudar** — atualizar a cada
pixel re-renderiza o tabuleiro inteiro. Anime com `useNativeDriver: true` sempre
que o valor não vier do gesto.

## Ao terminar

Typecheck + bundle + simulação. Depois diga com todas as letras que **não rodou
em aparelho** — quem testa no Expo Go é o usuário.
