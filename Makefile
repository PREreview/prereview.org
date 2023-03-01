.PHONY: test test-integration update-snapshots test-integration-image

node_modules: package.json package-lock.json
	npm install
	touch node_modules

test: node_modules
	npx jest ${TEST}

test-integration: test-integration-image
	docker run --rm --volume "$$(pwd)"/integration/snapshots:/app/integration/snapshots --volume "$$(pwd)"/integration-results:/app/integration-results "prereview.org-integration-tests" ${TEST}

update-snapshots: test-integration-image
	docker run --rm --volume "$$(pwd)"/integration/snapshots:/app/integration/snapshots --volume "$$(pwd)"/integration-results:/app/integration-results "prereview.org-integration-tests" ${TEST} --update-snapshots

test-integration-image:
	docker build --target test-integration --tag "prereview.org-integration-tests" .
