BASE_IMAGE_NAME ?= opentrons-python-base:3.10
CACHEBUST ?= $(shell date +%s)
ANALYSIS_REF ?= edge
PROTOCOL_NAMES ?= all
OVERRIDE_PROTOCOL_NAMES ?= all
LOCAL_IMAGE_TAG ?= local
ANALYZER_IMAGE_NAME ?= opentrons-analysis

export ANALYSIS_REF # tag, branch or commit for the opentrons repository. Used as the image tag for the analyzer image
export PROTOCOL_NAMES # tell the test which protocols to run
export OVERRIDE_PROTOCOL_NAMES # tell the test which override protocols to run

ifeq ($(CI), true)
	PYTHON=python
else
	PYTHON=pyenv exec python
endif

.PHONY: black
black:
	$(PYTHON) -m pipenv run python -m black .

.PHONY: black-check
black-check:
	$(PYTHON) -m pipenv run python -m black . --check

.PHONY: ruff
ruff:
	$(PYTHON) -m pipenv run python -m ruff check . --fix

.PHONY: ruff-check
ruff-check:
	$(PYTHON) -m pipenv run python -m ruff check .

.PHONY: mypy
mypy:
	$(PYTHON) -m pipenv run python -m mypy automation tests citools

.PHONY: lint
lint: black-check ruff-check mypy

.PHONY: format
format: 
	@echo "Running black"
	$(MAKE) black
	@echo "Running ruff"
	$(MAKE) ruff
	@echo "Formatting the readme with yarn prettier"
	$(MAKE) format-readme

.PHONY: test-ci
test-ci:
	$(PYTHON) -m pipenv run python -m pytest -m "emulated_alpha"

.PHONY: test-protocol-analysis
test-protocol-analysis:
	pipenv run python -m pytest -v tests/protocol_analyze_test.py

.PHONY: setup
setup: install-pipenv
	$(PYTHON) -m pipenv install

.PHONY: teardown
teardown:
	$(PYTHON) -m pipenv --rm

.PHONY: format-readme
format-readme:
	yarn prettier --ignore-path .eslintignore --write analyses-snapshot-testing/**/*.md .github/workflows/analyses-snapshot-test.yaml

.PHONY: install-pipenv
install-pipenv:
	$(PYTHON) -m pip install -U pipenv

.PHONY: snapshot-test
snapshot-test:
	@echo "ANALYSIS_REF is $(ANALYSIS_REF)"
	@echo "PROTOCOL_NAMES is $(PROTOCOL_NAMES)"
	@echo "OVERRIDE_PROTOCOL_NAMES is $(OVERRIDE_PROTOCOL_NAMES)"
	$(PYTHON) -m pipenv run pytest -k analyses_snapshot_test -vv

.PHONY: snapshot-test-update
snapshot-test-update:
	@echo "ANALYSIS_REF is $(ANALYSIS_REF)"
	@echo "PROTOCOL_NAMES is $(PROTOCOL_NAMES)"
	@echo "OVERRIDE_PROTOCOL_NAMES is $(OVERRIDE_PROTOCOL_NAMES)"
	$(PYTHON) -m pipenv run pytest -k analyses_snapshot_test --snapshot-update

.PHONY: build-base-image
build-base-image:
	@echo "Building the base image $(BASE_IMAGE_NAME)"
	docker build --build-arg BASE_IMAGE_NAME=$(BASE_IMAGE_NAME) -f citools/Dockerfile.base -t $(BASE_IMAGE_NAME) citools/.

.PHONY: build-opentrons-analysis
build-opentrons-analysis:
	@echo "Building docker image for opentrons repository reference$(ANALYSIS_REF)"
	@echo "The image will be named $(ANALYZER_IMAGE_NAME):$(ANALYSIS_REF)"
	@echo "If you want to build a different version, run 'make build-opentrons-analysis ANALYSIS_REF=<tag, branch, or commit>'"
	docker build --build-arg BASE_IMAGE_NAME=$(BASE_IMAGE_NAME) --build-arg ANALYSIS_REF=$(ANALYSIS_REF) --build-arg CACHEBUST=$(CACHEBUST) -t $(ANALYZER_IMAGE_NAME):$(ANALYSIS_REF) -f citools/Dockerfile.analyze citools/.

