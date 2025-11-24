#!/usr/bin/env bash
set -euo pipefail

DOCKER_FILE="Dockerfile"
FLY_FILES=(fly.http-cache-sandbox.toml fly.http-cache.toml)

DOCKER_TAG=$(awk '/^FROM redis:/ {print $2}' "$DOCKER_FILE")
if [[ -z "$DOCKER_TAG" ]]; then
  echo "ERROR: Could not find Redis image tag in $DOCKER_FILE"
  exit 1
fi

echo "Found $DOCKER_TAG"

for FLY_FILE in "${FLY_FILES[@]}"; do
  echo "Updating $FLY_FILE"
  sed --in-place --regexp-extended "s/image = 'redis:.+?'/image = '$DOCKER_TAG'/" $FLY_FILE
done
