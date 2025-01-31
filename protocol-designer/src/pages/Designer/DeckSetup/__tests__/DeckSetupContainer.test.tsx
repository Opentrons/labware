import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { FlexTrash } from '@opentrons/components'

import { renderWithProviders } from '../../../../__testing-utils__'

import { selectors } from '../../../../labware-ingred/selectors'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../../ui/steps/selectors'
import { getSelectedTerminalItemId } from '../../../../ui/steps'
import { getDisableModuleRestrictions } from '../../../../feature-flags/selectors'
import { getRobotType } from '../../../../file-data/selectors'
import { DeckSetupDetails } from '../DeckSetupDetails'
import { DeckSetupTools } from '../DeckSetupTools'
import { DeckSetupContainer } from '../DeckSetupContainer'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('../../../../ui/steps/selectors')
vi.mock('../../../../top-selectors/labware-locations')
vi.mock('../../../../feature-flags/selectors')
vi.mock('../DeckSetupTools')
vi.mock('../DeckSetupDetails')
vi.mock('../../../../ui/steps')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    FlexTrash: vi.fn(),
  }
})

const render = () => {
  return renderWithProviders(<DeckSetupContainer tab="startingDeck" />)[0]
}

describe('DeckSetupContainer', () => {
  beforeEach(() => {
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: 'D3',
      cutout: 'cutoutD3',
    })
    vi.mocked(getSelectedDropdownItem).mockReturnValue([
      { id: null, text: null },
    ])
    vi.mocked(getHoveredDropdownItem).mockReturnValue({ id: null, text: null })
    vi.mocked(DeckSetupTools).mockReturnValue(<div>mock DeckSetupTools</div>)
    vi.mocked(DeckSetupDetails).mockReturnValue(
      <div>mock DeckSetupDetails</div>
    )
    vi.mocked(FlexTrash).mockReturnValue(<div>mock FlexTrash</div>)
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getDisableModuleRestrictions).mockReturnValue(false)
    vi.mocked(getSelectedTerminalItemId).mockReturnValue('__initial_setup__')
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
  })
  it('renders the decksetupTools when slot and cutout are not null', () => {
    render()
    screen.getByText('mock DeckSetupDetails')
    screen.getByText('mock DeckSetupTools')
  })
  it('renders no deckSetupTools when slot and cutout are null', () => {
    vi.mocked(selectors.getZoomedInSlot).mockReturnValue({
      slot: null,
      cutout: null,
    })
    render()
    screen.getByText('mock DeckSetupDetails')
  })
  it('renders a flex trash when a trash bin is attached', () => {
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {
        trash: { name: 'trashBin', location: 'cutoutA3', id: 'mockId' },
      },
      pipettes: {},
    })
    render()
    screen.getByText('mock FlexTrash')
  })
  it('does not render a flex trash if the zoomed in slot cutout is the same location', () => {
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {
        trash: { name: 'trashBin', location: 'cutoutD3', id: 'mockId' },
      },
      pipettes: {},
    })
    render()
    expect(screen.queryByText('mock FlexTrash')).not.toBeInTheDocument()
  })
})
