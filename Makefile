.PHONY: check clean start start-app start-services format lint-css lint-ts prod smoketest typecheck typecheck-analyze test test-fast test-integration update-incontext-locale update-snapshots test-integration-image

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
	POSTGRES_URL=postgres://postgres:password@$(shell docker compose port postgres 5432) \
	REDIS_URI=redis://$(shell docker compose port redis 6379) \
	HTTP_CACHE_REDIS_URI=redis://$(shell docker compose port redis 6379) \
	SMTP_URI=smtp://$(shell docker compose port mailcatcher 1025) \
	ENABLE_OPENTELEMETRY=true \
  node --watch --watch-preserve-output --env-file=.env src/index.ts

start:
	watchexec --restart --watch assets --watch locales --ignore assets/locales/ -- make start-app

prod: .env
	docker compose up --build

.dev/server.crt .dev/server.key: SHELL := /usr/bin/env bash
.dev/server.crt .dev/server.key: .env
	source .env && mkcert -install -cert-file .dev/server.crt -key-file .dev/server.key $$(echo $${PUBLIC_URL} | awk -F[/:] '{print $$4}')

start-services: .dev/server.crt .dev/server.key
	docker compose up --detach mailcatcher nginx opentelemetry postgres redis

format: node_modules
	npx prettier --ignore-unknown --check --cache --cache-location ".cache/prettier" src '**'

lint-ts: node_modules src/manifest.json
	npx eslint --cache --cache-location ".cache/eslint/" --max-warnings 0

lint-css: node_modules
	npx stylelint '**/*.css'

smoketest:
	docker build --tag prereview-smoketest --target prod .
	docker compose down
	docker compose up redis --wait
	scripts/smoke-test.sh prereview-smoketest
	docker compose down

typecheck: node_modules src/manifest.json
	npx tsc --incremental --noEmit --tsBuildInfoFile ".cache/tsc"

typecheck-analyze: node_modules src/manifest.json
	npx tsc --incremental false --noEmit --generateTrace ".cache/tsc-trace"
	npx analyze-trace .cache/tsc-trace ${TEST}

test: node_modules src/manifest.json
	npx jest ${TEST}

test-fast: node_modules src/manifest.json
	FAST_CHECK_NUM_RUNS=10 npx jest --onlyChanged --maxWorkers=50%

test-integration: test-integration-image
	docker compose up postgres --wait
	docker run --rm --env "POSTGRES_URL=postgres://postgres:password@host.docker.internal:5432" --add-host="host.docker.internal:host-gateway" --volume "$$(pwd)"/integration-results:/app/integration-results --volume "$$(pwd)"/visual-regression/snapshots:/app/visual-regression/snapshots ${INTEGRATION_TEST_IMAGE_TAG} ${TEST} ${ARGS}

update-snapshots: ARGS=--update-snapshots
update-snapshots: test-integration

test-integration-image:
	docker build --target test-integration --tag ${INTEGRATION_TEST_IMAGE_TAG} .
