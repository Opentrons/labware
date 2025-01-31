import { screen } from '@testing-library/react'
import { describe, it, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { IncompatibleModuleODDModalBody } from '../IncompatibleModuleODDModalBody'
import * as Fixtures from '../__fixtures__'

import type { ComponentProps } from 'react'

const render = (
  props: ComponentProps<typeof IncompatibleModuleODDModalBody>
) => {
  return renderWithProviders(<IncompatibleModuleODDModalBody {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('IncompatibleModuleODDModalBody', () => {
  let props: ComponentProps<typeof IncompatibleModuleODDModalBody>
  beforeEach(() => {
    props = {
      modules: [],
    }
  })

  it('should render i18nd header text', () => {
    props = { ...props, modules: Fixtures.oneIncompatibleModule as any }
    render(props)
    screen.getByText('Incompatible module detected')
    screen.getByText('Remove the following hardware before running a protocol:')
  })

  it('should render a module card', () => {
    props = { ...props, modules: Fixtures.oneIncompatibleModule as any }
    render(props)
    screen.getByText('Thermocycler Module GEN1')
  })

  it('should overflow via scroll', () => {
    props = { ...props, modules: Fixtures.manyIncompatibleModules as any }
    render(props)
    const labels = screen.getAllByText('Thermocycler Module GEN1')
    expect(labels).toHaveLength(Fixtures.manyIncompatibleModules.length)
  })
})
