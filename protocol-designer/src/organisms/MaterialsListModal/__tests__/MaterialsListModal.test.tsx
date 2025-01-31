import { describe, it, beforeEach, vi, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { i18n } from '../../../assets/localization'
import { selectors as labwareIngredSelectors } from '../../../labware-ingred/selectors'
import { renderWithProviders } from '../../../__testing-utils__'
import { getRobotType } from '../../../file-data/selectors'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { MaterialsListModal } from '..'

import type { ComponentProps } from 'react'
import type { InfoScreen } from '@opentrons/components'
import type { LabwareOnDeck, ModuleOnDeck } from '../../../step-forms'
import type { FixtureInList } from '..'

vi.mock('../../../step-forms/selectors')
vi.mock('../../../labware-ingred/selectors')
vi.mock('../../../file-data/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof InfoScreen>()
  return {
    ...actual,
    InfoScreen: () => <div>mock InfoScreen</div>,
  }
})

const mockSetShowMaterialsListModal = vi.fn()

const mockHardWare = [
  {
    id: 'mockHardware',
    model: 'temperatureModuleV2',
    moduleState: {
      type: 'temperatureModuleType',
      status: 'TEMPERATURE_DEACTIVATED',
      targetTemperature: null,
    },
    slot: 'C1',
    type: 'temperatureModuleType',
  },
] as ModuleOnDeck[]

const mockFixture = [
  { location: 'cutoutB3', name: 'trashBin', id: 'mockId:trashBin' },
] as FixtureInList[]

const mockLabware = [
  {
    def: {
      metadata: {
        displayCategory: 'tipRack',
        displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
        displayVolumeUnits: 'µL',
        tags: [],
        namespace: 'opentrons',
      } as any,
    },
    id: 'mockLabware',
    labwareDefURI: 'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
    slot: 'D3',
  },
] as LabwareOnDeck[]

const render = (props: ComponentProps<typeof MaterialsListModal>) => {
  return renderWithProviders(<MaterialsListModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('MaterialsListModal', () => {
  let props: ComponentProps<typeof MaterialsListModal>

  beforeEach(() => {
    props = {
      hardware: [],
      fixtures: [],
      labware: [],
      liquids: [],
      setShowMaterialsListModal: mockSetShowMaterialsListModal,
    }
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(labwareIngredSelectors.getLiquidsByLabwareId).mockReturnValue({})
  })

  it('should render render text', () => {
    render(props)
    screen.getByText('Materials list')
    screen.getByText('Deck hardware')
    screen.getByText('Labware')
    screen.getByText('Liquids')
  })

  it('should render InfoScreen component', () => {
    render(props)
    expect(screen.getAllByText('mock InfoScreen').length).toBe(3)
  })

  it('should render hardware info', () => {
    props = {
      ...props,
      hardware: mockHardWare,
      fixtures: mockFixture,
    }
    render(props)
    screen.getByText('C1')
    screen.getByText('Temperature Module GEN2')
    screen.getByText('B3')
    screen.getByText('Trash Bin')
  })
  it('should render labware info', () => {
    props = {
      ...props,
      labware: mockLabware,
    }
    render(props)
    screen.getByText('D3')
    screen.getByText('Opentrons Flex 96 Filter Tip Rack 50 µL')
  })

  it('should render 7,8,10,11 when a robot is ot-2 and a module is tc', () => {
    vi.mocked(getRobotType).mockReturnValue(OT2_ROBOT_TYPE)
    const mockHardwareForOt2 = [
      {
        id: 'mockHardware-tc',
        model: 'thermocyclerModuleV1',
        moduleState: {
          type: 'thermocyclerModuleType',
          blockTargetTemp: null,
          lidTargetTemp: null,
          lidOpen: false,
        },
        slot: '7',
        type: 'thermocyclerModuleType',
      },
    ] as ModuleOnDeck[]
    props = {
      ...props,
      hardware: mockHardwareForOt2,
    }
    render(props)
    screen.getByText('7,8,10,11')
  })

  it('should render liquids info', () => {
    const mockId = 'mockId'
    vi.mocked(labwareIngredSelectors.getLiquidsByLabwareId).mockReturnValue({
      labware1: { well1: { [mockId]: { volume: 10 } } },
    })
    props = {
      ...props,

      liquids: [
        {
          ingredientId: mockId,
          name: 'mockName',
          displayColor: 'mockDisplayColor',
          liquidClass: null,
        },
      ],
    }
    render(props)
    screen.getByText('Liquids')
    screen.getByText('Name')
    screen.getByText('Total Well Volume')
    screen.getByText('mockName')
    screen.getByText('10 uL')
  })
})
