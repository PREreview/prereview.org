.PHONY: check start start-app start-services format lint-css lint-ts typecheck test test-fast test-integration update-snapshots test-integration-image

INTEGRATION_TEST_IMAGE_TAG=prereview.org-integration-tests

.env:
	cp .env.dist .env

node_modules: package.json package-lock.json
	npm install --ignore-scripts
	touch node_modules

check: format lint-ts lint-css typecheck test-fast

src/locales: $(shell find locales -type f)
	echo 'building locales'
	scripts/intlc.sh
	touch src/locales

src/manifest.json: src/locales $(shell find assets -type f | grep -v assets/locales)
	npx webpack build --mode development
	touch src/manifest.json

start-app: .env node_modules start-services src/manifest.json
	REDIS_URI=redis://$(shell docker compose port redis 6379) \
	SMTP_URI=smtp://$(shell docker compose port mailcatcher 1025) \
  npx tsx watch --clear-screen=false --include=src/manifest.json --require dotenv/config src/index.ts

start:
	watchexec --restart --watch assets --watch locales --ignore assets/locales/ -- make start-app

.dev/server.crt .dev/server.key: SHELL := /usr/bin/env bash
.dev/server.crt .dev/server.key: .env
	source .env && mkcert -install -cert-file .dev/server.crt -key-file .dev/server.key $$(echo $${PUBLIC_URL} | awk -F[/:] '{print $$4}')

start-services: .dev/server.crt .dev/server.key
	docker compose up --detach

format: node_modules
	npx prettier --ignore-unknown --check --cache --cache-location ".cache/prettier" src '**'

lint-ts: node_modules
	npx eslint . --cache --cache-location ".cache/eslint/" --max-warnings 0

lint-css: node_modules
	npx stylelint '**/*.css'

typecheck: node_modules
	npx tsc --incremental --noEmit --tsBuildInfoFile ".cache/tsc"

test: node_modules
	npx jest ${TEST}

test-fast: node_modules
	FAST_CHECK_NUM_RUNS=10 npx jest --onlyChanged

test-integration: test-integration-image
	docker run --rm --volume "$$(pwd)"/integration/snapshots:/app/integration/snapshots --volume "$$(pwd)"/integration-results:/app/integration-results --volume "$$(pwd)"/visual-regression/snapshots:/app/visual-regression/snapshots ${INTEGRATION_TEST_IMAGE_TAG} ${TEST} ${ARGS}

update-snapshots: ARGS=--update-snapshots
update-snapshots: test-integration

test-integration-image:
	docker build --target test-integration --tag ${INTEGRATION_TEST_IMAGE_TAG} .
