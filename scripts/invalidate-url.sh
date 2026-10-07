#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <url>" >&2
  exit 1
fi

URL="$1"

if [[ ! "$URL" =~ ^https?://[^/[:space:]?#]+([/?#][^[:space:]]*)?$ ]]; then
  echo "Error: URL must be a valid URL" >&2
  exit 1
fi

MACHINES=($(flyctl --config fly.http-cache.toml machine list --quiet))

for MACHINE in "${MACHINES[@]}"; do
  echo "Invalidating on machine $MACHINE"
  flyctl --config fly.http-cache.toml ssh console \
    --machine "$MACHINE" \
    --command "redis-cli DEL \"$URL\""
done
