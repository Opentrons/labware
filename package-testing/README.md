# Test Scripts for the opentrons package

## Structure

- Makefile has targets for setting up, tearing down, and running tests for windows and unix-ish systems
- setup.\* is the script run create the virtual environment and install the packages
- help.\* is a script to test --help
- simulate.\* is a script to test that the simulation runs and produces the expected status code
- run_tests.py is the main script that drives test execution and contains the test mapping data

## Use the tests on Linux and Mac

1. cd package-testing
2. pyenv local 3.10
3. make setup - note that this deletes and recreates the virtual environment
4. make test

## Use the tests on Windows

- powershell is mapped to pwsh and is version 7
- python is on the path is version 3.10.\*

1. cd package-testing
2. make setup-windows - note that this deletes and recreates the virtual environment
3. make test-windows

## Notes

- find . -name "\*.sh" -exec shellcheck {} +

## TODO

- setup shellcheck and python linting
- more tests
