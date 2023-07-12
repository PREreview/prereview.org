#!/usr/bin/env bash
set -e

version=$(npm list --depth=0 --json --package-lock-only | jq --raw-output '.dependencies."@playwright/test".version')

echo "Found @playwright/test $version"

echo "Updating all copies of playwright-core"
npm install playwright@"$version" playwright-core@"$version" --save-dev --save-exact --ignore-scripts
npm uninstall playwright playwright-core --save-dev
