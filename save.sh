#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MSG="$*"
if [[ -z "$MSG" ]]; then
  echo "❌ Commit message required (ex: ./save.sh \"Add CLF buttons\")"
  exit 1
fi

# Always rebuild: the loop is save → bump SHA in Knack → test, which
# only works when dist is fresh at the new SHA.
echo "📦 Building bundle..."
bash "$SCRIPT_DIR/build.sh"

git add -A
git commit -m "$MSG"
git push

SHA="$(git rev-parse HEAD)"
WARM_URL="https://cdn.jsdelivr.net/gh/mitzvetsia/scw-shield-knack-js@${SHA}/dist/shield-bundle.js"
PURGE_URL="https://purge.jsdelivr.net/gh/mitzvetsia/scw-shield-knack-js@${SHA}/dist/shield-bundle.js"

echo "🧹 Purging + pre-warming jsDelivr for ${SHA:0:7}..."
curl -fsSL --max-time 15 "$PURGE_URL" > /dev/null \
  && echo "   ✓ purge ok" || echo "   ⚠ purge failed (non-fatal)"
curl -fsSL --max-time 30 "$WARM_URL" > /dev/null \
  && echo "   ✓ warm ok" || echo "   ⚠ warm failed (non-fatal)"

echo "✅ Saved."
echo "CDN URL for the Knack <script src>:"
echo "  $WARM_URL"
