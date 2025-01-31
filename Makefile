# opentrons platform makefile
# https://github.com/Opentrons/opentrons

# make OT_PYTHON available
include ./scripts/python.mk

API_DIR := api
API_CLIENT_DIR := api-client
APP_DIR := app
APP_SHELL_DIR := app-shell
APP_SHELL_ODD_DIR := app-shell-odd
COMPONENTS_DIR := components
DISCOVERY_CLIENT_DIR := discovery-client
G_CODE_TESTING_DIR := g-code-testing
LABWARE_LIBRARY_DIR := labware-library
PROTOCOL_DESIGNER_DIR := protocol-designer
SHARED_DATA_DIR := shared-data
UPDATE_SERVER_DIR := update-server
REACT_API_CLIENT_DIR := react-api-client
ROBOT_SERVER_DIR := robot-server
SERVER_UTILS_DIR := server-utils
STEP_GENERATION_DIR := step-generation
SYSTEM_SERVER_DIR := system-server
HARDWARE_DIR := hardware
USB_BRIDGE_DIR := usb-bridge
NODE_USB_BRIDGE_CLIENT_DIR := usb-bridge/node-client

PYTHON_DIRS := $(API_DIR) $(UPDATE_SERVER_DIR) $(ROBOT_SERVER_DIR) $(SERVER_UTILS_DIR) $(SHARED_DATA_DIR)/python $(G_CODE_TESTING_DIR) $(HARDWARE_DIR) $(USB_BRIDGE_DIR)

# This may be set as an environment variable (and is by CI tasks that upload
# to test pypi) to add a .dev extension to the python package versions. If
# empty, no .dev extension is appended, so this definition is here only as
# documentation
BUILD_NUMBER ?=

# watch, coverage, update snapshot, and warning suppresion variables for tests and linting
watch ?= false
cover ?= true
updateSnapshot ?= false
quiet ?= false

FORMAT_FILE_GLOB = ".*.@(js|ts|tsx|yml)" "**/*.@(ts|tsx|js|json|md|yml)"

ifeq ($(watch), true)
	cover := false
endif

# run at usage (=), not on makefile parse (:=)
# todo(mm, 2021-03-17): Deduplicate with scripts/python.mk.
usb_host=$(shell yarn -s discovery find -i 169.254)

# install all project dependencies
.PHONY: setup
setup: setup-js setup-py

# Both the python and JS setup targets depend on a minimal python setup so they can create
# virtual envs using pipenv.
.PHONY: setup-py-toolchain
setup-py-toolchain:
	$(OT_PYTHON) -m pip install --upgrade pip
	$(OT_PYTHON) -m pip install pipenv==2023.12.1

# front-end dependecies handled by yarn
.PHONY: setup-js
setup-js:
setup-js: setup-py-toolchain
	yarn config set network-timeout 60000
	yarn
	$(MAKE) -C $(APP_SHELL_DIR) setup
	$(MAKE) -C $(APP_SHELL_ODD_DIR) setup

PYTHON_SETUP_TARGETS := $(addsuffix -py-setup, $(PYTHON_DIRS))

.PHONY: setup-py
setup-py: setup-py-toolchain
	$(MAKE) $(PYTHON_SETUP_TARGETS)


%-py-setup:
	$(MAKE) -C $* setup

# uninstall all project dependencies
# tear down JS after Python, because Python cleanup depends on JS dep shx
.PHONY: teardown
teardown:
	$(MAKE) teardown-py
	$(MAKE) teardown-js

.PHONY: teardown-js
teardown-js: clean-js
	yarn shx rm -rf "**/node_modules"

PYTHON_TEARDOWN_TARGETS := $(addsuffix -py-teardown, $(PYTHON_DIRS))

.PHONY: teardown-py
teardown-py: $(PYTHON_TEARDOWN_TARGETS)

%-py-teardown: %-py-clean
	$(MAKE) -C $* teardown

# clean all project output
.PHONY: clean
clean: clean-js clean-py

.PHONY: clean-js
clean-js: clean-ts
	$(MAKE) -C $(DISCOVERY_CLIENT_DIR) clean
	$(MAKE) -C $(NODE_USB_BRIDGE_CLIENT_DIR) clean
	$(MAKE) -C $(COMPONENTS_DIR) clean

PYTHON_CLEAN_TARGETS := $(addsuffix -py-clean, $(PYTHON_DIRS))

.PHONY: clean-py
clean-py: $(PYTHON_CLEAN_TARGETS)

%-py-clean:
	$(MAKE) -C $* clean

.PHONY: deploy-py
deploy-py: export twine_repository_url = $(twine_repository_url)
deploy-py: export pypi_username = $(pypi_username)
deploy-py: export pypi_password = $(pypi_password)
deploy-py:
	$(MAKE) -C $(API_DIR) deploy
	$(MAKE) -C $(SHARED_DATA_DIR) deploy-py

.PHONY: push-api
push-api: export host = $(usb_host)
push-api:
	$(if $(host),@echo "Pushing to $(host)",$(error host variable required))
	$(MAKE) -C $(API_DIR) push

.PHONY: push-update-server
push-update-server: export host = $(usb_host)
push-update-server:
	$(if $(host),@echo "Pushing to $(host)",$(error host variable required))
	$(MAKE) -C $(UPDATE_SERVER_DIR) push

