# opentrons app makefile

# using bash instead of /bin/bash in SHELL prevents macOS optimizing away our PATH update
SHELL := bash

# add node_modules/.bin to PATH
PATH := $(shell cd .. && yarn bin):$(PATH)

# dev server port
PORT ?= 5173

# Path of source package
SRC_PATH = app

OPENTRONS_PROJECT ?= robot-stack

# dependency directories for dev
shell_dir := ../app-shell
shell_odd_dir := ../app-shell-odd
discovery_client_dir := ../discovery-client

# These variables can be overriden when make is invoked to customize the
# behavior of jest. For instance,
# make test tests=src/pages/Desktop/Labware/__tests__/hooks.test.tsx would run only the
# specified test
tests ?=
cov_opts ?= --coverage=true
test_opts ?=

# standard targets
#####################################################################

.PHONY: all
all: clean dist

.PHONY: setup
setup:
	yarn

.PHONY: clean
clean:
	shx rm -rf dist

# artifacts
#####################################################################
.PHONY: dist
dist: export NODE_ENV := production
dist:
	echo "Building app JS bundle (browser layer)"
	NODE_OPTIONS="--max-old-space-size=8192" vite build

# development
#####################################################################

.PHONY: dev
dev: export NODE_ENV := development
dev: export PORT := $(PORT)
dev:
	concurrently --no-color --kill-others --names "server,shell" \
		"$(MAKE) dev-server OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)" \
		"$(MAKE) dev-shell OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)"

.PHONY: dev-odd
dev-odd: export NODE_ENV := development
dev-odd: export PORT := $(PORT)
dev-odd: export OPENTRONS_PROJECT := $(OPENTRONS_PROJECT)
dev-odd:
	concurrently --no-color --kill-others --names "server,shell" \
		"$(MAKE) dev-server OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)" \
		"$(MAKE) dev-shell-odd OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)"

.PHONY: dev-server
dev-server: export OPENTRONS_PROJECT := $(OPENTRONS_PROJECT)
dev-server:
	vite serve

.PHONY: dev-dist
dev-dist: export NODE_ENV := development
dev-dist:
	$(MAKE) -C $(shell_dir) dev-dist OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)

.PHONY: dev-shell
dev-shell:
	$(MAKE) -C $(shell_dir) dev OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)


.PHONY: dev-shell-odd
dev-shell-odd: export OT_APP_IS_ON_DEVICE := 1
dev-shell-odd: export OT_APP_ON_DEVICE_DISPLAY_SETTINGS__UNFINISHED_UNBOXING_FLOW_ROUTE := 0
dev-shell-odd: export OT_APP_UI__WIDTH := 1024
dev-shell-odd: export OT_APP_UI__HEIGHT := 600
dev-shell-odd:
	wait-on http-get://localhost:$(PORT)
	$(MAKE) -C $(shell_odd_dir) dev OPENTRONS_PROJECT=$(OPENTRONS_PROJECT)

.PHONY: test
test:
	make -C .. test-js-app tests="$(tests)" test_opts="$(test_opts)"

.PHONY: test-cov
test-cov:
	make -C .. test-js-app tests=$(tests) test_opts="$(test_opts)" cov_opts="$(cov_opts)"
