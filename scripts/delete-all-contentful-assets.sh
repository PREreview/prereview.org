#!/usr/bin/env bash
set -euo pipefail

SPACE_ID="66hjlpng9xzg"
ENVIRONMENT_ID="master"
BASE_URL="https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}"

if [[ -z "${CONTENTFUL_MANAGEMENT_TOKEN:-}" ]]; then
  echo "CONTENTFUL_MANAGEMENT_TOKEN is not set" >&2
  exit 1
fi

ids=$(curl -sf "${BASE_URL}/assets?limit=1000" \
  -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}" \
  | jq -r '.items[].sys.id')

count=$(echo "$ids" | grep -c .) || true
echo "Deleting ${count} assets…"

echo "$ids" | while read -r id; do
  curl -sf -X DELETE "${BASE_URL}/assets/${id}/published" \
    -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}" || true
  curl -sf -X DELETE "${BASE_URL}/assets/${id}" \
    -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}"
  echo "Deleted ${id}"
done

echo "Done"
