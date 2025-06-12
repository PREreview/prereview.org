#!/bin/env bash
set -euo pipefail

DOCKER_FILE="Dockerfile"
FLY_FILES=(fly.http-cache-sandbox.toml fly.http-cache.toml)

MISMATCH=0

DOCKER_TAG=$(awk '/^FROM redis:/ {print $2}' "$DOCKER_FILE")
if [[ -z "$DOCKER_TAG" ]]; then
  echo "ERROR: Could not find Redis image tag in $DOCKER_FILE"
  MISMATCH=1
fi

for FLY_FILE in "${FLY_FILES[@]}"; do
  FLY_TAG=$(awk --field-separator="'" '/^image = / {print $2}' "$FLY_FILE")
  if [[ -z "$FLY_TAG" ]]; then
    echo "ERROR: Could not find Redis image tag in $FLY_FILE"
  fi

  if [[ "$DOCKER_TAG" != "$FLY_TAG" ]]; then
    echo "WARNING: redis image mismatch between $DOCKER_FILE ($DOCKER_TAG) and $FLY_FILE ($FLY_TAG)"
    MISMATCH=1
  fi
done

if [[ $MISMATCH != 0 ]]; then
  exit 1
fi
