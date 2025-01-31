# Cypress in PD

This is a guide to running Cypress tests in Protocol Designer.

- `cat Makefile` to see all the available commands

## Cypress Organization

- `cypress/e2e` contains all the tests
- `cypress/support` contains all the support files
  - `cypress/support/commands` contains added commands and may be used for actions on the home page and header
  - use the files representing the different parts of the app to create reusable functions
- `../fixtures` (PD root fixtures) and `cypress/fixtures` contains all the fixtures (files) that we might want to use in tests

## Fixtures

We need to read data from files. `support/testFiles.ts` maps in files and provides an enum to reference them by. All files that need to be read in should be mapped through testFiles.

## Tactics

### Locators

<https://docs.cypress.io/app/core-concepts/best-practices#Selecting-Elements>

1. use a simple cy.contains()
1. try aria-\* attributes
1. data-testid attribute (then use getByTestId custom command)
