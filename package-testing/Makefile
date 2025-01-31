VENV_DIR ?= venv
RESULTS_DIR ?= results
TESTS ?= all

.PHONY: setup
setup:
	@echo "Setting up environment for Unix-like system..."
	./setup.sh $(VENV_DIR)

.PHONY:  setup-windows
setup-windows:
	@echo "Setting up environment for Windows..."
	pwsh -ExecutionPolicy Bypass -File ./setup.ps1 $(VENV_DIR)

.PHONY: clean
clean:
	@echo "Removing the results directory $(RESULTS_DIR)..."
	rm -rf $(RESULTS_DIR) || true

.PHONY: clean-windows
clean-windows:
	@echo "Removing the results directory $(RESULTS_DIR)..."
	pwsh -Command "if (Test-Path '$(RESULTS_DIR)') { Remove-Item -Recurse -Force '$(RESULTS_DIR)' }"

.PHONY: teardown
teardown: clean
	rm -rf $(VENV_DIR) || true

.PHONY: teardown-windows
teardown-windows: clean-windows
		pwsh -Command "if (Test-Path '$(VENV_DIR)') { Remove-Item -Recurse -Force '$(VENV_DIR)' }"



.PHONY: test
test: clean
	@echo "Running $(TESTS) tests for Unix-like system..."
	python run_tests.py $(VENV_DIR) $(RESULTS_DIR) $(TESTS)

.PHONY: test-windows
test-windows: clean-windows
	@echo "Running $(TESTS) tests for Windows..."
	python run_tests.py $(VENV_DIR) $(RESULTS_DIR) $(TESTS)
