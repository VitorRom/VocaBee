import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { CLIPS, NARRATION } from './audio/clips';

/**
 * Pronúncia das palavras em inglês.
 *
 * Há dois caminhos, nesta ordem:
 *
 * 1. **Áudio embarcado** (`assets/audio`, 220 arquivos, 774 KB). É a pronúncia
 *    de verdade: a mesma em qualquer aparelho, sem internet e sem depender de
 *    o sistema ter voz inglesa instalada. Cobre todas as palavras do jogo e os
 *    nomes das categorias — ou seja, tudo que o jogo fala hoje.
 * 2. **Voz do sistema**, só como reserva, para algum texto que ainda não tenha
 *    arquivo. Aqui a voz inglesa não é garantida, e por isso o pedido é
 *    montado de um jeito diferente em cada plataforma (veja `speakOptions`).
 *
 * A regra que governa o arquivo todo: **falar sempre**, e nunca falar em
 * português. Nenhuma espera é ilimitada e nenhuma falta de resposta do motor
 * de voz cancela a fala.
 */

export type SpeakState =
  /** Parado. */
  | 'idle'
  /** Falando agora. */
  | 'speaking'
  /** O jogador desligou o som nas configurações. */
  | 'off'
  /** O motor de voz recusou a fala. */
  | 'error'
  /** O aparelho não tem nenhuma voz em inglês instalada. */
  | 'noVoice';

/**
 * No máximo isto de espera pela lista de vozes.
 *
 * Vale esperar: sem a lista não dá para garantir voz inglesa, e falar com a voz
 * portuguesa ensina a pronúncia errada. A lista é pedida assim que a tela monta
 * (veja `useSpeaker`), então na prática ela já chegou quando alguém toca no
 * alto-falante — esta espera é só a rede de segurança.
 */
const VOICE_WAIT_MS = 1200;
/** No máximo isto de espera para a fala anterior parar. */
const STOP_WAIT_MS = 200;
/** Sem nenhuma notícia até aqui, o indicador de "falando" se apaga sozinho. */
const QUIET_MS = 2500;
/** Quanto tempo o aviso fica na tela. */
const NOTICE_MS = 4000;

export type VoiceChoice =
  /** Achamos uma voz inglesa: é ela que fala. */
  | { kind: 'voice'; identifier: string }
  /** O aparelho não listou vozes (ou demorou demais); fala-se por idioma. */
  | { kind: 'unknown' }
  /** O aparelho listou vozes e nenhuma é inglesa. */
  | { kind: 'none' };

/**
 * Escolhe uma voz em inglês entre as do aparelho.
 *
 * O campo `language` vem em formatos diferentes conforme o aparelho — `en-US`,
 * `en_US`, `eng-USA` — então a comparação é pelo começo, e o inglês americano
 * ganha por ser o que os alunos mais ouvem.
 *
 * `none` e `unknown` são coisas diferentes: lista vazia não quer dizer que o
 * aparelho não fala inglês, quer dizer que não deu para saber.
 */
export function pickEnglishVoice(
  voices: { identifier: string; language?: string }[],
): VoiceChoice {
  if (voices.length === 0) return { kind: 'unknown' };

  const english = voices.filter((v) => /^en/i.test(v.language ?? ''));
  if (english.length === 0) return { kind: 'none' };

  const american = english.find((v) => /^en[-_]?(us|usa)/i.test(v.language ?? ''));
  return { kind: 'voice', identifier: (american ?? english[0]).identifier };
}

/** O inventário de vozes, pedido uma única vez por sessão. */
let voiceLookup: Promise<VoiceChoice> | null = null;
/** A resposta, quando chega. Depois disso ninguém mais espera nada. */
let voiceKnown: VoiceChoice | null = null;
export function englishVoice(): Promise<VoiceChoice> {
  if (!voiceLookup) {
    voiceLookup = Speech.getAvailableVoicesAsync()
      .then(pickEnglishVoice)
      .catch((): VoiceChoice => ({ kind: 'unknown' }));
    void voiceLookup.then((choice) => {
      voiceKnown = choice;
    });
  }
  return voiceLookup;
}

