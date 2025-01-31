import { describe, it, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import {
  parseLabwareInfoByLiquidId,
  parseLiquidsInLoadOrder,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RUN_ID_1 } from '/app/resources/runs/__fixtures__'
import { getTotalVolumePerLiquidId } from '/app/transformations/analysis'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { LiquidDetails } from '../LiquidDetails'
import {
  MOCK_LABWARE_INFO_BY_LIQUID_ID,
  MOCK_LIQUIDS_IN_LOAD_ORDER,
  MOCK_PROTOCOL_ANALYSIS,
} from '../fixtures'
import { ProtocolSetupLiquids } from '..'

import type { ComponentProps } from 'react'
import type * as SharedData from '@opentrons/shared-data'

vi.mock('/app/transformations/analysis')
vi.mock('/app/atoms/buttons')
vi.mock('../LiquidDetails')
vi.mock('/app/resources/runs')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseLabwareInfoByLiquidId: vi.fn(),
    parseLiquidsInLoadOrder: vi.fn(),
  }
})

describe('ProtocolSetupLiquids', () => {
  let isConfirmed = false
  const setIsConfirmed = vi.fn((confirmed: boolean) => {
    isConfirmed = confirmed
  })

  const render = (props: ComponentProps<typeof ProtocolSetupLiquids>) => {
    return renderWithProviders(<ProtocolSetupLiquids {...props} />, {
      i18nInstance: i18n,
    })
  }

  let props: ComponentProps<typeof ProtocolSetupLiquids>
  beforeEach(() => {
    props = {
      runId: RUN_ID_1,
      setSetupScreen: vi.fn(),
      isConfirmed,
      setIsConfirmed,
    }
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue(
      MOCK_LIQUIDS_IN_LOAD_ORDER
    )
    vi.mocked(parseLabwareInfoByLiquidId).mockReturnValue(
      MOCK_LABWARE_INFO_BY_LIQUID_ID as any
    )
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(
      MOCK_PROTOCOL_ANALYSIS as SharedData.CompletedProtocolAnalysis
    )
    vi.mocked(LiquidDetails).mockReturnValue(<div>mock liquid details</div>)
    vi.mocked(getTotalVolumePerLiquidId).mockReturnValue(50)
  })

  it('renders the total volume of the liquid, sample display name, clicking on arrow renders the modal', () => {
    render(props)
    screen.getByText('Liquid name')
    screen.getByText('Total volume')
    screen.getByText('mock liquid 1')
    screen.getByText('mock liquid 2')
    screen.getAllByText('50 µL')
    fireEvent.click(screen.getByLabelText('Liquids_1'))
    screen.getByText('mock liquid details')
  })
})
