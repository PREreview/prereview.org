#!/usr/bin/env bash
set -euo pipefail

SPACE_ID="66hjlpng9xzg"
ENVIRONMENT_ID="master"
BASE_URL="https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}"

if [[ -z "${CONTENTFUL_MANAGEMENT_TOKEN:-}" ]]; then
  echo "CONTENTFUL_MANAGEMENT_TOKEN is not set" >&2
  exit 1
fi

# Calls the Management API and prints the response body. Fails, printing the
# status and body to stderr, unless the status is 2xx or one of the extra
# allowed statuses.
api() {
  local method="$1"
  local path="$2"
  shift 2

  local response
  if ! response=$(curl -s -w '\n%{http_code}' -X "$method" "${BASE_URL}${path}" \
    -H "Authorization: Bearer ${CONTENTFUL_MANAGEMENT_TOKEN}"); then
    echo "${method} ${path} failed: could not reach Contentful" >&2
    return 1
  fi

  local status="${response##*$'\n'}"
  local body="${response%$'\n'*}"

  if [[ "$status" != 2?? && " $* " != *" ${status} "* ]]; then
    echo "${method} ${path} failed with status ${status}:" >&2
    echo "$body" >&2
    return 1
  fi

  echo "$body"
}

# Fetches every id in a paginated collection (entries or assets).
fetch_all_ids() {
  local resource="$1"
  local skip=0
  local limit=1000
  local ids=""

  while true; do
    local page
    # Command substitution doesn't inherit `set -e`, so exit explicitly.
    page=$(api GET "/${resource}?limit=${limit}&skip=${skip}") || exit 1

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
    # 400 means it wasn't published.
    api DELETE "/${resource}/${id}/published" 400 >/dev/null
    api DELETE "/${resource}/${id}" >/dev/null
    echo "Deleted ${resource}/${id}"
  done
}

# Entries first (blog posts, hero images, authors, media, CTAs) so nothing
# is left pointing at assets, then the assets themselves.
delete_all "entries"
delete_all "assets"

echo "Done"