/** Espera limitada: em alguns aparelhos essa promessa simplesmente não volta. */
function voiceWithin(ms: number): Promise<VoiceChoice> {
  if (voiceKnown) return Promise.resolve(voiceKnown);
  return Promise.race([
    englishVoice(),
    new Promise<VoiceChoice>((resolve) => {
      setTimeout(() => resolve({ kind: 'unknown' }), ms);
    }),
  ]);
}

/** Só existe para os testes: esquece o que já foi descoberto sobre as vozes. */
export function resetVoiceCache() {
  voiceLookup = null;
  voiceKnown = null;
}

/**
 * Como pedir a fala em inglês em cada sistema. `null` significa "não fale" —
 * é melhor o silêncio com aviso do que a palavra lida em português.
 *
 * As três regras saem do código nativo de cada plataforma, não de preferência:
 *
 * - **iOS**: `AVSpeechSynthesisVoice(language:)` sempre devolve uma voz, porque
 *   a Apple embarca inglês em todo aparelho. Já o caminho por identificador
 *   LANÇA exceção quando a voz não resolve (voz "enhanced" não baixada, por
 *   exemplo) — e `Speech.speak` não captura essa promessa, então a exceção
 *   vira silêncio absoluto, sem erro e sem callback. Por isso aqui nunca se
 *   manda identificador: só o idioma.
 * - **Android**: idioma indisponível cai em `Locale.getDefault()`, ou seja,
 *   leria a palavra em português. Uma voz desconhecida é ignorada sem erro.
 *   Então mandamos as duas coisas, e se não houver voz inglesa não falamos.
 * - **Web**: o navegador ignora o `lang` quando nenhuma voz é indicada e usa a
 *   padrão do sistema. Sem voz inglesa identificada, não falamos.
 */
function speakOptions(choice: VoiceChoice): Speech.SpeechOptions | null {
  const common = { language: 'en-US', rate: 0.9 } as const;

  if (Platform.OS === 'ios') {
    // Sem `useApplicationAudioSession: false` a fala sai pela sessão de áudio
    // do aplicativo, que a chave de silencioso do aparelho emudece.
    return { ...common, useApplicationAudioSession: false };
  }

  if (Platform.OS === 'android') {
    if (choice.kind === 'none') return null;
    return choice.kind === 'voice' ? { ...common, voice: choice.identifier } : common;
  }

  return choice.kind === 'voice' ? { ...common, voice: choice.identifier } : null;
}

/**
 * Se a fala passar disto sem avisar que acabou, o indicador se apaga.
 *
 * É só um limite visual, e não o fim da fala: as narrações do tour passam de
 * oito segundos e continuam tocando normalmente depois disto.
 */
const CLIP_TIMEOUT_MS = 4000;

/**
 * O navegador só libera som depois que a pessoa interage com a página.
 *
 * A narração de abertura começa sozinha, antes de qualquer toque. No aparelho
 * isso é normal; na web o `play()` é recusado em silêncio — o expo-audio nem
 * devolve a promessa recusada (`AudioPlayer.web.ts`: `this.media.play()` sem
 * `catch`), então não há sequer como saber que falhou. Quem abre o link do zero
 * perderia justo a primeira fala.
 *
 * Então a fala fica guardada e sai no primeiro toque. Se a essa altura ela já
 * tiver sido substituída pela do passo seguinte, `start` não faz nada — nada se
 * acumula.
 */
