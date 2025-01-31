import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { getFileMetadata } from '../../../file-data/selectors'
import { LiquidButton } from '../../../molecules'

import { DesignerNavigation } from '..'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { TabProps } from '@opentrons/components'

vi.mock('../../../file-data/selectors')
vi.mock('../../../molecules/LiquidButton')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      location: {
        pathname: '/designer',
      },
    }),
  }
})

const render = (props: ComponentProps<typeof DesignerNavigation>) => {
  return renderWithProviders(<DesignerNavigation {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DesignerNavigation', () => {
  let props: ComponentProps<typeof DesignerNavigation>
  beforeEach(() => {
    props = {
      hasZoomInSlot: false,
      tabs: [
        {
          text: 'Protocol starting deck',
          isActive: true,
        },
        {
          text: 'Protocol steps',
          isActive: false,
        },
      ] as TabProps[],
      hasTrashEntity: false,
      showLiquidOverflowMenu: vi.fn(),
    }
    vi.mocked(getFileMetadata).mockReturnValue({
      protocolName: 'mockProtocolName',
      created: 123,
    })
    vi.mocked(LiquidButton).mockReturnValue(<div>mock LiquidButton</div>)
  })

  it('should render protocol name and edit protocol - protocol name', () => {
    render(props)
    screen.getByText('mockProtocolName')
    screen.getByText('Edit protocol')
    screen.getByText('mock LiquidButton')
    screen.getByText('Protocol starting deck')
    screen.getByText('Protocol steps')
    screen.getByText('Done')
  })
  it('should render protocol name and edit protocol - no protocol name', () => {
    vi.mocked(getFileMetadata).mockReturnValue({})
    render(props)
    screen.getByText('Untitled protocol')
    screen.getByText('Edit protocol')
  })

  it('should render protocol name and add hardware/labware - protocol name', () => {
    props = { ...props, hasZoomInSlot: true }
    render(props)
    screen.getByText('mockProtocolName')
    screen.getByText('Add hardware/labware')
  })

  it('should render protocol name and add hardware/labware - no protocol name', () => {
    props = { ...props, hasZoomInSlot: true }
    vi.mocked(getFileMetadata).mockReturnValue({})
    render(props)
    screen.getByText('Untitled protocol')
    screen.getByText('Add hardware/labware')
  })
})
