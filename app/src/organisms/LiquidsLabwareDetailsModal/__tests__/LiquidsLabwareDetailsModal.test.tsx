import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { LabwareRender } from '@opentrons/components'
import { parseLiquidsInLoadOrder } from '@opentrons/shared-data'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getIsOnDevice } from '/app/redux/config'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { mockDefinition } from '/app/redux/custom-labware/__fixtures__'
import {
  getLocationInfoNames,
  getSlotLabwareDefinition,
} from '/app/transformations/commands'
import {
  getLiquidsByIdForLabware,
  getDisabledWellFillFromLabwareId,
} from '/app/transformations/analysis'
import { LiquidsLabwareDetailsModal } from '../LiquidsLabwareDetailsModal'
import { LiquidDetailCard } from '../LiquidDetailCard'

import type { ComponentProps } from 'react'
import type * as Components from '@opentrons/components'
import type * as SharedData from '@opentrons/shared-data'

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof Components>()
  return {
    ...actualComponents,
    LabwareRender: vi.fn(() => <div>mock LabwareRender</div>),
  }
})
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseLiquidsInLoadOrder: vi.fn(),
  }
})
vi.mock('/app/redux/config')
vi.mock('/app/resources/runs')
vi.mock('/app/transformations/commands')
vi.mock('/app/transformations/analysis')
vi.mock('../LiquidDetailCard')

const render = (props: ComponentProps<typeof LiquidsLabwareDetailsModal>) => {
  return renderWithProviders(<LiquidsLabwareDetailsModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LiquidsLabwareDetailsModal', () => {
  let props: ComponentProps<typeof LiquidsLabwareDetailsModal>
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = function () {}
    props = {
      liquidId: '4',
      labwareId: '123',
      runId: '456',
      closeModal: vi.fn(),
    }
    vi.mocked(getLocationInfoNames).mockReturnValue({
      labwareName: 'mock labware name',
      slotName: '5',
      labwareQuantity: 1,
    })
    vi.mocked(getSlotLabwareDefinition).mockReturnValue(mockDefinition)
    vi.mocked(getLiquidsByIdForLabware).mockReturnValue({
      '4': [
        {
          labwareId: '123',
          volumeByWell: {
            A3: 100,
            A4: 100,
            B3: 100,
            B4: 100,
            C3: 100,
            C4: 100,
            D3: 100,
            D4: 100,
          },
        },
      ],
    })
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue([
      {
        id: '4',
        displayName: 'liquid 4',
        description: 'saliva',
        displayColor: '#B925FF',
      },
    ])
    vi.mocked(LiquidDetailCard).mockReturnValue(<div></div>)
    vi.mocked(getDisabledWellFillFromLabwareId).mockReturnValue({})
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(
      {} as SharedData.CompletedProtocolAnalysis
    )
    vi.mocked(getIsOnDevice).mockReturnValue(false)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should render slot name and labware name', () => {
    render(props)
    screen.getByRole('heading', { name: 'Slot Number' })
    screen.getByText('5')
    screen.getByRole('heading', { name: 'Labware name' })
    screen.getAllByText('mock labware name')
  })
  it('should render LiquidDetailCard when correct props are passed', () => {
    render(props)
    expect(vi.mocked(LiquidDetailCard)).toHaveBeenCalledWith(
      expect.objectContaining({ liquidId: '4' }),
      expect.any(Object)
    )
    screen.getByText(nestedTextMatcher('mock LiquidDetailCard'))
  })
  it.only('should render labware render with well fill', () => {
    vi.mocked(getDisabledWellFillFromLabwareId).mockReturnValue({
      C1: '#ff4888',
      C2: '#ff4888',
    })
    render(props)
    expect(vi.mocked(LabwareRender)).toHaveBeenCalledWith(
      expect.objectContaining({
        wellFill: {
          C1: '#ff4888',
          C2: '#ff4888',
        },
      }),
      expect.any(Object)
    )
  })
  it('should render labware render with well fill on odd', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    vi.mocked(getDisabledWellFillFromLabwareId).mockReturnValue({
      C1: '#ff4888',
      C2: '#ff4888',
    })
    render(props)
    screen.getByText('mock labware render with well fill')
    expect(vi.mocked(LabwareRender)).toHaveBeenCalledWith(
      expect.objectContaining({
        wellFill: {
          C1: '#ff4888',
          C2: '#ff4888',
        },
      })
    )
  })
})