type GestureTarget = {
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

/** Fora da web não há bloqueio nenhum: já nasce liberado. */
let gestureDone = Platform.OS !== 'web';
let pendingStart: (() => void) | null = null;

function gestureTarget(): GestureTarget | null {
  const g = globalThis as unknown as Partial<GestureTarget>;
  return typeof g.addEventListener === 'function' && typeof g.removeEventListener === 'function'
    ? (g as GestureTarget)
    : null;
}

function onFirstGesture() {
  gestureDone = true;
  const target = gestureTarget();
  GESTURE_EVENTS.forEach((name) => target?.removeEventListener(name, onFirstGesture));
  const run = pendingStart;
  pendingStart = null;
  run?.();
}

/**
 * Passa a ouvir o primeiro toque já na carga do módulo.
 *
 * Não dá para armar isso só quando uma fala tenta tocar: entre abrir a página e
 * o áudio da abertura ficar pronto passam alguns instantes, e um toque dado aí
 * no meio se perderia — a página já estaria liberada e o aplicativo ainda
 * esperando um segundo toque que talvez não venha.
 */
function armGesture() {
  if (gestureDone) return;
  const target = gestureTarget();
  if (!target) {
    gestureDone = true;   // sem página, não há bloqueio a respeitar
    return;
  }
  GESTURE_EVENTS.forEach((name) => target.addEventListener(name, onFirstGesture));
}

armGesture();

/**
 * Libera agora, ou guarda para o primeiro toque.
 *
 * Fica no caminho de quem de fato manda tocar, e não em volta dele: são dois os
 * caminhos que chegam ao `play()` — o aviso de "arquivo carregado" e a sondagem
 * — e um portão que cobrisse só um deles não seria portão nenhum.
 */
function releasedNow(start: () => void): boolean {
  if (gestureDone) return true;
  // Só a fala mais recente fica na fila; a anterior já foi encerrada.
  pendingStart = start;
  return false;
}

/** Só existe para os testes: volta a exigir o primeiro toque da página. */
export function resetGestureGate() {
  gestureDone = Platform.OS !== 'web';
  pendingStart = null;
  armGesture();
}

/** De quanto em quanto tempo conferir se o arquivo ja carregou. */
const LOAD_POLL_MS = 60;

/** Depois disto, para de insistir: o arquivo nao vai carregar. */
const LOAD_GIVE_UP_MS = 3000;

/**
 * UM tocador para o aplicativo inteiro, reaproveitado a cada fala.
 *
 * Antes eu criava um tocador por fala e contava com `remove()` para calar o
 * anterior. Mesmo que ele pare o som — e ele para —, isso é uma corrida: entre
 * pedir a fala e o áudio começar existe um carregamento, e quem passa depressa
 * pelas telas remove um tocador que ainda nem tinha começado a tocar. O som
 * saía depois, sem ninguém para interrompê-lo, e as narrações se acumulavam.
 *
 * Com um tocador só, isso deixa de ser possível por construção: trocar a fonte
 * cancela o que estava tocando, porque é o mesmo tocador.
 */
let clipPlayer: AudioPlayer | null = null;
let audioModeReady = false;

/** A fala no ar. Começar outra encerra esta — nunca há duas. */
let currentClip: { finish: (state: SpeakState) => void } | null = null;

function loadClip(source: number): AudioPlayer {
  if (!clipPlayer) {
    // `keepAudioSessionActive` e o que faz a segunda fala sair no iPhone.
    //
    // Sem ele, todo `pause()` manda o expo desativar a sessao de audio do iOS —
    // e ele faz isso com 100 ms de atraso, conferindo antes se algum tocador
    // esta tocando (AudioModule.swift, `deactivateSession`). Quando uma fala
    // acaba e outra comeca em seguida, aos 100 ms a nova ainda esta carregando:
    // para o iOS ela nao esta "tocando", entao a sessao e desativada bem em
    // cima dela e o som nao sai. A primeira fala escapava porque nao havia
    // `pause()` antes dela — daí falhar justo a partir da segunda.
    //
    // A sessao usa `mixWithOthers`, entao mante-la ativa nao cala a musica de
    // outros aplicativos.
    clipPlayer = createAudioPlayer(source, { keepAudioSessionActive: true });
    return clipPlayer;
  }
  clipPlayer.pause();
  clipPlayer.replace(source);
  return clipPlayer;
}

/**
 * Toca assim que o arquivo estiver carregado — e nunca antes.
 *
 * No iOS, `play()` chama `AVPlayer.playImmediately(atRate:)`, que só toca se já
 * houver dados no buffer: com o item ainda carregando, ele não toca e não
 * reclama. O `replace()` do expo tem um conserto para isso, mas só quando o
 * tocador estava tocando na hora da troca (`wasPlaying`), e aqui ele nunca
 * está: `loadClip` pausa antes de trocar, de propósito.
 *
 * Daí a intermitência: arquivo pequeno costuma ficar pronto no mesmo quadro e
 * a fala sai; quando demora um pouco mais, some sem deixar rastro. Esperar o
 * aviso de carregado tira a sorte da jogada.
 */
function whenLoaded(player: AudioPlayer, start: () => void, alive: () => boolean) {
  let waited = 0;
  const tick = () => {
    if (!alive()) return;
    if (player.isLoaded || waited >= LOAD_GIVE_UP_MS) {
      start();
      return;
    }
    waited += LOAD_POLL_MS;
    setTimeout(tick, LOAD_POLL_MS);
  };
  tick();
}

function stopClip() {
  try {
    clipPlayer?.pause();
  } catch {
    // Tocador já descartado pela plataforma: não há o que parar.
  }
}

/**
 * Toca o áudio embarcado da palavra.
 *
 * `playsInSilentMode` é o que faz a palavra sair no iPhone com a chave de
 * silencioso ligada — quem tocou no alto-falante quer ouvir.
 */
function playClip(source: number, report: (state: SpeakState) => void): () => void {
  let done = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let subscription: { remove: () => void } | null = null;

  const finish = (state: SpeakState) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    subscription?.remove();
    if (currentClip?.finish === finish) currentClip = null;
    report(state);
  };

  if (!audioModeReady) {
    audioModeReady = true;
    // `mixWithOthers` explicito: como a sessao agora fica ativa, e ele que
    // garante que a musica de quem estiver ouvindo algo continue tocando.
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }

  // A fala anterior acaba aqui: some o cronômetro dela, some o ouvinte dela.
  currentClip?.finish('idle');
  currentClip = { finish };

  report('speaking');

  let started = false;
  const start = () => {
    if (done || started) return;
    if (!releasedNow(start)) return;
    started = true;
    try {
      player.play();
    } catch {
      finish('error');
    }
  };

  let player: AudioPlayer;
  try {
    player = loadClip(source);
    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        finish('idle');
        return;
      }
      if (status.isLoaded) start();
    });
  } catch {
    finish('error');
    return () => {};
  }

  whenLoaded(player, start, () => !done);

  // O cronômetro apaga o indicador, e nada mais. Ele NÃO encerra a fala: quem
  // encerra é o aviso da plataforma ou a limpeza da tela.
  //
  // Antes ele chamava `finish`, que devolve a posse da fala. Como toda narração
  // dura mais de quatro segundos, ela perdia a posse no meio — e a partir daí a
  // limpeza via `mine === false` e não calava mais nada. Pular o tour deixava a
  // voz tocando por cima do jogo.
  timer = setTimeout(() => {
    if (!done) report('idle');
  }, CLIP_TIMEOUT_MS);

  return () => {
    // Só cala o som se esta ainda for a fala no ar: quem passa de tela rápido
    // faz a limpeza da anterior rodar depois de a próxima já ter começado.
    const mine = currentClip?.finish === finish;
    finish('idle');
    if (mine) stopClip();
  };
}

