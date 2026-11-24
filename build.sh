#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
mkdir -p dist

# Concatenate src/ into one bundle, then minify with esbuild if it is
# available. No transpilation beyond --target=es2015 — whitespace and
# comment removal plus local-identifier mangling only. Globals
# (window.SCW, Knack, $, jQuery) survive because they are reached via
# property paths esbuild leaves alone.
#
# ORDER MATTERS. config.js and util.js must come first; every feature
# depends on SCW.CONFIG and SCW.onViewRender.
TMP_BUNDLE="$(mktemp -t shield-bundle.XXXXXX.js)"
trap 'rm -f "$TMP_BUNDLE"' EXIT

cat \
  src/config.js \
  src/util.js \
  src/features/esig-contracts.js \
  src/features/page-polish.js \
  > "$TMP_BUNDLE"

UNMIN_BYTES=$(wc -c < "$TMP_BUNDLE" | tr -d ' ')

if command -v npx > /dev/null 2>&1; then
  npx --yes esbuild "$TMP_BUNDLE" \
    --minify \
    --target=es2015 \
    --legal-comments=none \
    --outfile=dist/shield-bundle.js \
    --log-level=warning
else
  echo "⚠ esbuild unavailable — shipping unminified."
  cp "$TMP_BUNDLE" dist/shield-bundle.js
fi

MIN_BYTES=$(wc -c < dist/shield-bundle.js | tr -d ' ')
RATIO=$(awk -v a="$MIN_BYTES" -v b="$UNMIN_BYTES" 'BEGIN { printf "%.1f", (a / b) * 100 }')
echo "✔ Built dist/shield-bundle.js  (${UNMIN_BYTES} → ${MIN_BYTES} bytes, ${RATIO}%)"
