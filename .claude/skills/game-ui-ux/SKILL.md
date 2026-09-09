---
name: game-ui-ux
description: Regras do jogo e compreensão do jogador — o que acontece ao arrastar/soltar, feedback de acerto e erro, estados de vaga e coluna, dica, desfazer, telas de vitória e derrota, texto de ajuda. Use ao mudar ou explicar regra, ao ajustar feedback, ou quando o usuário disser que algo "não deveria poder", "deveria mover junto", "está fácil demais" ou "não entendi o que aconteceu". Para aparência use frontend-design.
---

# Game UI/UX

O jogador precisa sempre conseguir responder: **o que posso arrastar, para onde,
e por que aquilo foi recusado.**

**Escopo desta skill: regra e compreensão.** Aparência é `frontend-design`.
Gesto e implementação são `mobile-game-development`.

## As regras atuais (confira antes de mudar)

Estão em `src/game/engine.ts`, que é a fonte da verdade.

- **4 vagas de categoria**, mas o nível tem **5 ou 6 categorias**. Ao completar
  uma, ela sai do tabuleiro e a vaga volta a ficar livre.
- **Carta dourada** ocupa uma vaga livre e abre aquela categoria. O jogador
  escolhe qual vaga.
- **Palavra** só entra na vaga da categoria dela.
- **Colunas**: só a última carta é arrastável; cada coluna começa com uma única
  carta virada para cima.
- **Empilhar** numa coluna só vale sobre uma palavra da **mesma categoria**.
  Coluna vazia aceita qualquer coisa.
- **A dourada é assimétrica de propósito**: nada se empilha sobre ela, mas ela
  viaja junto com as palavras da categoria dela que estiverem embaixo. Se esse
  monte for para uma vaga livre, ela abre a categoria e as palavras já entram.
- **Monte** = bloco final de uma categoria só. Anda inteiro, por 1 movimento.
- **Cada jogada custa 1 movimento. Errar custa 0.**

## O princípio que sustenta o jogo

**Errar não pode doer.** A carta volta, a tela treme de leve, e nada mais. O jogo
existe para o jogador arriscar palavras que não conhece e depois conferir.

Consequência: **consultar o dicionário (toque longo) nunca gasta movimento nem
penaliza**. Se alguém propuser cobrar por isso, é uma regressão do propósito.

## Nunca entregue a resposta

- a **dica** aponta a carta jogável, **nunca a vaga de destino** — mostrar a vaga
  entrega a categoria, que é justamente o que o jogador deve deduzir
- não destaque vagas compatíveis durante o arrasto; destaque só a vaga **sob o
  dedo**, de forma neutra
- não agrupe nem colora cartas por categoria

## Feedback obrigatório

| Ação | O que o jogador vê |
|---|---|
| soltou certo | a carta voa até o destino, a vaga pulsa, e só então a jogada conta |
| soltou errado | a tela treme e um aviso diz **o motivo** |
| soltou fora de alvo | volta em silêncio, sem tremer, sem custo |
| soltou na própria coluna | volta em silêncio — desistir não é erro |
| categoria concluída | aviso de "completa — vaga liberada" |
| poucos movimentos | a fita de Moves fica vermelha |

O aviso de recusa precisa ser específico: "essa palavra não é dessa categoria",
"nada se empilha sobre uma dourada", "só empilha sobre a mesma categoria". Um
"não pode" genérico não ensina nada.

## Estados que não podem faltar

vaga livre (coroa) · vaga aberta com contador `n/total` · coluna vazia ·
carta bloqueada · carta na mão (fantasma na origem) · contorno de pouso ·
dica destacada · vitória · derrota por movimentos · dica/desfazer esgotados.

## Vitória e derrota

Vence ao concluir **todas** as categorias do nível. Perde ao zerar os
movimentos. A tela final mostra movimentos usados e **quantas palavras foram
consultadas** — esse número é o resultado educativo da partida, não um placar.

## Ajuda

O texto de "Como jogar" (menu `•••`) precisa acompanhar qualquer mudança de
regra. Regra alterada e ajuda desatualizada é bug.

## Ao mudar uma regra

Mexa em `engine.ts`, não na tela. Depois **prove com simulação** que o nível
continua vencível (ver `mobile-game-development`) e atualize o texto de ajuda e
o README.