/** Quantas falas estão no ar. Em zero não há nada para interromper. */
let inFlight = 0;

/**
 * Quantas falas já foram pedidas. Quem não é a última foi INTERROMPIDA por uma
 * nova, e interrupção não é erro: sem isto, tocar numa palavra e logo em outra
 * fazia a primeira acusar falha na tela.
 */
let generation = 0;

/**
 * Fala uma palavra em inglês e relata o andamento.
 *
 * Devolve uma função que descarta esta fala: o relato para, mesmo que o motor
 * de voz responda depois. Fora de React de propósito — é o que torna todo o
 * caminho testável sem montar tela nenhuma.
 */
export function speakEnglish(text: string, report: (state: SpeakState) => void): () => void {
  let dropped = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const mine = ++generation;
  /** Outra fala tomou o lugar desta. */
  const superseded = () => generation !== mine;

  // O caminho normal: o áudio embarcado, que soa igual em qualquer aparelho.
  const clip = CLIPS[text];
  if (clip !== undefined) return playClip(clip, report);

  const tell = (state: SpeakState) => {
    if (!dropped) report(state);
  };

  const discard = () => {
    dropped = true;
    timers.forEach(clearTimeout);
  };

  tell('speaking');

  void (async () => {
    // Interromper só faz sentido se há algo tocando. Chamar `stop()` à toa é o
    // caminho mais curto para o motor engolir justamente a fala nova.
    if (inFlight > 0) {
      await Promise.race([
        Speech.stop().catch(() => {}),
        new Promise((resolve) => {
          timers.push(setTimeout(resolve, STOP_WAIT_MS));
        }),
      ]);
      if (dropped) return;
    }

    const choice = await voiceWithin(VOICE_WAIT_MS);
    if (dropped) return;

    const options = speakOptions(choice);
    if (!options) {
      tell('noVoice');
      return;
    }

    inFlight++;
    let closed = false;
    const close = (state: SpeakState) => {
      if (closed) return;
      closed = true;
      inFlight = Math.max(0, inFlight - 1);
      tell(state);
    };

    try {
      Speech.speak(text, {
        ...options,
        onStart: () => tell('speaking'),
        onDone: () => close('idle'),
        onStopped: () => close('idle'),
        // Interromper uma fala para começar outra chega aqui como erro. Só é
        // erro de verdade se esta ainda for a fala mais recente.
        onError: () => close(superseded() ? 'idle' : 'error'),
      });
    } catch {
      close(superseded() ? 'idle' : 'error');
      return;
    }

    // Vários aparelhos falam sem nunca disparar `onDone`. Depois de um tempo
    // sem notícia o indicador se apaga sozinho — silenciosamente, porque não
    // saber se terminou não é motivo para acusar erro na cara do jogador.
    timers.push(
      setTimeout(() => {
        if (!closed) close('idle');
      }, QUIET_MS),
    );
  })();

  return discard;
}

