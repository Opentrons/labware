# opentrons components library

React components for Opentrons' applications. Visit the [Opentrons Components Library][components-library] to see available components.

[components-library]: https://s3-us-west-2.amazonaws.com/opentrons-components/edge/index.html

## example usage

```javascript
import { PrimaryButton } from '@opentrons/components'

export default function CowButton(props) {
  return <PrimaryButton onClick={() => console.log('🐄')} />
}
```

## setup

Usage requirements for dependent projects:

- Node v22.11.0+ and yarn
- The following `dependencies` (peer dependencies of `@opentrons/components`)
  - `react`: `17.0.1`,
  - `react-router-dom`: `^4.2.2`,
  - `classnames`: `^2.2.5`,
  - `lodash`: `^4.17.4`

## contributing

Make sure you have read the top-level [Contributing Guide][contributing].

### unit tests

Unit tests are run with the rest of the repositories unit tests from the top level of the project.

```shell
make test-js
```

Unit tests live in a `__tests__` directory in the same directory as the module under test. When writing unit tests for components, we've found the following tests to be the most useful:

- DOM tests
  - Make sure the component renders the correct node type
  - Make sure DOM attributes are mapped correctly
  - Make sure handlers fire correctly
- Render tests

  - Snapshot tests using [jest's snapshot functionality][jest-snapshots]
  - To regenerate snapshots after an intentional rendering change, run:

  ```shell
  make test-js updateSnapshot=true
  ```

[jest-snapshots]: https://facebook.github.io/jest/docs/en/snapshot-testing.html
[contributing]: ../CONTRIBUTING.md
