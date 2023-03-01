.PHONY: test test-integration update-snapshots test-integration-image

INTEGRATION_TEST_IMAGE_TAG=prereview.org-integration-tests

node_modules: package.json package-lock.json
	npm install
	touch node_modules

test: node_modules
	npx jest ${TEST}

test-integration: test-integration-image
	docker run --rm --volume "$$(pwd)"/integration/snapshots:/app/integration/snapshots --volume "$$(pwd)"/integration-results:/app/integration-results ${INTEGRATION_TEST_IMAGE_TAG} ${TEST} ${ARGS}

update-snapshots: ARGS=--update-snapshots
update-snapshots: test-integration

test-integration-image:
	docker build --target test-integration --tag ${INTEGRATION_TEST_IMAGE_TAG} .
