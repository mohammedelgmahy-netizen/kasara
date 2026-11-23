#!/bin/sh
# Cloudflare Pages build: copies the site into dist/ and scrambles its code.
# Cloudflare settings: Build command `sh cloudflare-build.sh`, output folder `dist`.
# The files in this repository stay readable; only the published copy is scrambled.
set -e
OUT=dist
rm -rf "$OUT" && mkdir -p "$OUT"
for f in *; do
  case "$f" in
    "$OUT"|node_modules|server|tools|database|*.md|*.sql|*.txt|cloudflare-build.sh|protect.mjs|wrangler.toml|package.json|package-lock.json) continue ;;
  esac
  cp -R "$f" "$OUT/"
done
# Scramble the JavaScript in dist/ so visitors never get the readable source.
OBF_VERSION=4.1.1
if [ ! -d node_modules/javascript-obfuscator ]; then
  npm install --no-save --no-audit --no-fund --loglevel=error javascript-obfuscator@$OBF_VERSION
fi
node protect.mjs "$OUT"
