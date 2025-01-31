import { screen, fireEvent } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { getLocationInfoNames } from '/app/transformations/commands'
import { getVolumePerWell } from '/app/transformations/analysis'
import { LiquidDetails } from '../LiquidDetails'
import { LiquidsLabwareDetailsModal } from '/app/organisms/LiquidsLabwareDetailsModal'
import {
  MOCK_LABWARE_INFO_BY_LIQUID_ID,
  MOCK_PROTOCOL_ANALYSIS,
} from '../fixtures'

import type { ComponentProps } from 'react'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

vi.mock('/app/transformations/analysis')
vi.mock('/app/transformations/commands')
vi.mock('/app/organisms/LiquidsLabwareDetailsModal')

const render = (props: ComponentProps<typeof LiquidDetails>) => {
  return renderWithProviders(<LiquidDetails {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LiquidDetails', () => {
  let props: ComponentProps<typeof LiquidDetails>
  beforeEach(() => {
    props = {
      commands: (MOCK_PROTOCOL_ANALYSIS as CompletedProtocolAnalysis).commands,
      labwareByLiquidId: MOCK_LABWARE_INFO_BY_LIQUID_ID,
      runId: RUN_ID_1,
      liquid: {
        id: '0',
        displayName: 'mock liquid 1',
        description: 'mock sample',
        displayColor: '#ff4888',
      },
    }
    vi.mocked(getVolumePerWell).mockReturnValue(50)
    vi.mocked(getLocationInfoNames).mockReturnValue({
      slotName: '4',
      labwareName: 'mock labware name',
      labwareQuantity: 1,
    })
    vi.mocked(LiquidsLabwareDetailsModal).mockReturnValue(<div>mock modal</div>)
  })

  it('renders the total volume of the liquid, sample display name, clicking on arrow renders the modal', () => {
    render(props)
    screen.getByText('4')
    screen.getByText('mock labware name')
    screen.getByText('Location')
    screen.getByText('Labware name')
    screen.getByText('Individual well volume')
    screen.getByText('50 µL')
    fireEvent.click(screen.getByLabelText('LiquidDetails_0'))
    screen.getByText('mock modal')
  })
  it('renders variable well amount if no specific volume per well', () => {
    vi.mocked(getVolumePerWell).mockReturnValue(null)
    render(props)
    screen.getByText('Variable well amount')
  })
})
