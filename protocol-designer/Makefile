# opentrons protocol designer makefile

# using bash instead of /bin/bash in SHELL prevents macOS optimizing away our PATH update
SHELL := bash

# add node_modules/.bin to PATH
PATH := $(shell cd .. && yarn bin):$(PATH)

benchmark_output := $(shell node -e 'console.log(new Date());')

# These variables can be overriden when make is invoked to customize the
# behavior of jest
tests ?=
cov_opts ?= --coverage=true
test_opts ?=

# standard targets
#####################################################################

.PHONY: all
all: clean build

.PHONY: setup
setup:
	yarn

.PHONY: clean
clean:
	shx rm -rf dist

# artifacts
#####################################################################

.PHONY: build
build: export NODE_ENV := production
build:
	vite build
	git rev-parse HEAD > dist/.commit

# development
#####################################################################

.PHONY: benchmarks
benchmarks: export NODE_ENV := test
benchmarks:
	shx mkdir -p benchmarks/output
	node ../scripts/runBenchmarks "./benchmarks/*.js" | \
	ntee "./benchmarks/output/$(benchmark_output)"

.PHONY: dev
dev: export NODE_ENV := development
dev:
	vite serve

# production assets server
.PHONY: serve
serve: all
	node ../scripts/serve-static dist

# end to end tests
.PHONY: test-e2e
test-e2e: clean-downloads
	concurrently --no-color --kill-others --success first --names "protocol-designer-server,protocol-designer-tests" \
	"$(MAKE) dev" \
	"wait-on http://localhost:5178/ && cypress run --browser chrome --headless --record false"

.PHONY: test
test:
	$(MAKE) -C .. test-js-protocol-designer tests="$(tests)" test_opts="$(test_opts)"

.PHONY: test-cov
test-cov:
	make -C .. test-js-protocol-designer tests=$(tests) test_opts="$(test_opts)" cov_opts="$(cov_opts)"

CYPRESS_ESLINT_GLOB := "cypress/**/*.{js,ts,tsx}"
CYPRESS_PRETTIER_GLOB := "cypress/**/*.{js,ts,tsx,md,json}"

.PHONY: cy-lint-check
cy-lint-check: cy-lint-eslint-check cy-lint-prettier-check
	@echo "Cypress lint check completed."

.PHONY: cy-lint-fix
cy-lint-fix: cy-lint-eslint-fix cy-lint-prettier-fix
	@echo "Cypress lint fix applied."

.PHONY: cy-lint-eslint-check
cy-lint-eslint-check:
	yarn eslint --ignore-path ../.eslintignore $(CYPRESS_ESLINT_GLOB)
	@echo "Cypress ESLint check completed."

.PHONY: cy-lint-eslint-fix
cy-lint-eslint-fix:
	yarn eslint --fix --ignore-pattern ../.eslintignore $(CYPRESS_ESLINT_GLOB)
	@echo "Cypress ESLint fix applied."

.PHONY: cy-lint-prettier-check
cy-lint-prettier-check:
	yarn prettier --ignore-path ../.eslintignore --check $(CYPRESS_PRETTIER_GLOB)
	@echo "Cypress Prettier check completed."

.PHONY: cy-lint-prettier-fix
cy-lint-prettier-fix:
	yarn prettier --ignore-path ../.eslintignore --write $(CYPRESS_PRETTIER_GLOB)
	@echo "Cypress Prettier fix applied."

.PHONY: cy-ui
cy-ui:
	@echo "Running Cypress UI"
	@echo "Dev environment must be running"
	yarn cypress open

.PHONY: clean-downloads
clean-downloads:
	shx rm -rf cypress/downloads