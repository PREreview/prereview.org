.PHONY: check clean start start-app start-services format lint-css lint-ts typecheck typecheck-analyze test test-fast test-integration update-incontext-locale update-snapshots test-integration-image

INTEGRATION_TEST_IMAGE_TAG=prereview.org-integration-tests

.env:
	cp .env.dist .env

clean:
	rm -rf .cache dist integration-results node_modules assets/locales src/locales src/manifest.json .dev/server.crt .dev/server.key

node_modules: package.json package-lock.json
	npm install --engine-strict --ignore-scripts
	touch node_modules

check: format lint-ts lint-css typecheck test-fast

update-incontext-locale:
	source .env && crowdin download --language=lol --token=$${CROWDIN_PERSONAL_TOKEN}

src/locales: $(shell find locales -type f)
	echo 'building locales'
	scripts/intlc.sh
	touch src/locales

src/manifest.json: node_modules src/locales $(shell find assets -type f | grep -v assets/locales)
	npx webpack build --mode development
	touch src/manifest.json

start-app: .env node_modules start-services src/manifest.json
	REDIS_URI=redis://$(shell docker compose port redis 6379) \
	HTTP_CACHE_REDIS_URI=redis://$(shell docker compose port redis 6379) \
	SMTP_URI=smtp://$(shell docker compose port mailcatcher 1025) \
  npx tsx watch --clear-screen=false --include=src/manifest.json --require dotenv/config src/index.ts

start:
	watchexec --restart --watch assets --watch locales --watch .env --ignore assets/locales/ -- make start-app

.dev/server.crt .dev/server.key: SHELL := /usr/bin/env bash
.dev/server.crt .dev/server.key: .env
	source .env && mkcert -install -cert-file .dev/server.crt -key-file .dev/server.key $$(echo $${PUBLIC_URL} | awk -F[/:] '{print $$4}')

start-services: .dev/server.crt .dev/server.key
	docker compose up --detach

format: node_modules
	npx prettier --ignore-unknown --check --cache --cache-location ".cache/prettier" src '**'

lint-ts: node_modules src/manifest.json
	npx eslint --cache --cache-location ".cache/eslint/" --max-warnings 0

lint-css: node_modules
	npx stylelint '**/*.css'

typecheck: node_modules src/manifest.json
	npx tsc --incremental --noEmit --tsBuildInfoFile ".cache/tsc"

typecheck-analyze: node_modules src/manifest.json
	npx tsc --incremental false --noEmit --generateTrace ".cache/tsc-trace"
	npx analyze-trace .cache/tsc-trace ${TEST}

test: node_modules src/manifest.json
	npx jest ${TEST}

test-fast: node_modules src/manifest.json
	FAST_CHECK_NUM_RUNS=10 npx jest --onlyChanged

test-integration: test-integration-image
	docker run --rm --volume "$$(pwd)"/integration-results:/app/integration-results --volume "$$(pwd)"/visual-regression/snapshots:/app/visual-regression/snapshots ${INTEGRATION_TEST_IMAGE_TAG} ${TEST} ${ARGS}

update-snapshots: ARGS=--update-snapshots
update-snapshots: test-integration

test-integration-image:
	docker build --target test-integration --tag ${INTEGRATION_TEST_IMAGE_TAG} .
