#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <url> [url ...]" >&2
  exit 1
fi

URLS=("$@")

for URL in "${URLS[@]}"; do
  if [[ ! "$URL" =~ ^https?://[^/[:space:]?#]+([/?#][^[:space:]]*)?$ ]]; then
    echo "Error: Invalid URL: $URL" >&2
    exit 1
  fi
done

MACHINES=($(flyctl --config fly.http-cache.toml machine list --quiet))

for MACHINE in "${MACHINES[@]}"; do
  echo "Invalidating ${#URLS[@]} URL$([[ ${#URLS[@]} -gt 1 ]] && printf 's' || true) on machine $MACHINE"
  flyctl --config fly.http-cache.toml ssh console \
    --machine "$MACHINE" \
    --command "redis-cli DEL $(printf '%q ' "${URLS[@]}")"
done
