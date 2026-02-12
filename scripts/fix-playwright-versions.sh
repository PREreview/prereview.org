#!/usr/bin/env bash
set -e

version=$(pnpm list @playwright/test --json --lockfile-only | jq --raw-output '.[0].devDependencies."@playwright/test".version')

echo "Found @playwright/test $version"

echo "Updating Dockerfile"
sed --in-place --regexp-extended "s/mcr\.microsoft\.com\/playwright:v.+?-jammy/mcr.microsoft.com\/playwright:v$version-jammy/g" Dockerfile

echo "Updating CI"
sed --in-place --regexp-extended "s/mcr\.microsoft\.com\/playwright:v.+?-jammy/mcr.microsoft.com\/playwright:v$version-jammy/g" .github/workflows/ci.yml
