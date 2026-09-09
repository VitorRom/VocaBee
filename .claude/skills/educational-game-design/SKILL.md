---
name: educational-game-design
description: Vocabulário e valor educativo — escolher palavras, escrever tradução/definição/exemplo em português do Brasil, criar categorias, calibrar dificuldade e desenhar revisão e progresso de aprendizado. Use ao mexer em src/data/words.ts, ao adicionar palavras ou categorias, ao ajustar dificuldade/orçamento de movimentos, ou ao propor revisão espaçada, áudio e estatísticas de aprendizado.
---

# Educational Game Design

O jogo existe para **expandir vocabulário de inglês**. A jogabilidade é o meio.
Se uma mudança deixa o jogo mais viciante e menos instrutivo, ela está errada.

## O banco de palavras

`src/data/words.ts` — 11 categorias, ~10 palavras cada. Cada entrada:

```ts
{ w, ph, pos, pt, def, ex, exPt }
```

- `w` palavra em inglês · `ph` fonética IPA · `pos` classe gramatical **em
  português** ("substantivo", não "noun")
- `pt` tradução curta · `def` **definição em português** (não em inglês)
- `ex` frase de exemplo em inglês · `exPt` tradução da frase

Tudo o que o jogador lê ao segurar o dedo vem daí. É o coração educativo.

## Como escolher palavra

Mire em **intermediário/avançado**: `otter`, `broth`, `chisel`, `drought`,
`longing`. Palavra que todo brasileiro já sabe (`cat`, `dog`, `red`) não ensina
nada e ainda ocupa espaço no baralho.

Evite:

- **ambiguidade entre categorias do jogo** — `nail` (prego/unha) serviria a
  Tools e Body ao mesmo tempo; foi trocada por `chisel` por isso
- cognato transparente demais (`hospital`, `animal`) — não exercita
- gíria, regionalismo e palavra datada

Cada palavra precisa pertencer a **exatamente uma** categoria do arquivo. Antes
de adicionar, verifique se ela não cabe em outra categoria já existente.

## Como escrever a definição

Escreva como um dicionário escolar brasileiro: uma frase, sem usar a própria
palavra, descrevendo o que a coisa é.

> **broth** — Líquido saboroso obtido ao cozinhar carne, ossos ou legumes na água.

Não traduza definição de dicionário inglês ao pé da letra. `exPt` deve soar
como português natural, não decalque.

## Categoria nova

Precisa de: `id`, `en`, `pt`, `emoji`, `color` e **pelo menos 7 palavras** (o
gerador sorteia até 6 por categoria por nível). Categorias muito próximas
(`Food` e `Kitchen`) criam ambiguidade e devem ser evitadas.

## Dificuldade

`levelConfig()` em `engine.ts` controla quantas cartas por categoria, quantas
categorias e a profundidade das colunas.

Dificuldade **boa** vem de: palavras menos frequentes, mais categorias
disputando 4 vagas, colunas mais fundas, orçamento de movimentos mais apertado.

Dificuldade **ruim** vem de: só empilhar mais cartas, esconder informação do
jogador, ou punir erro.

Hoje o orçamento é `solução_gulosa × 1,6 + 12` e sobra ~30 movimentos: o limite
quase nunca aperta. É uma escolha consciente (jogo de aprender), mas é o
parâmetro a mexer se pedirem mais tensão.

## O dicionário é de graça — sempre

Segurar o dedo numa carta abre o verbete e **não custa movimento nem ponto**.
Essa é a mecânica que transforma o jogo em estudo. Qualquer proposta de limitar,
cobrar ou cronometrar a consulta contraria o propósito do projeto — levante isso
em vez de implementar calado.

## O que ainda NÃO existe

Não presuma que existam: XP, moedas, loja, personagens, conquistas, streaks,
mapa de jornada, favoritos, estado de "palavra dominada" ou revisão espaçada.
Hoje o app guarda apenas, **em memória e só durante a partida**, quantas
palavras foram consultadas.

Se for implementar aprendizado persistente, o caminho natural é:

1. persistir com `@react-native-async-storage/async-storage`
2. marcar as palavras consultadas como "difíceis"
3. fazer o sorteio do nível preferir palavras difíceis e recém-vistas
4. só então pensar em sessão de revisão

Progresso de jogo (nível, movimentos) e progresso de aprendizado (palavras
vistas, dominadas) são coisas diferentes e não devem ser somados num número só.

## Público

Interface em **português do Brasil**; as palavras estudadas ficam em inglês.
Fonética em IPA, que é o que dicionário sério usa.