.PHONY: build-local
build-local:
	@echo "Building docker image for your local opentrons code"
	@echo "This image will be named $(ANALYZER_IMAGE_NAME):$(LOCAL_IMAGE_TAG)"
	docker build --build-arg BASE_IMAGE_NAME=$(BASE_IMAGE_NAME) -t $(ANALYZER_IMAGE_NAME):$(LOCAL_IMAGE_TAG) -f citools/Dockerfile.local ..
	@echo "Build complete"

.PHONY: snapshot-test-local
snapshot-test-local: ANALYSIS_REF=$(LOCAL_IMAGE_TAG)
snapshot-test-local: build-base-image build-local
	@echo "This target is overriding the ANALYSIS_REF to the LOCAL_IMAGE_TAG: $(LOCAL_IMAGE_TAG)"
	@echo "ANALYSIS_REF is $(ANALYSIS_REF). The the test maps this env variable to the image tag."
	@echo "The image the test will use is $(ANALYZER_IMAGE_NAME):$(LOCAL_IMAGE_TAG)"
	@echo "PROTOCOL_NAMES is $(PROTOCOL_NAMES)"
	@echo "OVERRIDE_PROTOCOL_NAMES is $(OVERRIDE_PROTOCOL_NAMES)"
	$(PYTHON) -m pipenv run pytest -k analyses_snapshot_test -vv

.PHONY: snapshot-test-update-local
snapshot-test-update-local: ANALYSIS_REF=$(LOCAL_IMAGE_TAG)
snapshot-test-update-local: build-base-image build-local
	@echo "This target is overriding the ANALYSIS_REF to the LOCAL_IMAGE_TAG: $(LOCAL_IMAGE_TAG)"
	@echo "ANALYSIS_REF is $(ANALYSIS_REF). The the test maps this env variable to the image tag."
	@echo "The image the test will use is $(ANALYZER_IMAGE_NAME):$(LOCAL_IMAGE_TAG)"
	@echo "PROTOCOL_NAMES is $(PROTOCOL_NAMES)"
	@echo "OVERRIDE_PROTOCOL_NAMES is $(OVERRIDE_PROTOCOL_NAMES)"
	$(PYTHON) -m pipenv run pytest -k analyses_snapshot_test --snapshot-update

.PHONY: generate-protocols
generate-protocols:
	$(PYTHON) -m pipenv run python -m automation.data.protocol_registry

# Tools for running the robot server in a container

OPENTRONS_VERSION ?= edge
export OPENTRONS_VERSION # used for the robot server image as the tag, branch or commit for the opentrons repository

.PHONY: build-rs
build-rs:
	@echo "Building docker image for opentrons-robot-server:$(OPENTRONS_VERSION)"
	@echo "Cache is always busted to ensure latest version of the code is used"
	@echo "If you want to build a different version, run 'make build-rs OPENTRONS_VERSION=chore_release-8.0.0'"
	docker build --build-arg BASE_IMAGE_NAME=$(BASE_IMAGE_NAME) --build-arg OPENTRONS_VERSION=$(OPENTRONS_VERSION) --build-arg CACHEBUST=$(CACHEBUST) -t opentrons-robot-server:$(OPENTRONS_VERSION) -f citools/Dockerfile.server .

.PHONY: run-flex
run-flex:
	@echo "Running opentrons-robot-server:$(OPENTRONS_VERSION)"
	@echo "If you want to run a different version, run 'make run-flex OPENTRONS_VERSION=chore_release-8.0.0'"
	docker run -p 31950:31950 --env-file ../robot-server/dev-flex.env opentrons-robot-server:$(OPENTRONS_VERSION)

.PHONY: run-ot2
run-ot2:
	@echo "Running opentrons-robot-server:$(OPENTRONS_VERSION)"
	@echo "If you want to run a different version, run 'make run-ot2 OPENTRONS_VERSION=chore_release-8.0.0'"
	docker run -p 31950:31950 --env-file ../robot-server/dev.env opentrons-robot-server:$(OPENTRONS_VERSION)
