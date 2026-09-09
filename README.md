# VocaBee

Jogo de cartas para Android e iOS inspirado em *Solitaire Associations*, com uma
diferença: aqui o objetivo **é** aprender vocabulário de inglês.

**Segure o dedo em qualquer carta** e ela abre o verbete em português —
tradução, definição, fonética e um exemplo. Consultar nunca gasta movimento nem
penaliza: é exatamente o que o jogo quer que você faça.

Interface em português do Brasil · palavras estudadas em inglês.

---

## Índice

- [Como se joga](#como-se-joga)
- [O meta-jogo](#o-meta-jogo)
- [Rodando no celular](#rodando-no-celular)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como os níveis são gerados](#como-os-níveis-são-gerados)
- [Testes](#testes)
- [Mexendo no jogo](#mexendo-no-jogo)
- [Publicar nas lojas](#publicar-nas-lojas)
- [Próximos passos](#próximos-passos)

---

## Como se joga

```
[← ] Fase 3  🪙 1250          [•••]
[Moves 58]
[ descarte ▸▸ ]                  [ baralho ]
[ vaga ] [ vaga ] [ vaga ] [ vaga ]   <- 4 vagas de categoria
[ col  ] [ col  ] [ col  ] [ col  ]   <- 4 colunas em escada
                💡3     ↩4
```

**O básico**

- **Arraste** a carta até a vaga da categoria a que ela pertence. Soltou no
  lugar errado? A tela treme, a carta volta e **não custa nada** — o jogo quer
  que você arrisque palavras que não conhece.
- **Segure o dedo** em qualquer carta virada para cima para abrir o verbete.
  Nunca gasta movimento. É a mecânica central do jogo.
- Toque no **baralho** para virar mais cartas. Quando ele acaba, o descarte
  volta para ele.
- Cada jogada custa **1 movimento**. Você vence completando **todas** as
  categorias do nível antes de os movimentos acabarem.

**Cartas douradas**

- As **cartas douradas com estrela** trazem o nome de uma categoria (*Animals*,
  *Tools*, *Weather*...). Arraste uma delas até uma vaga livre (a da coroa) para
  abrir aquela categoria — você escolhe qual vaga.
- O nível tem **mais categorias do que as quatro vagas** (5 no começo, chegando
  a 8). Ao completar uma categoria ela sai do tabuleiro e **a vaga fica livre**
  para a próxima dourada.
- **Errar custa um movimento.** Soltar a carta numa categoria que não é a dela,
  ou numa coluna que não a aceita, desconta do orçamento. Devolver a carta para
  a coluna de onde ela saiu não custa nada — é desistir do arrasto, não errar.

**Colunas e montes**

- Cada coluna começa com **uma única carta virada para cima**; o resto está de
  costas. Só dá para arrastar a **última carta de cada coluna** e a do topo do
  descarte.
- Dá para **empilhar cartas nas colunas**, mas só sobre uma palavra da **mesma
  categoria**. É assim que se desenterra palavra: a carta sai da frente e a de
  baixo vira. Uma **coluna vazia** aceita qualquer carta.
- Cartas da mesma categoria empilhadas formam um **monte**. Arraste a de baixo
  e o monte inteiro vai junto, por **1 movimento só** — tanto para outra coluna
  quanto direto para a vaga da categoria.
- A regra da dourada é **assimétrica de propósito**: nada se empilha sobre ela
  (precisa continuar alcançável), mas ela **viaja junto** com as palavras da
  categoria dela que estiverem embaixo. Se esse monte for para uma vaga livre,
  a dourada abre a categoria e as palavras já entram nela.

**Ajudas**

- **💡 dica** aponta uma carta jogável — nunca a vaga de destino, porque isso
  entregaria a categoria, que é justamente o que você deve deduzir.
- **↩ desfazer** volta a última jogada.

Cada um tem uso limitado por fase (3 dicas, 4 desfazeres).

---

## O meta-jogo

O gameplay é o centro, mas ele alimenta uma camada de progressão.

| Tela | O que tem |
|---|---|
| **Início** | avatar, nível, barra de XP, moedas, sequência, botão de jogar, recompensa diária, missões do dia e atalhos |
| **Jornada** | trilha infinita de fases com estrelas, dificuldade (Fácil → Desafio), recompensa e status, com medalha a cada dez |
| **Recompensas** | sequência de dias, ciclo diário de 7 dias, missões e 8 conquistas com barra de progresso |
| **Loja** | 6 personagens compráveis com moedas do jogo, em 4 raridades |
| **Vocabulário** | todas as palavras que você descobriu, com pronúncia (🔊) e favoritos, filtráveis |
| **Pronúncia** | o 🔊 aparece na própria carta, no dicionário, no vocabulário e no fim da fase; o áudio vem embarcado, então soa igual em qualquer aparelho |
| **Perfil** | nível, XP, sequência, palavras, estrelas, fases, precisão, conquistas |
| **Ajustes** | nome, som/pronúncia, reduzir animações, apagar progresso |
| **Tour** | na primeira partida, seis passos com holofote ensinam a jogar; os três do meio esperam o gesto de verdade, e uma **voz narra** cada passo |

**Onboarding** de três telas aparece só no primeiro acesso.

### Economia

| Ação | Recompensa |
|---|---|
| Completar uma fase | +50 XP · +30 🪙 |
| Terminar sem nenhum erro | +20 XP |
| **Descobrir uma palavra nova** | +5 XP |
| Cada estrela além da primeira | +10 🪙 |

**Estrelas** medem as duas coisas que o jogo ensina:

| Estrela | Como se ganha |
| --- | --- |
| 1ª | vencer a fase |
| 2ª | vencer **sem errar nenhuma carta** |
| 3ª | vencer com pelo menos 12% do orçamento de movimentos sobrando |

Terminar com 100% de acerto sempre vale ao menos duas estrelas.

**Nível do jogador**: o nível *n* custa `100 + (n−1) × 50` XP.

Repare no que **não** é premiado: velocidade e número de toques. Consultar o
dicionário continua de graça e sem limite — a gamificação existe para reforçar o
aprendizado, não para apressar o jogador. O que custa é **chutar**: é a
diferença entre estudar a carta e sair tentando vaga por vaga.

### Persistência

Tudo fica salvo **só no aparelho**, via `AsyncStorage`, atrás de
`playerRepository`. Nada é enviado para a internet. Saves antigos são
completados automaticamente (`migrate`) para que uma atualização não apague
progresso.

---

## Rodando no celular

Você **não precisa** de Android Studio nem de um Mac.

### 1. Instalar as dependências (só na primeira vez)

```bash
npm install
```

### 2. Subir o servidor

```bash
npm start -c
```

O `-c` limpa o cache — use sempre depois de instalar uma dependência nova.

O Metro mostra um QR Code e um menu de teclas:

| tecla | o que faz |
|-------|-----------|
| `w`   | abre no **navegador** — jeito mais rápido de iterar |
| `a`   | abre num **emulador Android** (se você tiver o Android Studio) |
| `r`   | recarrega o app |
| `j`   | abre o **depurador** |

### 3. Abrir no celular

1. Instale o **Expo Go** ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   / [App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. Celular e PC na **mesma rede Wi-Fi**.
3. **Android**: abra o Expo Go e use **"Scan QR code"** — a câmera do sistema
   não serve, ela responde *"No usable data found"* porque não sabe abrir um
   endereço `exp://`.
   **iPhone**: a câmera nativa funciona.

O jogo **recarrega sozinho** toda vez que você salva um arquivo.

### Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `Port 8081 is being used` | Metro antigo aberto. Responda `y` para usar outra porta, ou `npx kill-port 8081` |
| *"No usable data found"* ao escanear | Você usou a câmera do sistema. Escaneie **de dentro do Expo Go** |
| *"You're signed in to Expo Go as X, but not signed in to Expo CLI"* | Descompasso de conta. Ou **saia da conta no Expo Go**, ou rode `npx expo login --browser` no PC. Confira com `npx expo whoami` |
| QR não conecta | Redes diferentes. Use `npm start -c --tunnel` (esse modo exige login) |
| Quero digitar o endereço | No Expo Go, *Enter URL manually*: `exp://SEU-IP:8081` |
| Quero o jogo zerado (para gravar) | **Ajustes › Apagar progresso**. Volta tudo ao primeiro uso: apresentação, tour da primeira partida, XP, moedas, fases e vocabulário |
| Toco no 🔊 e não sai som | Confira o interruptor *Sons e pronúncia* em **Ajustes** e o volume do aparelho. A pronúncia é um arquivo embarcado e não depende de vozes instaladas no sistema |

> É `npx` (n-p-x), não `nxp`.

---

## Extensões do VS Code

Abra a pasta e o VS Code oferece as recomendadas (ou `Ctrl+Shift+X` → `@recommended`).

| Extensão | Para quê |
|----------|----------|
| **Expo Tools** (`expo.vscode-expo-tools`) | autocompletar no `app.json`, atalhos do Expo |
| **React Native Tools** (`msjsdiag.vscode-react-native`) | depurar com breakpoints |
| **ES7+ React snippets** (`dsznajder.es7-react-js-snippets`) | atalhos tipo `rnfc` |
| **Prettier** (`esbenp.prettier-vscode`) | formatação automática |

O TypeScript já vem embutido no VS Code.

---

## Estrutura do projeto

Expo SDK 57 · React Native 0.86 · TypeScript. Roda em Android, iOS e navegador
com o mesmo código.

```
App.tsx                    casca: fontes -> jogador -> navegação -> tela
src/
  game/engine.ts           REGRAS do jogo (TypeScript puro, sem React)
  player/
    types.ts               formato do estado do jogador
    progression.ts         XP, estrelas, moedas, sequência (puro, testável)
    repository.ts          persistência (AsyncStorage atrás de uma interface)
    PlayerProvider.tsx     estado global + ações (finishLevel, claimDaily...)
  navigation/Router.tsx    pilha de telas em estado + barra de abas
  data/
    words.ts               200 palavras em 20 categorias, com verbete em PT
    characters.ts          6 personagens da loja
    achievements.ts        8 conquistas (cada uma mede o próprio progresso)
    missions.ts            missões diárias
    dailyRewards.ts        ciclo de 7 dias
  ui/
    primitives.tsx         Button, Surface, ProgressBar, Badge, Avatar, StatChip
    Icon.tsx               os 26 ícones do jogo, em SVG de traço
    Logo.tsx               a mascote: a abelha, em SVG
    Screen.tsx             casca de tela do meta-jogo
  components/
    CardFace.tsx           a carta (costas / palavra / dourada) e o virar
    CategorySlotView.tsx   a vaga de categoria, com contador e abinha
    WordSheet.tsx          o dicionário que sobe ao segurar o dedo (com "Ouvir")
    WordCard.tsx           verbete no vocabulário (pronúncia e favorito)
    MissionCard.tsx        missão com progresso e resgate
    CelebrationModal.tsx   comemoração (diária, missão, compra)
    LevelCompleteModal.tsx resultado da fase
  screens/                 Game, Home, Journey, Rewards, Shop, Vocabulary,
                           Profile, Settings, Onboarding
  speech.ts                pronúncia e narração: áudio embarcado, com a
                           voz do sistema como reserva
  data/tour.ts             roteiro escrito e falado da apresentação e do tour
  audio/clips.ts           mapa texto → arquivo (GERADO, não editar)
assets/audio/              220 MP3: 200 palavras e 20 categorias (774 KB)
scripts/generate-audio.py  regera o áudio e o mapa
scripts/generate-icons.py  redesenha os ícones a partir da mascote
scripts/preview-voices.py  compara vozes de narração
  theme.ts                 tokens: paleta, camada semântica, tipografia,
                           espaçamento, raio e sombra
.claude/skills/            skills do projeto (ver abaixo)
```

**Duas separações sustentam o projeto**: `engine.ts` e `progression.ts` não
sabem que o React existe. Ambos recebem um estado e devolvem um estado novo, o
que permite provar o comportamento rodando com node, sem abrir o app.

**Dependências** (poucas, de propósito): `expo-linear-gradient`, `expo-font` +
**Fredoka** (interface) e **Nunito Sans** (palavras e texto corrido),
`react-native-svg` (sistema de ícones), `expo-speech` (pronúncia) e
`@react-native-async-storage/async-storage` (persistência). Gestos usam
`PanResponder` + `Animated` do próprio React Native — sem `reanimated` nem
`gesture-handler`. Navegação é própria, sem biblioteca.

**Zero emoji na interface**: os 26 ícones são SVG de traço 1.9 na grade 24×24,
em `src/ui/Icon.tsx`. Emoji sobrou apenas nos avatares dos personagens, que são
espaço reservado até haver ilustração — `characters.ts` já tem o campo `image`.

### Skills do projeto

`.claude/skills/` tem quatro skills que orientam quem for mexer no código:

| Skill | Escopo |
|---|---|
| `frontend-design` | aparência: tokens, tipografia, geometria do tabuleiro |
| `game-ui-ux` | regras e compreensão do jogador, feedback, estados |
| `educational-game-design` | vocabulário, traduções, dificuldade, valor educativo |
| `mobile-game-development` | gestos, Expo/RN, testes por simulação |

---

## A marca

O nome é **VocaBee** — *vocabulary* mais *bee*, com o eco de *spelling bee*. A
mascote é a **Bia**, a abelha: ela é o ícone do app, abre a apresentação, marca
o **verso de toda carta virada para baixo**, comemora no fim da fase e é o
personagem inicial gratuito da loja. Nunca aparece sobre o tabuleiro — ali quem
manda são as cartas.

O motivo secundário é o **hexágono da colmeia**, sempre decorativo e em
opacidade baixa: o fundo da abertura e o cartão de jogar da Home. Símbolo é a
Bia; colmeia é textura.

O desenho existe duas vezes, de propósito:

- [src/ui/Logo.tsx](src/ui/Logo.tsx) — SVG, para a tela. `LogoMark` aceita as
  cores, então no verso da carta ela vira uma abelha verde monocromática em vez
  de dourada, e `detail` desliga antenas e olhos abaixo de uns 30dp, onde eles
  viram sujeira.
- [scripts/generate-icons.py](scripts/generate-icons.py) — o mesmo desenho, nas
  mesmas proporções (uma grade de 40 por 40), rasterizado para os PNG de
  `assets/`.

Manter os dois lado a lado, com as medidas iguais, é o que impede o ícone da
loja e o verso da carta de virarem duas abelhas diferentes. Ao mexer em um,
mexa no outro e rode:

```bash
.ttsenv/Scripts/python -m pip install pillow
.ttsenv/Scripts/python scripts/generate-icons.py
```

As listras são retângulos **recortados pelo corpo**, não faixas desenhadas à
mão: assim elas acompanham a curva da elipse em qualquer tamanho.

---

## Pronúncia

O 🔊 toca um **arquivo de áudio embarcado no aplicativo**, não a voz do sistema.

O motivo é prático: a voz do sistema só fala inglês se o aparelho tiver o pacote
de voz inglês instalado. Num celular ou PC em português isso não é garantido, e
onde falta o resultado é silêncio ou — pior para quem está aprendendo — a
palavra lida com pronúncia portuguesa. Com o áudio embarcado, a pronúncia é a
mesma em qualquer aparelho e funciona sem internet.

São 229 arquivos, 1 MB no total: MP3 mono de 32 kbps, com silêncio curto nas
pontas e volume normalizado.

| O quê | Quantos | Idioma |
| --- | --- | --- |
| Palavras do jogo | 200 | inglês |
| Nomes de categoria (as cartas douradas) | 20 | inglês |
| Narração da apresentação e do tour | 9 | português |

Os mapas `texto → arquivo` (`CLIPS`) e `id → arquivo` (`NARRATION`) ficam em
[src/audio/clips.ts](src/audio/clips.ts), que é **gerado** — não edite à mão.

### A narração

O texto falado e o texto escrito saem do **mesmo arquivo**,
[src/data/tour.ts](src/data/tour.ts): o gerador lê `say` de lá. Se um mudasse
sem o outro, a voz ficaria explicando o que a tela não diz mais — e um teste
falha se algum passo do roteiro ficar sem gravação.

Escrito e falado não são o mesmo texto de propósito: lendo, o jogador varre a
frase com os olhos; ouvindo, ele precisa de uma frase inteira, com o começo
situando o assunto. Cada fala tem entre 4,5 e 7 segundos.

A narração sai pelo mesmo tocador da pronúncia, então tocar numa palavra
durante a explicação cala a narração — o jogador pediu para ouvir outra coisa.

#### Escolher outra voz

Voz sintética livre em português tem teto de qualidade baixo. Para comparar as
disponíveis com a mesma frase:

```bash
.ttsenv/Scripts/python scripts/preview-voices.py
```

Escreve em `.voice-preview/` um arquivo por voz e por ritmo. Ouça, escolha,
troque `MODEL_PT` em `scripts/generate-audio.py` e rode com `--narration`.

| Voz | Licença |
| --- | --- |
| `pt_BR-faber-medium` (em uso) | CC0 |
| `pt_BR-cadu-medium` | CC0 |
| `pt_BR-jeff-medium` | CC0 |
| `pt_BR-edresson-low` | CC BY 4.0, exige atribuição |

#### Gravar com a própria voz

É o que soa melhor, e sai de graça. Três passos:

```bash
.ttsenv/Scripts/python scripts/generate-audio.py --roteiro   # o que dizer
# grave cada trecho em narration/<id>.wav
.ttsenv/Scripts/python scripts/generate-audio.py --narration
```

Todo id com gravação em `narration/` entra no lugar da voz sintética; os que
faltarem continuam sintetizados, então dá para gravar aos poucos. Não se
preocupe com o nível nem com o silêncio no começo: o próprio script corta as
pontas mudas e normaliza o volume para casar com o resto do jogo.

**Ao adicionar palavras**, rode o gerador de novo:

```bash
python -m venv .ttsenv
.ttsenv/Scripts/python -m pip install piper-tts
.ttsenv/Scripts/python -m piper.download_voices en_US-ljspeech-high --download-dir .voices
.ttsenv/Scripts/python scripts/generate-audio.py
```

Precisa de `ffmpeg` no PATH. Palavra sem arquivo ainda funciona: cai na voz do
sistema, que é a reserva.

**Licença das vozes:**

| Uso | Voz | Licença |
| --- | --- | --- |
| Palavras | `en_US-ljspeech-high` | domínio público (LJ Speech Dataset) |
| Narração | `pt_BR-faber-medium` | CC0 |

Cuidado ao trocar de voz: várias vozes do Piper de qualidade parecida (a
`lessac` e a `ryan`, por exemplo) vêm de conjuntos cuja licença é só para
pesquisa e proíbe uso comercial e redistribuição.

Para reescrever só o roteiro falado, sem refazer as 220 palavras:

```bash
.ttsenv/Scripts/python scripts/generate-audio.py --narration
```

---

## Como os níveis são gerados

Um tabuleiro sorteado no braço trava com frequência. Então `createLevel()`:

1. escolhe de 5 a 7 categorias (mais do que as 4 vagas) e as cartas — a partir
   de uma **semente derivada do número da fase**, então a fase 7 é sempre a
   mesma fase 7, inclusive ao reiniciar;
2. coloca **toda carta dourada num lugar alcançável** — no baralho ou no fim de
   uma coluna, nunca enterrada. Como uma palavra só se empilha sobre a mesma
   categoria, uma dourada presa embaixo de uma carta sem destino travaria o
   tabuleiro;
3. **resolve o tabuleiro** com um solucionador guloso e só o aceita se ele tiver
   solução — senão sorteia de novo;
4. define o orçamento de movimentos a partir da solução encontrada
   (`solução × 1,28 + 4`);
5. se o sorteio insistir em travar, **relaxa a configuração** (colunas mais
   rasas, baralho maior) em vez de entregar um nível impossível.

### Quantas fases

**Não há um número fixo:** cada fase é gerada na hora e a jornada não acaba —
você entra na maior fase concluída mais um, para sempre.

O que tem fim é a **escalada**. O tabuleiro cresce até a fase 30 e para por ali:
uma partida maior que isso passa de dez minutos e deixa de ser exercício. Da 30
em diante o desafio é o vocabulário, não o tamanho da mesa.

| Fases | Categorias | Cartas | Colunas | Baralho | Dicas / desfazer |
| --- | --- | --- | --- | --- | --- |
| 1–5 | 5 | 22 | 5-4-3-2 | 8 | 3 / 4 |
| 6–8 | 6 | 27 | 5-4-3-2 | 13 | 3 / 4 |
| 9–10 | 6 | 33 | 6-5-4-3 | 15 | 3 / 4 |
| 11–15 | 7 | 38 | 7-6-5-4 | 16 | 2 / 3 |
| 16 | 8 | 44 | 8-7-6-5 | 18 | 2 / 3 |
| 17–20 | 8 | 52 | 9-8-7-6 | 22 | 2 / 3 |
| 21–30 | 8 | 52 | 9-8-7-6 | 22 | 1 / 2 |

São **três eixos de progressão**, e só o primeiro alonga a partida:

1. o tabuleiro, que cresce até a fase 17;
2. a ajuda, que cai de 3 dicas e 4 desfazer para 1 e 2;
3. o orçamento de movimentos, que aperta de `1,28 × solução` para `1,21 ×`.

A profundidade das colunas sai do **tamanho do tabuleiro**, não do número da
fase — assim o baralho guarda sempre cerca de 40% das cartas. Quando estava
amarrada à fase, a 17 pedia 105 movimentos e a 21 pedia 74: mais cartas e menos
trabalho, que é o contrário do que a jornada promete.

### Variedade entre as fases

As categorias e as palavras não são sorteadas do zero a cada fase: as duas são
**janelas que andam** sobre o catálogo. A janela de categorias avança de fase em
fase, então fases seguidas quase não repetem tema (0,9 categoria repetida em
média, contra 3 de um sorteio livre); dentro de cada categoria, a janela de
palavras também anda, então duas fases que usem *Animals* pegam palavras
diferentes. Em 30 fases as 200 palavras aparecem, a mais repetida em 10 delas.

### Dificuldade medida

Vitórias por faixa de fases, em simulação:

| Jogador | 1–5 | 6–10 | 11–15 | 16–20 | 21–25 | 26–30 |
| --- | --- | --- | --- | --- | --- | --- |
| conhece as palavras | 100% | 100% | 98% | 90% | 87% | 98% |
| aluno médio | 100% | 95% | 72% | 45% | 42% | 50% |
| chuta bastante | 92% | 33% | 10% | 2% | 0% | 0% |

Quem conhece as palavras tira **3 estrelas em 82%** das fases 1–30 e perde 7%.

**Nenhuma partida termina em beco sem saída** — quem empaca consulta o
dicionário, que é de graça e sempre destrava.

O multiplicador do orçamento é, na prática, **quanta ineficiência por jogada a
fase tolera**: virar uma carta a mais em cada jogada já consome um quarto do
orçamento. É por isso que o jogo pede que você segure o dedo na carta em vez de
procurar no baralho. Para afrouxar, suba o multiplicador em `createLevel()`.

---

## Testes

Não há framework de teste instalado. `engine.ts` e `progression.ts` são puros,
então o jeito de testar é compilá-los para CommonJS e rodar com node:

```bash
npx tsc src/game/engine.ts src/player/progression.ts src/data/achievements.ts \
  --ignoreConfig --outDir /tmp/build --module commonjs --target es2019 \
  --esModuleInterop --skipLibCheck
```

O que vale cobrir, e que já foi verificado desta forma:

- **invariantes do sorteio**: uma carta aberta por coluna, dourada nunca
  enterrada, contagem por categoria, nenhuma carta duplicada;
- **regras de soltar e empilhar**: erro desconta um movimento; devolver a carta
  para a própria coluna não desconta nada;
- **conservação**: palavras no tabuleiro + na vaga + concluídas = total;
- **jogo perfeito vence sempre**; jogador imperfeito que consulta o dicionário
  também;
- **progressão**: curva de XP consistente, limiares de estrela, sequência com
  virada de mês, palavra já conhecida não conta de novo.

Antes de entregar qualquer mudança:

```bash
npx tsc --noEmit
npx expo export --platform android
```

---

## Mexendo no jogo

**Adicionar palavras ou categorias:** edite `src/data/words.ts`. O jogo usa de 5
a 7 categorias por nível, então quanto mais você adicionar, maior a
variedade. Evite palavras ambíguas entre categorias (`nail` serviria a *Tools* e
*Body*) e cognatos transparentes demais.

**Dificuldade:** `levelConfig()` em `src/game/engine.ts` — quantas cartas por
categoria (`sizes`), quantas categorias, profundidade das colunas (`depths`) e
quantas ficam viradas para baixo (`faceDown`).

**Orçamento, dicas e desfazer:** `createLevel()` e `buildBoard()` no mesmo
arquivo (`hints: 3, undos: 4`).

**Economia (XP, moedas, estrelas):** constantes no topo de
`src/player/progression.ts`.

**Cores, fontes e espaçamento:** `src/theme.ts`. Nenhum componente escreve cor
solta.

---

## Publicar nas lojas

O Expo Go serve para desenvolver. Para gerar o app instalável:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # APK para instalar e testar
eas build -p ios                         # app iOS — na nuvem, sem Mac
```

O build roda nos servidores do Expo, então **dá para gerar o app iOS a partir do
Windows**. Publicar na App Store exige conta de desenvolvedor Apple
(US$ 99/ano); a Google Play cobra US$ 25 uma única vez.

---

## Próximos passos

- **Frases faladas**: hoje o áudio embarcado cobre palavras e categorias. Os
  exemplos de uso (`ex`) ainda não têm gravação; dariam ouvido para a palavra
  dentro de uma frase.
- **Revisão espaçada**: as palavras consultadas já ficam salvas; falta fazer o
  sorteio do nível preferir as difíceis e as recém-vistas. É o que transforma o
  jogo em estudo de verdade.
- **Vibração** no acerto e no erro com `expo-haptics`.
- **Quebrar o `GameScreen.tsx`** (~1.000 linhas): extrair HUD e tabuleiro. Mexe
  na geometria do arrasto, então faça isolado, com os testes de gameplay como
  rede.
- **Arte própria**: hoje avatares e ícones são emoji. `characters.ts` já tem
  campo `image` para trocar sem mexer na interface.
- **Ícone e splash**: arquivos em `assets/` e `name` no `app.json`.
