import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE, fixture12Trough } from '@opentrons/shared-data'
import { screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { getRobotType } from '../../../file-data/selectors'
import { selectors } from '../../../labware-ingred/selectors'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { getAllWellContentsForActiveItem } from '../../../top-selectors/well-contents'
import { OffDeckThumbnail } from '../OffdeckThumbnail'

import type { ComponentProps } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type * as Components from '@opentrons/components'

vi.mock('../../../top-selectors/well-contents')
vi.mock('../../../labware-ingred/selectors')
vi.mock('../../../step-forms/selectors')
vi.mock('../../../file-data/selectors')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof Components>()
  return {
    ...actual,
    LabwareRender: () => <div>mock LabwareRender</div>,
  }
})

const render = (props: ComponentProps<typeof OffDeckThumbnail>) => {
  return renderWithProviders(<OffDeckThumbnail {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('OffDeckThumbnail', () => {
  let props: ComponentProps<typeof OffDeckThumbnail>

  beforeEach(() => {
    props = {
      hover: null,
      setHover: vi.fn(),
    }
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
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
  })

  it('renders off-deck overview with 1 labware', () => {
    render(props)
    screen.getByText('OFF-DECK LABWARE')
    screen.getByText('mock LabwareRender')
  })
  it('renders the empty state with no off-deck labware', () => {
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
      labware: {},
    })
    render(props)
    screen.getByText('No off-deck labware added')
  })
})
