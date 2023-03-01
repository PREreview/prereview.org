.PHONY: test test-integration

node_modules: package.json package-lock.json
	npm install
	touch node_modules

test: node_modules
	npx jest ${TEST}

test-integration:
	docker build --target test-integration --tag "prereview.org-integration-tests" .
	docker run --rm --volume "$$(pwd)"/integration/snapshots:/app/integration/snapshots --volume "$$(pwd)"/integration-results:/app/integration-results "prereview.org-integration-tests" ${TEST}
