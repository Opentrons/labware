import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__testing-utils__'
import {
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_V1,
  fixture24Tuberack,
  getDeckDefFromRobotType,
} from '@opentrons/shared-data'
import { Module } from '@opentrons/components'
import { selectors } from '../../../../labware-ingred/selectors'
import { getInitialDeckSetup } from '../../../../step-forms/selectors'
import { getCustomLabwareDefsByURI } from '../../../../labware-defs/selectors'
import { getDesignerTab } from '../../../../file-data/selectors'
import { LabwareOnDeck } from '../../../../organisms'
import { FixtureRender } from '../FixtureRender'
import { SelectedHoveredItems } from '../SelectedHoveredItems'

import type { ComponentProps } from 'react'
import type * as OpentronsComponents from '@opentrons/components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../../../../file-data/selectors')
vi.mock('../../../../step-forms/selectors')
vi.mock('../FixtureRender')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../labware-defs/selectors')
vi.mock('../../../../organisms')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    Module: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof SelectedHoveredItems>) => {
  return renderWithProviders(<SelectedHoveredItems {...props} />)[0]
}

describe('SelectedHoveredItems', () => {
  let props: ComponentProps<typeof SelectedHoveredItems>

  beforeEach(() => {
    props = {
      deckDef: getDeckDefFromRobotType(FLEX_ROBOT_TYPE),
      robotType: FLEX_ROBOT_TYPE,
      hoveredLabware: null,
      hoveredModule: null,
      hoveredFixture: null,
      slotPosition: [0, 0, 0],
    }
    vi.mocked(getDesignerTab).mockReturnValue('startingDeck')
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
      labware: {
        labware: {
          id: 'mockId',
          def: fixture24Tuberack as LabwareDefinition2,
          labwareDefURI: 'fixture/fixture_universal_flat_bottom_adapter/1',
          slot: 'D3',
        },
      },
    })
    vi.mocked(LabwareOnDeck).mockReturnValue(<div>mock LabwareOnDeck</div>)
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: 'trashBin',
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    vi.mocked(getCustomLabwareDefsByURI).mockReturnValue({})
    vi.mocked(FixtureRender).mockReturnValue(<div>mock FixtureRender</div>)
    vi.mocked(Module).mockReturnValue(<div>mock Module</div>)
  })
  it('renders a selected fixture by itself', () => {
    render(props)
    screen.getByText('mock FixtureRender')
    expect(screen.queryByText('mock Module')).not.toBeInTheDocument()
  })
  it('renders a selected fixture with a selected labware', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: 'fixture/fixture_universal_flat_bottom_adapter/1',
      selectedNestedLabwareDefUri: null,
      selectedFixture: 'trashBin',
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    screen.getByText('mock FixtureRender')
    screen.getByText('mock LabwareOnDeck')
    expect(screen.queryByText('mock Module')).not.toBeInTheDocument()
    screen.getByText('Fixture Opentrons Universal Flat Heater-Shaker Adapter')
  })
  it('renders a selected module', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: HEATERSHAKER_MODULE_V1,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    screen.getByText('mock Module')
    expect(screen.queryByText('mock FixtureRender')).not.toBeInTheDocument()
    screen.getByText('Heater-Shaker Module GEN1')
  })
  it('renders a selected module and a selected labware', () => {
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: 'fixture/fixture_universal_flat_bottom_adapter/1',
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: HEATERSHAKER_MODULE_V1,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    screen.getByText('mock Module')
    expect(screen.queryByText('mock FixtureRender')).not.toBeInTheDocument()
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Fixture Opentrons Universal Flat Heater-Shaker Adapter')
  })
  it('renders selected fixture and both labware and nested labware', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
      labware: {
        labware: {
          id: 'mockId',
          def: fixture24Tuberack as LabwareDefinition2,
          labwareDefURI: 'fixture/fixture_universal_flat_bottom_adapter/1',
          slot: 'D3',
        },
        labware2: {
          id: 'mockId2',
          def: fixture24Tuberack as LabwareDefinition2,
          labwareDefURI: 'fixture/fixture_universal_flat_bottom_adapter/1',
          slot: 'mockId',
        },
      },
    })
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: 'fixture/fixture_universal_flat_bottom_adapter/1',
      selectedNestedLabwareDefUri:
        'fixture/fixture_universal_flat_bottom_adapter/1',
      selectedFixture: 'trashBin',
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    render(props)
    screen.getByText('mock FixtureRender')
    expect(screen.getAllByText('mock LabwareOnDeck')).toHaveLength(2)
    expect(
      screen.getAllByText(
        'Fixture Opentrons Universal Flat Heater-Shaker Adapter'
      )
    ).toHaveLength(3)
  })
  it('renders nothing when there is a hovered module but selected fixture', () => {
    props.hoveredModule = HEATERSHAKER_MODULE_V1
    render(props)
    expect(screen.queryByText('mock FixtureRender')).not.toBeInTheDocument()
  })
})
