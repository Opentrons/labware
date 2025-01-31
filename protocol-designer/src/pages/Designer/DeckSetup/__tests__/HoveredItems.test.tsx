import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__testing-utils__'
import {
  FLEX_ROBOT_TYPE,
  TEMPERATURE_MODULE_V2,
  getDeckDefFromRobotType,
} from '@opentrons/shared-data'
import { LabwareRender, Module } from '@opentrons/components'
import { selectors } from '../../../../labware-ingred/selectors'
import { getCustomLabwareDefsByURI } from '../../../../labware-defs/selectors'
import { getDesignerTab } from '../../../../file-data/selectors'
import { FixtureRender } from '../FixtureRender'
import { HoveredItems } from '../HoveredItems'

import type { ComponentProps } from 'react'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('../FixtureRender')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../labware-defs/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    LabwareRender: vi.fn(),
    Module: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof HoveredItems>) => {
  return renderWithProviders(<HoveredItems {...props} />)[0]
}

describe('HoveredItems', () => {
  let props: ComponentProps<typeof HoveredItems>

  beforeEach(() => {
    props = {
      hoveredSlotPosition: [0, 0, 0],
      deckDef: getDeckDefFromRobotType(FLEX_ROBOT_TYPE),
      robotType: FLEX_ROBOT_TYPE,
      hoveredLabware: null,
      hoveredModule: null,
      hoveredFixture: 'trashBin',
    }
    vi.mocked(selectors.getZoomedInSlotInfo).mockReturnValue({
      selectedLabwareDefUri: null,
      selectedNestedLabwareDefUri: null,
      selectedFixture: null,
      selectedModuleModel: null,
      selectedSlot: { slot: 'D3', cutout: 'cutoutD3' },
    })
    vi.mocked(getCustomLabwareDefsByURI).mockReturnValue({})
    vi.mocked(FixtureRender).mockReturnValue(<div>mock FixtureRender</div>)
    vi.mocked(LabwareRender).mockReturnValue(<div>mock LabwareRender</div>)
    vi.mocked(Module).mockReturnValue(<div>mock Module</div>)
    vi.mocked(getDesignerTab).mockReturnValue('startingDeck')
  })
  it('renders a hovered fixture', () => {
    render(props)
    screen.getByText('mock FixtureRender')
  })
  it('renders a hovered labware', () => {
    props.hoveredFixture = null
    props.hoveredLabware = 'fixture/fixture_universal_flat_bottom_adapter/1'
    render(props)
    screen.getByText('mock LabwareRender')
    screen.getByText('Fixture Opentrons Universal Flat Heater-Shaker Adapter')
  })
  it('renders a hovered module', () => {
    props.hoveredFixture = null
    props.hoveredModule = TEMPERATURE_MODULE_V2
    render(props)
    screen.getByText('mock Module')
    screen.getByText('Temperature Module GEN2')
  })
})
