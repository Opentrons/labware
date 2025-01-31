import { screen } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { when } from 'vitest-when'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { IncompatibleModuleTakeover } from '../IncompatibleModuleTakeover'
import { IncompatibleModuleODDModalBody } from '../IncompatibleModuleODDModalBody'
import { IncompatibleModuleDesktopModalBody } from '../IncompatibleModuleDesktopModalBody'
import { useIncompatibleModulesAttached } from '../hooks'
import type { AttachedModule } from '@opentrons/api-client'
import {
  PortalRoot,
  TopPortalRoot,
  MODAL_PORTAL_ID,
  TOP_PORTAL_ID,
} from '/app/App/portal'
import * as Fixtures from '../__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('../hooks')
vi.mock('../IncompatibleModuleODDModalBody')
vi.mock('../IncompatibleModuleDesktopModalBody')

const getRenderer = (incompatibleModules: AttachedModule[]) => {
  when(useIncompatibleModulesAttached)
    .calledWith(expect.anything())
    .thenReturn(incompatibleModules)
  vi.mocked(IncompatibleModuleODDModalBody).mockReturnValue(
    <div>TEST ELEMENT ODD</div>
  )
  vi.mocked(IncompatibleModuleDesktopModalBody).mockReturnValue(
    <div>TEST ELEMENT DESKTOP</div>
  )
  return (props: ComponentProps<typeof IncompatibleModuleTakeover>) => {
    const [rendered] = renderWithProviders(
      <>
        <PortalRoot />
        <TopPortalRoot />
        <IncompatibleModuleTakeover {...(props as any)} />
      </>,
      {
        i18nInstance: i18n,
      }
    )
    rendered.rerender(
      <>
        <PortalRoot />
        <TopPortalRoot />
        <IncompatibleModuleTakeover {...(props as any)} />
      </>
    )
    return rendered
  }
}

describe('IncompatibleModuleTakeover', () => {
  let props: ComponentProps<typeof IncompatibleModuleTakeover>
  beforeEach(() => {
    props = { isOnDevice: true }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  ;['desktop', 'odd'].forEach(target => {
    it(`should render nothing on ${target} when no incompatible modules are attached`, () => {
      getRenderer([])({ ...props, isOnDevice: target === 'odd' })
      expect(screen.queryByTestId(TOP_PORTAL_ID)).toBeEmptyDOMElement()
      expect(screen.queryByTestId(MODAL_PORTAL_ID)).toBeEmptyDOMElement()
      expect(screen.queryByText(/TEST ELEMENT/)).toBeNull()
    })
  })

  it('should render the modal body on odd when incompatible modules are attached', async () => {
    getRenderer(Fixtures.oneIncompatibleModule as any)({
      ...props,
      isOnDevice: true,
    })
    screen.getByText('TEST ELEMENT ODD')
  })

  it('should render the modal body on desktop when incompatible modules are attached', async () => {
    getRenderer(Fixtures.oneIncompatibleModule as any)({
      ...props,
      isOnDevice: false,
    })
    screen.getByText('TEST ELEMENT DESKTOP')
  })
})
