import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import {
  parseLabwareInfoByLiquidId,
  parseLiquidsInLoadOrder,
} from '@opentrons/shared-data'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_EXPAND_LIQUID_SETUP_ROW,
  ANALYTICS_OPEN_LIQUID_LABWARE_DETAIL_MODAL,
} from '/app/redux/analytics'
import { useIsFlex } from '/app/redux-resources/robots'
import { getLocationInfoNames } from '/app/transformations/commands'
import { SetupLiquidsList } from '../SetupLiquidsList'
import {
  getTotalVolumePerLiquidId,
  getVolumePerWell,
} from '/app/transformations/analysis'
import { LiquidsLabwareDetailsModal } from '/app/organisms/LiquidsLabwareDetailsModal'
import { useNotifyRunQuery } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type * as SharedData from '@opentrons/shared-data'

const MOCK_LIQUIDS_IN_LOAD_ORDER = [
  {
    id: '0',
    displayName: 'mock liquid 1',
    description: 'mock sample',
    displayColor: '#ff4888',
  },
  {
    id: '1',
    displayName: 'mock liquid 2',
    description: 'another mock sample',
    displayColor: '#ff8999',
  },
]
const MOCK_LABWARE_INFO_BY_LIQUID_ID = {
  '0': [
    {
      labwareId: '123',
    },
  ],
  '1': [
    {
      labwareId: '234',
    },
  ],
}

vi.mock('/app/transformations/analysis')
vi.mock('/app/transformations/commands')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/organisms/LiquidsLabwareDetailsModal')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseLabwareInfoByLiquidId: vi.fn(),
    parseLiquidsInLoadOrder: vi.fn(),
  }
})
vi.mock('/app/redux/analytics')
vi.mock('/app/resources/runs')

const render = (props: ComponentProps<typeof SetupLiquidsList>) => {
  return renderWithProviders(<SetupLiquidsList {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEvent: Mock

describe('SetupLiquidsList', () => {
  let props: ComponentProps<typeof SetupLiquidsList>
  beforeEach(() => {
    props = { runId: '123', robotName: 'test_flex' }
    vi.mocked(getTotalVolumePerLiquidId).mockReturnValue(400)
    vi.mocked(useIsFlex).mockReturnValue(false)
    vi.mocked(getVolumePerWell).mockReturnValue(200)
    vi.mocked(getLocationInfoNames).mockReturnValue({
      labwareName: 'mock labware name',
      slotName: '4',
      labwareQuantity: 1,
    })
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue(
      MOCK_LIQUIDS_IN_LOAD_ORDER
    )
    vi.mocked(parseLabwareInfoByLiquidId).mockReturnValue(
      MOCK_LABWARE_INFO_BY_LIQUID_ID as any
    )
    when(vi.mocked(LiquidsLabwareDetailsModal))
      .calledWith(
        expect.objectContaining({ labwareId: '123', liquidId: '0' }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>Mock liquids labware details modal</div>)
    vi.mocked(useNotifyRunQuery).mockReturnValue({} as any)
  })

  it('renders the table headers', () => {
    render(props)
    screen.getByText('Liquid information')
    screen.getByText('Total volume')
  })
  it('renders the total volume of the liquid, sample display name, and description', () => {
    render(props)
    screen.getAllByText(nestedTextMatcher('400.0 µL'))
    screen.getByText('mock liquid 1')
    screen.getByText('mock sample')
    screen.getByText('mock liquid 2')
    screen.getByText('another mock sample')
  })

  it('renders slot and labware info when clicking a liquid item', () => {
    render(props)
    const row = screen.getByText('mock liquid 1')
    fireEvent.click(row)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_EXPAND_LIQUID_SETUP_ROW,
      properties: {},
    })
    screen.getByText('Location')
    screen.getByText('Labware name')
    screen.getByText('Individual well volume')
    screen.getByText('200 µL')
    screen.getByText('4')
    screen.getByText('mock labware name')
  })

  it('opens the modal with correct props when a line item is clicked', () => {
    render(props)
    const row = screen.getByText('mock liquid 1')
    fireEvent.click(row)
    const subRow = screen.getByText('mock labware name')
    fireEvent.click(subRow)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_OPEN_LIQUID_LABWARE_DETAIL_MODAL,
      properties: {},
    })
    screen.getByText('Mock liquids labware details modal')
  })
})
