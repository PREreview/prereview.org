.PHONY: test

node_modules: package.json package-lock.json
	npm install
	touch node_modules

test: node_modules
	npx jest ${TEST}
