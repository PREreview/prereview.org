#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.tar.gz.age> [ssh-key]" >&2
  exit 1
fi

BACKUP="$1"
SSH_KEY="${2:-$HOME/.ssh/id_rsa}"

cd "$(dirname "$0")/.."

age --decrypt -i "$SSH_KEY" "$BACKUP" | tar -xzOf - events.csv | tail -n +2 >data/events-dump.csv

rm -f data/events.db

sqlite3 data/events.db <<'EOF'
CREATE TABLE events (
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payload TEXT NOT NULL,
  position INTEGER PRIMARY KEY AUTOINCREMENT
);
.mode csv
.import --skip 1 data/events-dump.csv events
EOF
