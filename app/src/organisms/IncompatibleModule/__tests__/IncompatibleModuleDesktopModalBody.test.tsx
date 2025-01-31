import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'
import { when } from 'vitest-when'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { IncompatibleModuleDesktopModalBody } from '../IncompatibleModuleDesktopModalBody'
import { useIsFlex } from '/app/redux-resources/robots'
import * as Fixtures from '../__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux-resources/robots')

const getRenderer = (isFlex: boolean) => {
  when(useIsFlex).calledWith('otie').thenReturn(isFlex)
  return (props: ComponentProps<typeof IncompatibleModuleDesktopModalBody>) => {
    return renderWithProviders(
      <IncompatibleModuleDesktopModalBody {...props} />,
      {
        i18nInstance: i18n,
      }
    )[0]
  }
}

describe('IncompatibleModuleDesktopModalBody', () => {
  let props: ComponentProps<typeof IncompatibleModuleDesktopModalBody>
  beforeEach(() => {
    props = {
      modules: [],
      robotName: 'otie',
    }
  })

  it('should render i18nd footer text', () => {
    props = { ...props, modules: Fixtures.oneIncompatibleModule as any }
    getRenderer(true)(props)
    screen.getByText(
      'You must remove incompatible modules before using this robot.'
    )
    screen.getByText('otie needs your assistance')
  })
  ;['Flex', 'OT-2'].forEach(robotKind =>
    it(`should render a module card that says ${robotKind}`, () => {
      props = { ...props, modules: Fixtures.oneIncompatibleModule as any }
      getRenderer(robotKind === 'Flex')(props)
      screen.getByText(
        `Thermocycler Module GEN1 is not compatible with the ${robotKind}`
      )
    })
  )
})
