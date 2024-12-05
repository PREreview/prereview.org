#!/usr/bin/env bash
set -e

version=$(npm list --depth=0 --json --package-lock-only | jq --raw-output '.dependencies."@playwright/test".version')

echo "Found @playwright/test $version"

echo "Updating all copies of playwright-core"
npm install playwright@"$version" playwright-core@"$version" --save-dev --save-exact --engine-strict --ignore-scripts
npm uninstall playwright playwright-core --save-dev

echo "Updating Dockerfile"
sed --in-place --regexp-extended "s/mcr\.microsoft\.com\/playwright:v.+?-jammy/mcr.microsoft.com\/playwright:v$version-jammy/g" Dockerfile

echo "Updating CI"
sed --in-place --regexp-extended "s/mcr\.microsoft\.com\/playwright:v.+?-jammy/mcr.microsoft.com\/playwright:v$version-jammy/g" .github/workflows/ci.yml
