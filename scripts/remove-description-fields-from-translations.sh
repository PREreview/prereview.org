#!/usr/bin/env bash
set -euo pipefail

files=$(find locales -type f | grep -v en-US)

for file in $files; do
  cat <<< "$(jq '(.. | select(type == "object" and has("message"))) |= del(.description)' $file)" > $file
done
