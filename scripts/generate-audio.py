# -*- coding: utf-8 -*-
"""
Gera o áudio embarcado do jogo: a pronúncia das palavras e a narração do tour.

POR QUE EXISTE
--------------
A voz do sistema (expo-speech) só fala inglês se o aparelho tiver o pacote de
voz inglês instalado — e num celular ou PC em português isso não é garantido.
Onde falta, o resultado é silêncio ou, pior, a palavra lida com pronúncia
portuguesa. Com o áudio embarcado, a pronúncia é a mesma em qualquer aparelho e
funciona sem internet.

VOZES E LICENÇA
---------------
- Palavras (inglês): Piper `en_US-ljspeech-high`, treinada no LJ Speech
  Dataset, que é de DOMÍNIO PÚBLICO.
- Narração (português): Piper `pt_BR-faber-medium`, publicada como CC0.

Cuidado ao trocar de voz: várias vozes do Piper de qualidade parecida (a
`lessac` e a `ryan`, por exemplo) vêm de conjuntos cuja licença é apenas para
pesquisa e proíbe uso comercial e redistribuição.

GRAVAR COM A SUA PRÓPRIA VOZ
----------------------------
Voz sintética não chega perto de uma gravação humana. Para usar a sua:

1.  `.ttsenv/Scripts/python scripts/generate-audio.py --roteiro`
    imprime o que dizer em cada trecho, com o nome do arquivo.
2.  Grave cada trecho e salve em `narration/<id>.wav` (ou .mp3, .m4a, .flac).
    Grave num lugar silencioso; o volume é normalizado depois, então não
    precisa se preocupar em acertar o nível.
3.  `.ttsenv/Scripts/python scripts/generate-audio.py --narration`

Todo id que tiver gravação sua entra no lugar da voz sintética. Dá para gravar
só alguns: os que faltarem continuam sintetizados.

COMO RODAR
----------
    python -m venv .ttsenv
    .ttsenv/Scripts/python -m pip install piper-tts
    .ttsenv/Scripts/python -m piper.download_voices en_US-ljspeech-high pt_BR-faber-medium --download-dir .voices
    .ttsenv/Scripts/python scripts/generate-audio.py

Precisa de `ffmpeg` no PATH. Escreve em `assets/audio/` e reescreve
`src/audio/clips.ts`.
"""
import os
import re
import subprocess
import sys
import wave

from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.environ.get('PIPER_VOICES', os.path.join(ROOT, '.voices'))
MODEL_EN = os.path.join(VOICES, 'en_US-ljspeech-high.onnx')
MODEL_PT = os.path.join(VOICES, 'pt_BR-jeff-medium.onnx')
AUDIO = os.path.join(ROOT, 'assets', 'audio')
RECORDED = os.path.join(ROOT, 'narration')
RECORDED_EXT = ('.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac')
CLIPS = os.path.join(ROOT, 'src', 'audio', 'clips.ts')
TEMP = os.path.join(ROOT, '.audio-tmp')


def check_model(path, what):
    assert path.endswith('.onnx'), 'o caminho da voz de %s precisa terminar em .onnx: %s' % (what, path)
    assert os.path.exists(path), (
        'nao achei a voz de %s em %s. '
        'Baixe com: .ttsenv/Scripts/python -m piper.download_voices <voz> --download-dir .voices'
        % (what, path)
    )
    return path


def slug(text):
    """Nome de arquivo seguro. `Food & Drink` vira `food-drink`."""
    out = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    assert out, text
    return out


def narration():
    """As falas do tour e da apresentação, na ordem em que aparecem."""
    source = open(os.path.join(ROOT, 'src', 'data', 'tour.ts'), encoding='utf-8').read()
    lines = re.findall(r"id: '([^']+)',\n\s+title: '[^']*',\n\s+text: '[^']*',\n\s+say: '([^']+)',", source)
    assert lines, 'não achei o roteiro em tour.ts'
    ids = [i for i, _ in lines]
    assert len(ids) == len(set(ids)), 'dois trechos de narração com o mesmo id'
    return lines


def catalogue():
    """Tudo que o jogo fala em inglês: as palavras e os nomes das categorias."""
    source = open(os.path.join(ROOT, 'src', 'data', 'words.ts'), encoding='utf-8').read()
    words = re.findall(r"\{ w: '([^']+)'", source)
    categories = re.findall(r"^    en: '([^']+)',$", source, re.M)
    assert words and categories, 'não achei o catálogo em words.ts'

    spoken = words + categories
    duplicates = {t for t in spoken if spoken.count(t) > 1}
    assert not duplicates, 'texto repetido: %s' % duplicates

    slugs = [slug(t) for t in spoken]
    assert len(slugs) == len(set(slugs)), 'dois textos com o mesmo nome de arquivo'
    return words, categories


def recording_for(line_id):
    """A gravação humana deste trecho, se houver uma.

    A comparação ignora maiúsculas no nome e na extensão: gravador de celular
    costuma salvar como `.WAV`, e no Linux isso não bateria com `.wav`.
    """
    if not os.path.isdir(RECORDED):
        return None
    for name in sorted(os.listdir(RECORDED)):
        stem, ext = os.path.splitext(name)
        if stem.lower() == line_id.lower() and ext.lower() in RECORDED_EXT:
            return os.path.join(RECORDED, name)
    return None


