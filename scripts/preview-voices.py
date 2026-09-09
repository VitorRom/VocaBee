# -*- coding: utf-8 -*-
"""
Gera a MESMA fala com várias vozes, para você ouvir e escolher.

Escreve em `.voice-preview/`. Cada arquivo tem o nome da voz e da velocidade,
então dá para ouvir em sequência e comparar sem confundir qual é qual.

COMO RODAR
----------
    .ttsenv/Scripts/python scripts/preview-voices.py

Opções:
    --texto "sua frase"    o que será falado (por padrão, a fala de abertura
                           do tour, que é o que você vai ouvir no jogo)
    --vozes a,b            só estas vozes
    --velocidades 1.0,1.1  ritmos a testar (maior = mais devagar)

DEPOIS DE ESCOLHER
------------------
Troque `MODEL_PT` em `scripts/generate-audio.py` e rode:

    .ttsenv/Scripts/python scripts/generate-audio.py --narration

LICENÇA
-------
Só entram aqui vozes que podem ser distribuídas dentro do aplicativo. As três
`pt_BR` do Open Home Foundation são CC0 (domínio público). A `edresson` é
CC BY 4.0 e exige atribuição; a `tugão` é português europeu, incluída só para
comparação de timbre.
"""
import argparse
import os
import subprocess
import sys
import wave

from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES_DIR = os.path.join(ROOT, '.voices')
OUT = os.path.join(ROOT, '.voice-preview')

VOICES = [
    ('pt_BR-faber-medium', 'CC0'),
    ('pt_BR-cadu-medium', 'CC0'),
    ('pt_BR-jeff-medium', 'CC0'),
    ('pt_BR-edresson-low', 'CC BY 4.0 (exige atribuição)'),
    ('pt_PT-tug\u00e3o-medium', 'português europeu, só para comparar timbre'),
]

DEFAULT_TEXT = (
    'Vamos jogar. Toda carta na mesa é uma palavra em inglês, e o seu trabalho '
    'é levar cada uma até a categoria a que ela pertence.'
)


def ensure(voice):
    """Baixa a voz se ela ainda não estiver aqui."""
    path = os.path.join(VOICES_DIR, voice + '.onnx')
    if os.path.exists(path):
        return path
    print('  baixando', voice, '...')
    done = subprocess.run(
        [sys.executable, '-m', 'piper.download_voices', voice, '--download-dir', VOICES_DIR],
        capture_output=True,
    )
    return path if done.returncode == 0 and os.path.exists(path) else None


def render(model, text, speed, name):
    raw = os.path.join(OUT, name + '.wav')
    mp3 = os.path.join(OUT, name + '.mp3')
    voice = PiperVoice.load(model)
    with wave.open(raw, 'wb') as handle:
        voice.synthesize_wav(text, handle, syn_config=SynthesisConfig(length_scale=speed))
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', raw,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '22050', '-b:a', '64k', mp3,
    ])
    os.remove(raw)
    return mp3


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--texto', default=DEFAULT_TEXT)
    parser.add_argument('--vozes', default='')
    parser.add_argument('--velocidades', default='1.0,1.15')
    args = parser.parse_args()

    wanted = [v.strip() for v in args.vozes.split(',') if v.strip()] or [v for v, _ in VOICES]
    speeds = [float(x) for x in args.velocidades.split(',')]

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(VOICES_DIR, exist_ok=True)

    print('texto: "%s"\n' % args.texto)
    made = []
    for voice in wanted:
        licence = dict(VOICES).get(voice, '?')
        model = ensure(voice)
        if not model:
            print('  %-24s indisponível' % voice)
            continue
        for speed in speeds:
            name = '%s-%s' % (voice, str(speed).replace('.', '_'))
            render(model, args.texto, speed, name)
            made.append(name)
        print('  %-24s %s' % (voice, licence))

    print('\n%d amostras em %s' % (len(made), OUT))
    print('Ouça na ordem e escolha; depois troque MODEL_PT em scripts/generate-audio.py.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
