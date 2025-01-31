import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'
import { parseLiquidsInLoadOrder } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ProtocolLiquidsDetails } from '../ProtocolLiquidsDetails'

import type { ComponentProps } from 'react'
import type * as SharedData from '@opentrons/shared-data'

vi.mock('../../Desktop/Devices/ProtocolRun/SetupLiquids/SetupLiquidsList')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseLiquidsInLoadOrder: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof ProtocolLiquidsDetails>) => {
  return renderWithProviders(<ProtocolLiquidsDetails {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolLiquidsDetails', () => {
  let props: ComponentProps<typeof ProtocolLiquidsDetails>
  beforeEach(() => {
    props = {
      commands: [],
      liquids: [
        {
          id: 'mockLiquid',
          displayName: 'mockDisplayName',
          description: 'mockDescription',
        },
      ],
    }
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue([
      {
        id: '1',
        displayName: 'mock liquid',
        description: 'mock description',
        displayColor: '#FFFFFF',
      },
    ])
  })
  it('renders the display name, description and total volume', () => {
    render(props)
    screen.getByText('mock liquid')
    screen.getByText('mock description')
  })
  it('renders the correct info for no liquids in the protocol', () => {
    props.liquids = []
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue([])
    render(props)
    screen.getByText('No liquids are specified for this protocol')
    screen.getByLabelText('ProtocolLIquidsDetails_noLiquidsIcon')
  })
})
