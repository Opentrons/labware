# opentrons ai server makefile
.PHONY: install-pipenv
install-pipenv:
	python -m pip install --user pipenv==2023.12.1

.PHONY: setup
setup: install-pipenv
	python -m pipenv install --dev --python 3.12

.PHONY: teardown
teardown:
	python -m pipenv --rm

.PHONY: black
black:
	python -m pipenv run python -m black .

.PHONY: black-check
black-check:
	python -m pipenv run python -m black . --check

.PHONY: ruff
ruff:
	python -m pipenv run python -m ruff check . --fix --unsafe-fixes

.PHONY: ruff-check
ruff-check:
	python -m pipenv run python -m ruff check .

.PHONY: mypy
mypy:
	python -m pipenv run python -m mypy deploy.py api tests

.PHONY: format-readme
format-readme:
	yarn prettier --ignore-path .eslintignore --write opentrons-ai-server/**/*.md opentrons-ai-server/**/*.json

.PHONY: lint
lint: black-check ruff-check mypy

.PHONY: format
format: 
	@echo runnning black
	$(MAKE) black
	@echo running ruff
	$(MAKE) ruff
	@echo formatting the readme with yarn prettier
	$(MAKE) format-readme

.PHONY: fixup
fixup: format lint

.PHONY: pre-commit
pre-commit: fixup unit-test
	@echo "pre-commit checks passed"

.PHONY: gen-env
gen-env:
	python -m pipenv run python -m api.settings

.PHONY: unit-test
unit-test:
	python -m pipenv run python -m pytest tests -m unit

.PHONY: gen-requirements
gen-requirements:
	@echo "Generating requirements.txt from Pipfile.lock..."
	python -m pipenv requirements > requirements.txt

ENV ?= local
TAG ?=

.PHONY: deploy
deploy: gen-requirements
	@echo "Deploying to environment: $(ENV)"
	python -m pipenv run python deploy.py --env $(ENV) $(if $(TAG),--tag $(TAG),)

.PHONY: dry-deploy
dry-deploy: gen-requirements
	@echo "Dry run deploying to environment: $(ENV)"
	@echo "Data is retrieved from AWS but no changes are made"
	python -m pipenv run python deploy.py --dry --env $(ENV) $(if $(TAG),--tag $(TAG),)

.PHONY: prompted-deploy
prompted-deploy: gen-requirements
	python -m pipenv run python deploy.py

.PHONY: direct-chat-completion
direct-chat-completion:
	python -m pipenv run python -m api.domain.openai_predict

.PHONY: print-client-settings-vars
print-client-settings-vars:
	python -m pipenv run python -m tests.helpers.settings

.PHONY: live-client
live-client:
	python -m pipenv run python -m tests.helpers.client

.PHONY: live-hf
live-hf:
	python -m pipenv run python -m tests.helpers.huggingface_client

.PHONY: live-test
live-test:
	python -m pipenv run python -m pytest tests -m live --env $(ENV)

IMAGE_NAME=ai-server-local
CONTAINER_NAME=ai-server-container
ENV_FILE=.env

CACHEBUST := $(shell date +%s)

.PHONY: build
build:
	docker build --build-arg CACHEBUST=$(CACHEBUST) -t $(IMAGE_NAME) .

.PHONY: run
run:
	docker run --name $(CONTAINER_NAME) --env-file $(ENV_FILE) -p 8000:8000 $(IMAGE_NAME)
	docker logs -f $(CONTAINER_NAME)

.PHONY: clean
clean: gen-requirements
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

.PHONY: rebuild
rebuild: clean build run

.PHONY: local-run
local-run:
	python -m pipenv run python -m api.handler.local_run --env $(ENV)

.PHONY: run-shell
run-shell:
	docker run -d --name $(CONTAINER_NAME) --env-file $(ENV_FILE) -p 8000:8000 $(IMAGE_NAME) tail -f /dev/null

.PHONY: shell
shell:
	docker exec -it $(CONTAINER_NAME) /bin/bash

.PHONY: test-googlesheet
test-googlesheet:
	@echo "Loading environment variables from .env and running test-googlesheet"
	pipenv run python -m api.integration.google_sheets
