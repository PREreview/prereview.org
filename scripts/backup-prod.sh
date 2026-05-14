#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK_DIR=$(mktemp -d)

trap 'rm -rf "$WORK_DIR"' EXIT

# REDIS BACKUP
REDIS_PASSWORD=$(fly redis status "prereview" 2> /dev/null | awk -F'[/:@]' '/Private URL/{print $5}')

for key in $(redis-cli -p 16379 -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern '*'); do
  type=$(redis-cli -p 16379 -a "$REDIS_PASSWORD" --no-auth-warning TYPE "$key")
  if [ "$type" = "string" ]; then
    redis-cli -p 16379 -a "$REDIS_PASSWORD" --no-auth-warning GET "$key" | jq -c --arg k "$key" '{key: $k} + .'
  elif [ "$type" = "set" ]; then
    redis-cli -p 16379 -a "$REDIS_PASSWORD" --no-auth-warning SMEMBERS "$key" | jq -R . | jq --arg k "$key" -sc '{set: .} + {key: $k}'
  else
    echo "can't backup: $key (type: $type)" >&2
  fi
done > "$WORK_DIR/redis.jsonl"

# EVENTS BACKUP
echo 'COPY (SELECT * FROM events ORDER BY position) TO STDOUT WITH (FORMAT CSV, HEADER);' \
  | fly mpg connect nvwq9oz78qe03kl1 -u readonly -d "prereview-prod" \
    > "$WORK_DIR/events.csv"

# SENSITIVE DATA BACKUP
echo 'COPY (SELECT * FROM sensitive_data) TO STDOUT WITH (FORMAT CSV, HEADER);' \
  | fly mpg connect nvwq9oz78qe03kl1 -u readonly -d "prereview-prod" \
    > "$WORK_DIR/sensitive_data.csv"

# CREATE TARBALL
tar -czf "$WORK_DIR/dump.tar.gz" -C "$WORK_DIR" events.csv sensitive_data.csv redis.jsonl

# ENCRYPT AND SAVE
mkdir -p ./backup
age \
  -R <(curl -s 'https://github.com/erkannt.keys') \
  -R <(curl -s 'https://github.com/thewilkybarkid.keys') \
  -o "backup/prereview-prod-backup-${TIMESTAMP}.tar.gz.age" \
  "$WORK_DIR/dump.tar.gz"