.PHONY: push
push: export host=$(usb_host)
push:
	$(if $(host),@echo "Pushing to $(host)",$(error host variable required))
	$(MAKE) -C $(SHARED_DATA_DIR) push-no-restart
	sleep 1
	$(MAKE) -C $(API_DIR) push-no-restart
	sleep 1
	$(MAKE) -C $(SERVER_UTILS_DIR) push
	sleep 1
	$(MAKE) -C $(SYSTEM_SERVER_DIR) push
	sleep 1
	$(MAKE) -C $(ROBOT_SERVER_DIR) push
	sleep 1
	$(MAKE) -C $(UPDATE_SERVER_DIR) push

.PHONY: push-folder
PUSH_HELPER := abr-testing/abr_testing/tools/make_push.py
push-folder:
	$(OT_PYTHON) $(PUSH_HELPER)

.PHONY: push-ot3
push-ot3:
	$(if $(host),@echo "Pushing to $(host)",$(error host variable required))
	$(MAKE) -C $(SHARED_DATA_DIR) push-no-restart-ot3
	$(MAKE) -C $(HARDWARE_DIR) push-no-restart-ot3
	$(MAKE) -C $(API_DIR) push-no-restart-ot3
	$(MAKE) -C $(SERVER_UTILS_DIR) push-ot3
	$(MAKE) -C $(ROBOT_SERVER_DIR) push-ot3
	$(MAKE) -C $(SYSTEM_SERVER_DIR) push-ot3
	$(MAKE) -C $(UPDATE_SERVER_DIR) push-ot3
	$(MAKE) -C $(USB_BRIDGE_DIR) push-ot3


.PHONY: term
term: export host = $(usb_host)
term:
	$(if $(host),@echo "Connecting to $(host)",$(error host variable required))
	$(MAKE) -C $(API_DIR) term

# all tests
.PHONY: test
test: test-py test-js

# tests that may be run on windows
.PHONY: test-windows
test-windows: test-js test-py-windows

.PHONY: test-e2e
test-e2e:
	$(MAKE) -C $(LABWARE_LIBRARY_DIR) test-e2e
	$(MAKE) -C $(PROTOCOL_DESIGNER_DIR) test-e2e

.PHONY: test-py-windows
test-py-windows:
	$(MAKE) -C $(HARDWARE_DIR) test
	$(MAKE) -C $(API_DIR) test
	$(MAKE) -C $(SHARED_DATA_DIR) test-py

.PHONY: test-py
test-py: test-py-windows
	$(MAKE) -C $(UPDATE_SERVER_DIR) test
	$(MAKE) -C $(ROBOT_SERVER_DIR) test
	$(MAKE) -C $(SERVER_UTILS_DIR) test
	$(MAKE) -C $(G_CODE_TESTING_DIR) test
	$(MAKE) -C $(USB_BRIDGE_DIR) test

.PHONY: test-js
test-js: test-js-internal

# lints and typechecks
.PHONY: lint
lint: lint-py lint-js lint-json lint-css check-js circular-dependencies-js

PYTHON_LINT_TARGETS  = $(addsuffix -py-lint, $(PYTHON_DIRS))

.PHONY: lint-py
lint-py: $(PYTHON_LINT_TARGETS)

%-py-lint:
	$(MAKE) -C $* lint

.PHONY: lint-js
lint-js: lint-js-eslint lint-js-prettier

.PHONY: lint-js-eslint
lint-js-eslint:
	yarn eslint --quiet=$(quiet) --ignore-pattern "node_modules/" ".*.@(js|ts|tsx)" "**/*.@(js|ts|tsx)"

.PHONY: lint-js-prettier
lint-js-prettier:
	yarn prettier --ignore-path .eslintignore --check $(FORMAT_FILE_GLOB)


.PHONY: lint-json
lint-json:
	yarn eslint --ignore-pattern "abr-testing/protocols/" --max-warnings 0 --ext .json .

.PHONY: lint-css
lint-css:
	yarn stylelint "**/*.css" "**/*.js"

.PHONY: format
format: format-js format-py

PYTHON_FORMAT_TARGETS := $(addsuffix -py-format, $(PYTHON_DIRS))

.PHONY: format-py
format-py: $(PYTHON_FORMAT_TARGETS)

%-py-format:
	$(MAKE) -C $* format

.PHONY: format-js
format-js:
	yarn prettier --ignore-path .eslintignore --write $(FORMAT_FILE_GLOB)

.PHONY: check-js
check-js: build-ts

.PHONY: build-ts
build-ts:
	yarn tsc --build

.PHONY: clean-ts
clean-ts:
	yarn tsc --build --clean

# TODO: Ian 2019-12-17 gradually add components and shared-data
.PHONY: circular-dependencies-js
circular-dependencies-js:
	yarn madge $(and $(CI),--no-spinner --no-color) --circular protocol-designer/src/index.tsx
	yarn madge $(and $(CI),--no-spinner --no-color) --circular step-generation/src/index.ts
	yarn madge $(and $(CI),--no-spinner --no-color) --circular labware-library/src/index.tsx
	yarn madge $(and $(CI),--no-spinner --no-color) --circular app/src/index.tsx
	yarn madge $(and $(CI),--no-spinner --no-color) --circular components/src/index.ts

.PHONY: test-js-internal
test-js-internal:
	yarn vitest $(tests) $(test_opts) $(cov_opts)

.PHONY: test-js-%
test-js-%: 
	$(MAKE) test-js-internal tests="$(if $(tests),$(foreach test,$(tests),$*/$(test)),$*)" test_opts="$(test_opts)" cov_opts="$(cov_opts)"
