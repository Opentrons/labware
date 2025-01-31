import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { InstrumentsInfo } from '../InstrumentsInfo'

import type { ComponentProps } from 'react'
import type { AdditionalEquipmentEntities } from '@opentrons/step-generation'
import type { PipetteOnDeck } from '../../../step-forms'

const mockSetShowEditInstrumentsModal = vi.fn()
const mockPipettes = [
  {
    mount: 'left',
    id: 'mock-left',
    name: 'p50_single_flex',
    tiprackDefURI: ['opentrons/opentrons_flex_96_tiprack_50ul/1'],
    tiprackLabwareDef: [
      {
        metadata: {
          displayName: 'Opentrons Flex 96 Tip Rack 50 µL',
          displayCategory: 'tipRack',
          displayVolumeUnits: 'µL',
          tags: [],
        },
      } as any,
    ],
  } as PipetteOnDeck,
  {
    mount: 'right',
    id: 'mock-right',
    name: 'p50_multi_flex',
    tiprackDefURI: ['opentrons/opentrons_flex_96_filtertiprack_50ul/1'],
    tiprackLabwareDef: [
      {
        metadata: {
          displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
          displayCategory: 'tipRack',
          displayVolumeUnits: 'µL',
          tags: [],
        },
      } as any,
    ],
  } as PipetteOnDeck,
]

const mock96Pipette = [
  {
    mount: 'left',
    id: 'mock-96channels',
    name: 'p1000_96',
    tiprackDefURI: ['opentrons/opentrons_flex_96_filtertiprack_1000ul/1'],
    tiprackLabwareDef: [
      {
        metadata: {
          displayName: 'Opentrons Flex 96 Filter Tip Rack 1000 µL',
          displayCategory: 'tipRack',
          displayVolumeUnits: 'µL',
          tags: [],
        },
      } as any,
    ],
  } as PipetteOnDeck,
]

const mockAdditionalEquipment = {
  'mock:gripper': {
    name: 'gripper',
    id: 'mock:gripper',
  },
} as AdditionalEquipmentEntities

const render = (props: ComponentProps<typeof InstrumentsInfo>) => {
  return renderWithProviders(<InstrumentsInfo {...props} />, {
    i18nInstance: i18n,
  })
}

describe('InstrumentsInfo', () => {
  let props: ComponentProps<typeof InstrumentsInfo>

  beforeEach(() => {
    props = {
      robotType: FLEX_ROBOT_TYPE,
      pipettesOnDeck: [],
      additionalEquipment: {},
      setShowEditInstrumentsModal: mockSetShowEditInstrumentsModal,
    }
  })

  it('should render text', () => {
    render(props)
    screen.getByText('Instruments')
    screen.getByText('Robot type')
    screen.getAllByText('Opentrons Flex')
    screen.getByText('Left Mount')
    screen.getByText('Right Mount')
    screen.getByText('Extension Mount')
    expect(screen.getAllByText('N/A').length).toBe(3)
  })

  it('should render instruments info', () => {
    props = {
      ...props,
      pipettesOnDeck: mockPipettes,
      additionalEquipment: mockAdditionalEquipment,
    }
    render(props)

    screen.getByText('Flex 1-Channel 50 μL')
    screen.getByText('Opentrons Flex 96 Tip Rack 50 µL')
    screen.getByText('Flex 8-Channel 50 μL')
    screen.getByText('Opentrons Flex 96 Filter Tip Rack 50 µL')
    screen.getByText('Opentrons Flex Gripper')
  })

  it('should call mock function when clicking edit text button', () => {
    render(props)
    fireEvent.click(screen.getByText('Edit'))
    expect(mockSetShowEditInstrumentsModal).toHaveBeenCalled()
  })

  it('should render left + right mount when 96 channels is selected', () => {
    props = {
      ...props,
      pipettesOnDeck: mock96Pipette,
    }
    render(props)
    screen.getByText('Left + Right Mount')
  })
})
