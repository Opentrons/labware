import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE, fixture12Trough } from '@opentrons/shared-data'
import { screen } from '@testing-library/react'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import { selectors } from '../../../../labware-ingred/selectors'
import { getRobotType } from '../../../../file-data/selectors'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../../ui/steps/selectors'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import { getAllWellContentsForActiveItem } from '../../../../top-selectors/well-contents'
import { OffDeckDetails } from '../OffDeckDetails'
import { HighlightOffdeckSlot } from '../HighlightOffdeckSlot'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type * as Components from '@opentrons/components'

vi.mock('../../../../ui/steps/selectors')
vi.mock('../HighlightOffdeckSlot')
vi.mock('../../../../top-selectors/labware-locations')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../top-selectors/well-contents')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof Components>()
  return {
    ...actual,
    LabwareRender: () => <div>mock LabwareRender</div>,
  }
})

const render = (props: ComponentProps<typeof OffDeckDetails>) => {
  return renderWithProviders(<OffDeckDetails {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('OffDeckDetails', () => {
  let props: ComponentProps<typeof OffDeckDetails>

  beforeEach(() => {
    props = {
      tab: 'startingDeck',
      addLabware: vi.fn(),
    }
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
      labware: {
        labware: {
          id: 'mockId',
          def: fixture12Trough as LabwareDefinition2,
          labwareDefURI: 'mockDefUri',
          slot: 'offDeck',
        },
      },
    })
    vi.mocked(selectors.getLiquidDisplayColors).mockReturnValue([])
    vi.mocked(getAllWellContentsForActiveItem).mockReturnValue({})
    vi.mocked(HighlightOffdeckSlot).mockReturnValue(
      <div>Highlight Offdeck Slot</div>
    )
    vi.mocked(getSelectedDropdownItem).mockReturnValue([])
    vi.mocked(getHoveredDropdownItem).mockReturnValue({ id: null, text: null })
  })

  it('renders off-deck overview with 1 labware', () => {
    render(props)
    screen.getByText('OFF-DECK LABWARE')
    screen.getByText('mock LabwareRender')
    screen.getByText('Add labware')
    expect(screen.getAllByText('Highlight Offdeck Slot')).toHaveLength(2)
  })
})
