#!/usr/bin/env bash
# Pull the latest first-visit question config from the Onboarding_tool repo.
# Run after the team regenerates docs/first-visit-survey-questions.json via
# scripts/build-fv-survey-config.py over there.
#
# Usage: npm run sync-questions
#        npm run sync-questions -- /custom/path/to/json
set -euo pipefail

SRC="${1:-/Users/Joshua/Documents/01_Projects/Onboarding_tool/docs/first-visit-survey-questions.json}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/data/first-visit-questions.json"

if [[ ! -f "$SRC" ]]; then
  echo "sync-questions: source not found at $SRC" >&2
  echo "Pass a custom path: npm run sync-questions -- /path/to/json" >&2
  exit 1
fi

cp "$SRC" "$DEST"
COUNT=$(node -e "const j=require('$DEST'); console.log(j.counts.questions, 'questions across', j.counts.phases, 'phases (version', j.version + ')');")
echo "sync-questions: $COUNT"
echo "                $SRC -> $DEST"