/**
 * A voz que explica o jogo, no tour e na apresentação.
 *
 * Toca quando `id` muda e para quando ele muda de novo: narração do passo
 * anterior falando por cima do passo novo é o jeito mais rápido de confundir
 * quem está aprendendo. Sai pelo mesmo tocador da pronúncia, então tocar numa
 * palavra durante a explicação também cala a narração — que é o certo, porque
 * o jogador pediu para ouvir outra coisa.
 */
export function narrate(id: string, enabled: boolean): (() => void) | null {
  if (!enabled) return null;
  const clip = NARRATION[id];
  if (clip === undefined) return null;
  return playClip(clip, () => {});
}

export function useNarration(id: string | null, enabled: boolean) {
  useEffect(() => {
    if (!id) return;
    const stop = narrate(id, enabled);
    return stop ?? undefined;
  }, [id, enabled]);
}

/**
 * A pronúncia dentro de um componente.
 *
 * `enabled` é a chave de som das configurações: desligada, o toque vira um
 * aviso em vez de silêncio, senão o botão parece quebrado.
 */
export function useSpeaker(enabled: boolean) {
  const [state, setState] = useState<SpeakState>('idle');
  const discard = useRef<(() => void) | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Pede a lista de vozes já na montagem: quando o jogador tocar no
    // alto-falante, a resposta costuma estar pronta e a fala sai na hora.
    void englishVoice();
    return () => {
      discard.current?.();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      discard.current?.();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);

      const show = (next: SpeakState) => {
        setState(next);
        if (next === 'off' || next === 'error' || next === 'noVoice') {
          noticeTimer.current = setTimeout(() => setState('idle'), NOTICE_MS);
        }
      };

      if (!enabled) {
        discard.current = null;
        show('off');
        return;
      }

      discard.current = speakEnglish(text, show);
    },
    [enabled],
  );

  return { speak, state, speaking: state === 'speaking' };
}

/**
 * Onde se instala uma voz inglesa, em cada sistema. Só aparece na reserva: um
 * texto sem áudio embarcado, num aparelho sem voz inglesa.
 */
function whereToInstallVoice(): string {
  if (Platform.OS === 'ios') {
    return 'No iPhone: Ajustes, Acessibilidade, Conteúdo Falado, Vozes, English.';
  }
  if (Platform.OS === 'android') {
    return 'No Android: Configurações, Sistema, Idiomas, Saída de conversão de texto em voz, instalar o idioma inglês.';
  }
  return 'No Windows: Configurações, Hora e idioma, Voz, Gerenciar vozes, Adicionar vozes, English.';
}

/** A frase que explica por que não saiu som. `null` quando está tudo bem. */
export function speechNotice(state: SpeakState): string | null {
  if (state === 'off') return 'O som está desligado nas configurações.';
  if (state === 'error') return 'Não consegui falar esta palavra agora. Tente de novo.';
  if (state === 'noVoice') {
    return (
      'Este aparelho não tem voz em inglês instalada, e falar com a voz portuguesa ensinaria a pronúncia errada. ' +
      whereToInstallVoice()
    );
  }
  return null;
}
