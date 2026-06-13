#!/bin/bash
set -e

TARGET=${1:-all}

pack() {
  local dir=$1
  local VERSION
  VERSION=$(node -e "const m = require('./${dir}/manifest.json'); console.log(m.version)")
  local OUTPUT
  OUTPUT="$(pwd)/dreaming-insights-${dir}-v${VERSION}.zip"

  rm -f "$OUTPUT"
  # cd into the dir so manifest.json lands at the zip root, not under firefox/ or chrome/
  (cd "$dir" && zip -r "$OUTPUT" . --exclude "*.git*" --exclude ".DS_Store")
  echo "Created $OUTPUT"
}

if [[ "$TARGET" == "chrome" || "$TARGET" == "all" ]]; then
  pack chrome
fi

if [[ "$TARGET" == "firefox" || "$TARGET" == "all" ]]; then
  pack firefox
fi
