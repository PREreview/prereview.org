#!/usr/bin/env bash

set -euo pipefail

python3 - "$1" << 'EOF'
import csv
import json
import sys

with open(sys.argv[1], newline='') as f:
    for row in csv.DictReader(f):
        payload = json.loads(row['payload'])
        payload['type'] = row['type']
        print(json.dumps(payload, separators=(',', ':')))
EOF
