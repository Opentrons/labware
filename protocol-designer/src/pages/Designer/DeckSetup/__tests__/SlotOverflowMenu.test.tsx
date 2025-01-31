import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { fixture96Plate } from '@opentrons/shared-data'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import {
  deleteContainer,
  duplicateLabware,
  openIngredientSelector,
} from '../../../../labware-ingred/actions'
import { EditNickNameModal } from '../../../../organisms'
import { useKitchen } from '../../../../organisms/Kitchen/hooks'
import { deleteModule } from '../../../../step-forms/actions'
import { deleteDeckFixture } from '../../../../step-forms/actions/additionalItems'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import { selectors as labwareIngredSelectors } from '../../../../labware-ingred/selectors'
import { getNextAvailableDeckSlot } from '../../../../labware-ingred/utils'
import { SlotOverflowMenu } from '../SlotOverflowMenu'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

const mockNavigate = vi.fn()

vi.mock('../../../../top-selectors/labware-locations')
vi.mock('../../../../step-forms/actions')
vi.mock('../../../../labware-ingred/actions')
vi.mock('../../../../labware-ingred/selectors')
vi.mock('../../../../step-forms/actions/additionalItems')
vi.mock('../../../../organisms')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../labware-ingred/utils')
vi.mock('../../../../organisms/Kitchen/hooks')
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof SlotOverflowMenu>) => {
  return renderWithProviders(<SlotOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_STAGING_AREA_ID = 'MOCK_STAGING_AREA_ID'
const MOCK_MAKE_SNACKBAR = vi.fn()

describe('SlotOverflowMenu', () => {
  let props: ComponentProps<typeof SlotOverflowMenu>

  beforeEach(() => {
    props = {
      location: 'D3',
      setShowMenuList: vi.fn(),
      addEquipment: vi.fn(),
    }

    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {
        labId: {
          slot: 'D3',
          id: 'labId',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
        },
        lab2: {
          slot: 'labId',
          id: 'labId2',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
        },
      },
      pipettes: {},
      modules: {
        mod: {
          model: 'heaterShakerModuleV1',
          type: 'heaterShakerModuleType',
          id: 'modId',
          slot: 'D3',
          moduleState: {} as any,
        },
      },
      additionalEquipmentOnDeck: {
        fixture: {
          name: 'stagingArea',
          id: MOCK_STAGING_AREA_ID,
          location: 'cutoutD3',
        },
      },
    })
    vi.mocked(EditNickNameModal).mockReturnValue(
      <div>mockEditNickNameModal</div>
    )
    vi.mocked(labwareIngredSelectors.getLiquidsByLabwareId).mockReturnValue({})
    vi.mocked(getNextAvailableDeckSlot).mockReturnValue('A1')
    vi.mocked(useKitchen).mockReturnValue({
      makeSnackbar: MOCK_MAKE_SNACKBAR,
      eatToast: vi.fn(),
      bakeToast: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should renders all buttons as enabled and clicking on them calls ctas', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit hardware/labware' })
    )
    expect(props.addEquipment).toHaveBeenCalled()
    expect(props.setShowMenuList).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Rename labware' }))
    screen.getByText('mockEditNickNameModal')
    fireEvent.click(screen.getByRole('button', { name: 'Add liquid' }))
    expect(mockNavigate).toHaveBeenCalled()
    expect(vi.mocked(openIngredientSelector)).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate labware' }))
    expect(vi.mocked(duplicateLabware)).toHaveBeenCalled()
    expect(props.setShowMenuList).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Clear slot' }))
    expect(vi.mocked(deleteContainer)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deleteModule)).toHaveBeenCalled()
    expect(vi.mocked(deleteDeckFixture)).toHaveBeenCalled()
    expect(props.setShowMenuList).toHaveBeenCalled()
  })
  it('renders 3 buttons when there is nothing on the slot', () => {
    props.location = 'A1'
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'Add hardware/labware' })
    )
    expect(props.addEquipment).toHaveBeenCalled()
    expect(props.setShowMenuList).toHaveBeenCalled()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Add liquid' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear slot' })).toBeDisabled()
    screen.getByTestId('divider')
  })
  it('renders Edit liquid button when there is liquid on the labware', () => {
    vi.mocked(labwareIngredSelectors.getLiquidsByLabwareId).mockReturnValue({
      labId2: { well1: { '0': { volume: 10 } } },
    })
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit hardware/labware' })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit liquid' }))
    expect(mockNavigate).toHaveBeenCalled()
    expect(vi.mocked(openIngredientSelector)).toHaveBeenCalled()
  })
  it('deletes the staging area slot and all labware and modules on top of it', () => {
    vi.mocked(labwareIngredSelectors.getLiquidsByLabwareId).mockReturnValue({
      labId2: { well1: { '0': { volume: 10 } } },
    })
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Clear slot' }))

    expect(vi.mocked(deleteDeckFixture)).toHaveBeenCalledOnce()
    expect(vi.mocked(deleteDeckFixture)).toHaveBeenCalledWith(
      MOCK_STAGING_AREA_ID
    )
    expect(vi.mocked(deleteContainer)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deleteContainer)).toHaveBeenNthCalledWith(1, {
      labwareId: 'labId',
    })
    expect(vi.mocked(deleteContainer)).toHaveBeenNthCalledWith(2, {
      labwareId: 'labId2',
    })
    expect(vi.mocked(deleteModule)).toHaveBeenCalledOnce()
    expect(vi.mocked(deleteModule)).toHaveBeenCalledWith('modId')
  })

  it('renders snackbar if duplicate is clicked and the deck is full', () => {
    vi.mocked(getNextAvailableDeckSlot).mockReturnValue(null)
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate labware' }))
    expect(MOCK_MAKE_SNACKBAR).toHaveBeenCalled()
  })
})
