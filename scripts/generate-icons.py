# -*- coding: utf-8 -*-
"""
Desenha os ícones do aplicativo a partir da mascote — a Bia, abelha do VocaBee.

É o mesmo desenho de `src/ui/Logo.tsx`, nas mesmas proporções (uma grade de
40 por 40), só que rasterizado. Mantendo os dois lados aqui, o ícone da loja e
o verso da carta nunca ficam sendo duas abelhas diferentes.

COMO RODAR
----------
    .ttsenv/Scripts/python -m pip install pillow
    .ttsenv/Scripts/python scripts/generate-icons.py

Reescreve os PNG de `assets/`. Cada arquivo mantém o tamanho que já tinha,
porque são os tamanhos que o Expo e as lojas esperam.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

GREEN = (30, 140, 95, 255)        # theme.colors.green500
DARK_GREEN = (14, 42, 34, 255)    # o fundo escuro do app
GOLD = (229, 166, 44, 255)
STRIPE = (12, 69, 48, 255)    # theme.colors.green800
WHITE = (255, 255, 255, 255)

# Desenhamos grande e reduzimos: é o antisserrilhado do pobre, e funciona.
SUPER = 4


def bee(size, body=GOLD, stripe=STRIPE, wing=WHITE, detail=True):
    """A Bia sozinha, em um quadrado transparente de `size`.

    Mesma geometria de `src/ui/Logo.tsx`, na mesma grade de 40. O SVG gira com
    `rotate(a)` no sentido horário; o Pillow gira no anti-horário, por isso os
    ângulos entram com o sinal trocado.
    """
    s = size * SUPER
    u = s / 40.0
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))

    def box(cx, cy, rx, ry):
        return [(cx - rx) * u, (cy - ry) * u, (cx + rx) * u, (cy + ry) * u]

    def turned(paint, angle, cx, cy, alpha=1.0):
        layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        paint(ImageDraw.Draw(layer))
        layer = layer.rotate(-angle, center=(cx * u, cy * u), resample=Image.BICUBIC)
        if alpha < 1:
            layer.putalpha(layer.getchannel('A').point(lambda a: int(a * alpha)))
        return layer

    # ---------------------------------------------------------------- asas
    img = Image.alpha_composite(img, turned(
        lambda d: d.ellipse(box(18.4, 12.2, 8.2, 4.4), fill=wing), -34, 18.4, 12.2, 0.95))
    if detail:
        img = Image.alpha_composite(img, turned(
            lambda d: d.ellipse(box(27.2, 14.6, 6.4, 3.6), fill=wing), -12, 27.2, 14.6, 0.7))

    # ------------------------------------------------------ cabeça e antenas
    d = ImageDraw.Draw(img)
    d.ellipse(box(12.2, 26.2, 5.6, 5.6), fill=stripe)
    if detail:
        w = max(1, int(1.7 * u))
        d.line([10.4 * u, 21.6 * u, 8.2 * u, 16.4 * u], fill=stripe, width=w)
        d.line([14.2 * u, 20.2 * u, 14.4 * u, 14.8 * u], fill=stripe, width=w)
        d.ellipse(box(7.9, 15.2, 1.5, 1.5), fill=stripe)
        d.ellipse(box(14.5, 13.6, 1.5, 1.5), fill=stripe)

    # --------------------------------------------- corpo listrado, inclinado
    torso = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(torso).ellipse(box(23, 25.6, 11.4, 8.6), fill=body)

    bars = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bars)
    bd.rectangle([17.6 * u, 12 * u, 22.2 * u, 40 * u], fill=stripe)
    bd.rectangle([26 * u, 12 * u, 30.6 * u, 40 * u], fill=stripe)

    inside = Image.new('L', (s, s), 0)
    ImageDraw.Draw(inside).ellipse(box(23, 25.6, 11.4, 8.6), fill=255)
    torso.paste(bars, (0, 0), Image.composite(bars.getchannel('A'), Image.new('L', (s, s), 0), inside))

    img = Image.alpha_composite(img, torso.rotate(18, center=(23 * u, 25.6 * u), resample=Image.BICUBIC))

    return img.resize((size, size), Image.LANCZOS)


def rounded(size, radius, color):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=color)
    return img


def badge(size, background, scale=0.74, radius_ratio=0.29, detail=True):
    """A abelha dentro do quadrado arredondado, como o `LogoBadge`."""
    img = rounded(size, int(size * radius_ratio), background)
    mark = bee(int(size * scale), detail=detail)
    off = (size - mark.width) // 2
    img.alpha_composite(mark, (off, off))
    return img


def save(img, name, mode='RGBA'):
    path = os.path.join(ASSETS, name)
    out = img.convert(mode) if img.mode != mode else img
    out.save(path)
    print('  %-32s %s' % (name, img.size))


def main():
    if not os.path.isdir(ASSETS):
        print('não achei assets/')
        return 1

    print('desenhando os ícones:')

    # Ícone da loja: quadrado cheio, sem canto arredondado (o sistema recorta).
    icon = Image.new('RGBA', (1024, 1024), GREEN)
    mark = bee(int(1024 * 0.68))
    icon.alpha_composite(mark, ((1024 - mark.width) // 2, (1024 - mark.height) // 2))
    save(icon, 'icon.png', 'RGB')

    # Splash: a mesma marca sobre o verde escuro do app.
    splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    mark = bee(int(1024 * 0.5))
    splash.alpha_composite(mark, ((1024 - mark.width) // 2, (1024 - mark.height) // 2))
    save(splash, 'splash-icon.png')

    # Android adaptativo: a marca vive na zona segura, que é 66% do quadro.
    fg = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    mark = bee(int(512 * 0.45))
    fg.alpha_composite(mark, ((512 - mark.width) // 2, (512 - mark.height) // 2))
    save(fg, 'android-icon-foreground.png')
    save(Image.new('RGBA', (512, 512), GREEN), 'android-icon-background.png')

    # Monocromático (ícone temático do Android 13+): só a silhueta.
    mono = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    mark = bee(int(432 * 0.45), body=WHITE, stripe=WHITE, wing=WHITE, detail=False)
    mono.alpha_composite(mark, ((432 - mark.width) // 2, (432 - mark.height) // 2))
    save(mono, 'android-icon-monochrome.png')

    # Favicon: pequeno demais para antenas e olhos.
    save(badge(48, GREEN, scale=0.8, radius_ratio=0.22, detail=False), 'favicon.png')

    print('\nfundo do app (app.json backgroundColor): #%02X%02X%02X' % DARK_GREEN[:3])
    return 0


if __name__ == '__main__':
    sys.exit(main())
