#!/usr/bin/env bash
set -euo pipefail

SPACE_ID="66hjlpng9xzg"
ENVIRONMENT_ID="master"
BASE_URL="https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}"

if [[ -z "${CONTENTFUL_MANAGEMENT_TOKEN:-}" ]]; then
  echo "CONTENTFUL_MANAGEMENT_TOKEN is not set" >&2
  exit 1
fi

# Fetches every id in a paginated collection (entries or assets).
fetch_all_ids() {
  local resource="$1"
  local skip=0
  local limit=1000
  local ids=""

  while true; do
    local page
    page=$(curl -sf "${BASE_URL}/${resource}?limit=${limit}&skip=${skip}" \
      -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}")

    local page_ids
    page_ids=$(echo "$page" | jq -r '.items[].sys.id')
    if [[ -n "$page_ids" ]]; then
      ids="${ids}${ids:+$'\n'}${page_ids}"
    fi

    local total
    total=$(echo "$page" | jq -r '.total')
    skip=$((skip + limit))
    if ((skip >= total)); then
      break
    fi
  done

  echo "$ids"
}

# Unpublishes (if published) and deletes every id for a resource type.
delete_all() {
  local resource="$1"
  local ids
  ids=$(fetch_all_ids "$resource")

  local count=0
  if [[ -n "$ids" ]]; then
    count=$(echo "$ids" | grep -c .)
  fi
  echo "Deleting ${count} ${resource}…"

  if [[ "$count" -eq 0 ]]; then
    return
  fi

  echo "$ids" | while read -r id; do
    curl -sf -X DELETE "${BASE_URL}/${resource}/${id}/published" \
      -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}" || true
    curl -sf -X DELETE "${BASE_URL}/${resource}/${id}" \
      -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}"
    echo "Deleted ${resource}/${id}"
  done
}

# Entries first (blog posts, hero images, authors, media, CTAs) so nothing
# is left pointing at assets, then the assets themselves.
delete_all "entries"
delete_all "assets"

echo "Done"