def convert(source, name):
    """Passa uma gravação pronta pelo mesmo tratamento do áudio sintetizado."""
    mp3 = os.path.join(AUDIO, name + '.mp3')
    return subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', source,
        # Corta o silêncio das pontas antes de repor 80 ms: numa gravação
        # caseira sobram sempre alguns segundos de sala vazia no começo.
        '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,'
               'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,'
               'adelay=80|80,apad=pad_dur=0.08,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ac', '1', '-ar', '22050', '-b:a', '48k', mp3,
    ]).returncode == 0


def synthesize(voice, config, text, name):
    raw = os.path.join(TEMP, name + '.wav')
    mp3 = os.path.join(AUDIO, name + '.mp3')
    with wave.open(raw, 'wb') as handle:
        voice.synthesize_wav(text, handle, syn_config=config)

    # 80 ms de silêncio nas pontas para a palavra não começar cortada, volume
    # normalizado para todas soarem no mesmo nível, mono e 32 kbps porque são
    # menos de dois segundos de fala.
    done = subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', raw,
        '-af', 'adelay=80|80,apad=pad_dur=0.08,loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ac', '1', '-ar', '22050', '-b:a', '32k', mp3,
    ]).returncode == 0
    os.remove(raw)
    return done


def write_clips(entries, spoken):
    """Os mapas que o app importa: texto falado -> arquivo embarcado."""
    lines = [
        '/**',
        ' * Áudio embarcado — GERADO por `scripts/generate-audio.py`.',
        ' * Não edite à mão.',
        ' *',
        ' * `CLIPS` é a pronúncia das palavras: a chave é exatamente o texto que se',
        ' * fala. Ter o áudio no aplicativo é o que garante a mesma pronúncia inglesa',
        ' * em qualquer aparelho, mesmo sem voz inglesa instalada e sem internet.',
        ' *',
        ' * `NARRATION` é a voz que explica o jogo, em português, com a chave sendo o',
        ' * id da fala em `src/data/tour.ts`.',
        ' */',
        '',
        'declare const require: (path: string) => number;',
        '',
        'export const CLIPS: Record<string, number> = {',
    ]
    for text, name in entries:
        key = "'%s'" % text if not re.match(r'^[A-Za-z_$][\w$]*$', text) else text
        lines.append("  %s: require('../../assets/audio/%s.mp3')," % (key, name))
    lines.append('};')
    lines.append('')
    lines.append('export const NARRATION: Record<string, number> = {')
    for line_id in spoken:
        key = "'%s'" % line_id if not re.match(r'^[A-Za-z_$][\w$]*$', line_id) else line_id
        lines.append("  %s: require('../../assets/audio/narracao-%s.mp3')," % (key, line_id))
    lines.append('};')
    lines.append('')
    open(CLIPS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))


def main():
    # `--narration` refaz só a voz que explica o jogo: são nove arquivos contra
    # duzentos e vinte, e é o que se ajusta várias vezes ao escrever o roteiro.
    only_narration = '--narration' in sys.argv

    words, categories = catalogue()
    spoken = narration()

    # `--roteiro` imprime o que gravar, com o nome de arquivo de cada trecho.
    if '--roteiro' in sys.argv:
        print('Grave cada trecho e salve em narration/<arquivo>.\n')
        for line_id, text in spoken:
            print('%s.wav' % line_id)
            print('   "%s"\n' % text)
        print('Depois: .ttsenv/Scripts/python scripts/generate-audio.py --narration')
        return 0
    os.makedirs(AUDIO, exist_ok=True)
    os.makedirs(TEMP, exist_ok=True)

    failures = []

    # --------------------------------------------------- palavras, em inglês
    voice = None if only_narration else PiperVoice.load(check_model(MODEL_EN, 'palavras'))
    config = SynthesisConfig(length_scale=1.15)  # um pouco mais devagar: é para aprender

    entries = []
    for i, text in enumerate(words + categories, 1):
        name = slug(text)
        entries.append((text, name))
        if only_narration:
            continue
        if not synthesize(voice, config, text, name):
            failures.append(text)
        if i % 40 == 0:
            print('  ...', i)

    # ------------------------------------------------- narração, em português
    # Gravação humana ganha da voz sintética sempre que existir.
    narrator = None
    speech = SynthesisConfig(length_scale=1.0)  # fala corrida, não palavra solta
    recorded = 0
    for line_id, text in spoken:
        name = 'narracao-' + line_id
        own = recording_for(line_id)
        if own:
            recorded += 1
            if not convert(own, name):
                failures.append(line_id)
            continue
        if narrator is None:
            narrator = PiperVoice.load(check_model(MODEL_PT, 'narração'))
        if not synthesize(narrator, speech, text, name):
            failures.append(line_id)

    os.rmdir(TEMP)
    write_clips(entries, [i for i, _ in spoken])

    if failures:
        print('FALHARAM:', failures)
        return 1

    total = sum(os.path.getsize(os.path.join(AUDIO, f)) for f in os.listdir(AUDIO))
    voz = ('%d gravados por você, %d sintetizados' % (recorded, len(spoken) - recorded)
           if recorded else 'sintetizados')
    print('%d áudios: %d palavras, %d categorias e %d trechos de narração (%s). %.0f KB no total'
          % (len(entries) + len(spoken), len(words), len(categories), len(spoken), voz, total / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
