INTEGRATION_TEST_IMAGE_TAG=prereview.org-integration-tests

.env:
	cp .env.dist .env

.PHONY: clean
clean:
	rm -rf .cache dist integration-results node_modules assets/locales src/locales src/manifest.json .dev/server.crt .dev/server.key

node_modules: package.json pnpm-lock.yaml pnpm-workspace.yaml
	pnpm install --frozen-lockfile
	touch node_modules

.PHONY: check
check: format lint-ts lint-css typecheck test-fast

.PHONY: update-incontext-locale
update-incontext-locale:
	source .env && crowdin download --language=lol --token=$${CROWDIN_PERSONAL_TOKEN}

src/locales: node_modules $(shell find locales -type f)
	echo 'building locales'
	node scripts/intlc.ts
	touch src/locales

src/manifest.json: node_modules src/locales $(shell find assets -type f | grep -v assets/locales)
	npx vite build --mode development
	touch src/manifest.json

.PHONY: start-app
start-app: .env node_modules start-services src/manifest.json
	POSTGRES_URL=postgres://postgres:password@$(shell docker compose port postgres 5432) \
	REDIS_URI=redis://$(shell docker compose port redis 6379) \
	HTTP_CACHE_REDIS_URI=redis://$(shell docker compose port redis 6379) \
	SMTP_URI=smtp://$(shell docker compose port mailpit 1025) \
	ENABLE_OPENTELEMETRY=true \
  node --watch --watch-preserve-output --env-file=.env src/index.ts

.PHONY: start
start:
	watchexec --restart --watch assets --watch locales --ignore assets/locales/ -- make start-app

.PHONY: prod
prod: .env
	docker compose up --build --exit-code-from app

.dev/server.crt .dev/server.key: SHELL := /usr/bin/env bash
.dev/server.crt .dev/server.key: .env
	source .env && mkcert -install -cert-file .dev/server.crt -key-file .dev/server.key $$(echo $${PUBLIC_URL} | awk -F[/:] '{print $$4}')

.PHONY: start-services
start-services: .dev/server.crt .dev/server.key
	docker compose up --detach mailpit nginx opentelemetry postgres redis

.PHONY: format
format: node_modules
	npx prettier --ignore-unknown --check --cache --cache-location ".cache/prettier" src '**'

.PHONY: fix-format
fix-format: node_modules
	npx prettier --write --ignore-unknown --check --cache --cache-location ".cache/prettier" src '**'

.PHONY: lint-ts
lint-ts: node_modules src/manifest.json
	npx eslint --cache --cache-location ".cache/eslint/" --max-warnings 0

.PHONY: lint-css
lint-css: node_modules
	npx stylelint '**/*.css'

.PHONY: smoketest
smoketest:
	docker build --tag prereview-smoketest --target prod .
	docker compose down
	docker compose up postgres redis --wait
	scripts/smoke-test.sh prereview-smoketest
	docker compose down

.PHONY: typecheck
typecheck: node_modules src/manifest.json
	npx tsgo --incremental --tsBuildInfoFile ".cache/tsc"

.PHONY: typecheck-watch
typecheck-watch: node_modules src/manifest.json
	npx tsgo --watch --incremental --tsBuildInfoFile ".cache/tsc"

.PHONY: typecheck-analyze
typecheck-analyze: node_modules src/manifest.json
	npx tsc --incremental false --generateTrace ".cache/tsc-trace"
	npx analyze-trace .cache/tsc-trace ${TEST}

.PHONY: test
test: node_modules src/manifest.json
	npx vitest run ${TEST}

.PHONY: test-fast
test-fast: node_modules src/manifest.json
	@TEST_DIRS=$$(git status --porcelain | sed 's/^...//' | grep -E '.ts$$' | grep -E '^(src|test)' | xargs -r dirname | sed 's/^src/test/' | tr '\n' ' '); \
	if [ -n "$$TEST_DIRS" ]; then \
		FAST_CHECK_NUM_RUNS=10 npx vitest run --passWithNoTests --maxWorkers=50% $$TEST_DIRS; \
	else \
		echo "No .ts files changed, skipping tests"; \
	fi

.PHONY: test-watch
test-watch: node_modules src/manifest.json
	FAST_CHECK_NUM_RUNS=10 npx vitest watch --changed ${TEST}

.PHONY: test-integration
test-integration: test-integration-image
	docker compose up postgres --wait
	docker run --rm --env "POSTGRES_URL=postgres://postgres:password@host.docker.internal:5432" --add-host="host.docker.internal:host-gateway" --volume "$$(pwd)"/integration-results:/app/integration-results --volume "$$(pwd)"/visual-regression/snapshots:/app/visual-regression/snapshots ${INTEGRATION_TEST_IMAGE_TAG} ${TEST} ${ARGS}

.PHONY: test-integration-chrome
test-integration-chrome: ARGS=--project 'Desktop Chrome'
test-integration-chrome: test-integration

.PHONY: update-snapshots
update-snapshots: ARGS=--update-snapshots
update-snapshots: test-integration

.PHONY: test-integration-image
test-integration-image:
	docker build --target test-integration --tag ${INTEGRATION_TEST_IMAGE_TAG} .

.PHONY: cli-local
cli-local: .env node_modules start-services
	REDIS_URI=redis://$(shell docker compose port redis 6379) \
	POSTGRES_URL=postgres://postgres:password@$(shell docker compose port postgres 5432) \
	node --env-file .env src/cli.ts --wizard

.PHONY: cli-prod
cli-prod:
	flyctl --config fly.prod.toml ssh console --region iad --pty --command "node dist/cli.js --wizard"

.PHONY: status-prod
status-prod:
	flyctl --config fly.prod.toml ssh console --region iad --command "node dist/cli.js status"

.PHONY: withdraw-review-request
withdraw-review-request:
	flyctl --config fly.prod.toml ssh console --region iad --pty --command "node dist/cli.js withdraw-review-request --wizard"

.PHONY: categorize-review-request
categorize-review-request:
	flyctl --config fly.prod.toml ssh console --region iad --pty --command "node dist/cli.js categorize-review-request --wizard"

.PHONY: dump-sandbox-events
dump-sandbox-events:
	echo "COPY (SELECT * FROM events ORDER BY position) TO STDOUT WITH (FORMAT CSV, HEADER);" | fly mpg connect nvwq9oz78qe03kl1 -u readonly -d prereview-sandbox | tail -n +2 > data/sandbox-events-dump.csv
