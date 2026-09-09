#!/bin/sh
# Republica o VocaBee no GitHub Pages.
#
#   sh scripts/publish-web.sh
#
# Reconstrói a versão web e envia para o repositório VocaBee_Gh_Pages. Rode
# sempre que mudar o jogo; o Pages leva cerca de um minuto para trocar.
set -e

REPO="$HOME/Downloads/VocaBee_Gh_Pages"
ORIGIN="https://github.com/VitorRom/VocaBee_Gh_Pages.git"

echo "==> construindo a versão web"
rm -rf dist
npx expo export --platform web --output-dir dist

# O Jekyll do GitHub Pages descarta pastas que começam com "_", e é justamente
# onde o Expo põe o bundle. Sem este arquivo a página abre em branco.
touch dist/.nojekyll

if [ ! -d "$REPO/.git" ]; then
  echo "==> criando $REPO"
  mkdir -p "$REPO"
  git -C "$REPO" init -q
  git -C "$REPO" config core.longpaths true
  git -C "$REPO" remote add origin "$ORIGIN"
fi

echo "==> copiando o site"
# Apaga o conteúdo antigo, menos o .git: um arquivo removido do build não pode
# continuar publicado.
find "$REPO" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r dist/. "$REPO/"

echo "==> enviando"
git -C "$REPO" add -A
if git -C "$REPO" diff --cached --quiet; then
  echo "nada mudou desde a última publicação."
  exit 0
fi
git -C "$REPO" commit -q -m "Atualiza o VocaBee ($(date '+%d/%m/%Y %H:%M'))"
git -C "$REPO" branch -M main
git -C "$REPO" push -u origin main

echo
echo "pronto: https://vitorrom.github.io/VocaBee_Gh_Pages/"
