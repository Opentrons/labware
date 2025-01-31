import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__testing-utils__'
import { i18n } from '../../../../../assets/localization'
import {
  getMultiSelectItemIds,
  actions as stepsActions,
} from '../../../../../ui/steps'
import { analyticsEvent } from '../../../../../analytics/actions'
import {
  getCurrentFormHasUnsavedChanges,
  getCurrentFormIsPresaved,
  getPipetteEntities,
  getSavedStepForms,
  getUnsavedForm,
} from '../../../../../step-forms/selectors'
import {
  hoverOnStep,
  toggleViewSubstep,
} from '../../../../../ui/steps/actions/actions'
import { StepOverflowMenu } from '../StepOverflowMenu'

import type { ComponentProps } from 'react'
import type * as OpentronsComponents from '@opentrons/components'

const mockConfirm = vi.fn()
const mockCancel = vi.fn()
const mockId = 'mockId'
const mockId96 = '96MockId'

vi.mock('../../../../../ui/steps')
vi.mock('../../../../../step-forms/selectors')
vi.mock('../../../../../ui/steps/actions/actions')
vi.mock('../../../../../ui/steps/actions/thunks')
vi.mock('../../../../../steplist/actions')
vi.mock('../../../../../feature-flags/selectors')
vi.mock('../../../../../analytics/actions')
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    useConditionalConfirm: vi.fn(() => ({
      confirm: mockConfirm,
      showConfirmation: true,
      cancel: mockCancel,
    })),
  }
})
const render = (props: ComponentProps<typeof StepOverflowMenu>) => {
  return renderWithProviders(<StepOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const moveLiquidStepId = 'mockId'
describe('StepOverflowMenu', () => {
  let props: ComponentProps<typeof StepOverflowMenu>

  beforeEach(() => {
    props = {
      stepId: moveLiquidStepId,
      top: 0,
      menuRootRef: { current: null },
      setOpenedOverflowMenuId: vi.fn(),
      multiSelectItemIds: [],
      handleEdit: vi.fn(),
      confirmDelete: mockConfirm,
      confirmMultiDelete: vi.fn(),
    }
    vi.mocked(getMultiSelectItemIds).mockReturnValue(null)
    vi.mocked(getCurrentFormIsPresaved).mockReturnValue(false)
    vi.mocked(getCurrentFormHasUnsavedChanges).mockReturnValue(false)
    vi.mocked(getUnsavedForm).mockReturnValue(null)
    vi.mocked(getSavedStepForms).mockReturnValue({
      [moveLiquidStepId]: {
        stepType: 'moveLiquid',
        id: moveLiquidStepId,
        pipette: mockId,
      },
    })
    vi.mocked(getPipetteEntities).mockReturnValue({
      [mockId]: {
        name: 'p50_single_flex',
        spec: {} as any,
        id: mockId,
        tiprackLabwareDef: [],
        tiprackDefURI: ['mockDefURI1', 'mockDefURI2'],
      },
    })
  })

  it('renders each button and clicking them calls the action', () => {
    render(props)
    fireEvent.click(screen.getByText('Delete step'))
    expect(mockConfirm).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Duplicate step'))
    expect(vi.mocked(stepsActions.duplicateStep)).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Edit step'))
    fireEvent.click(screen.getByText('View details'))
    expect(vi.mocked(hoverOnStep)).toHaveBeenCalled()
    expect(vi.mocked(toggleViewSubstep)).toHaveBeenCalled()
    expect(vi.mocked(analyticsEvent)).toHaveBeenCalled()
  })

  it('renders the multi select overflow menu', () => {
    render({ ...props, multiSelectItemIds: ['abc', '123'] })
    screen.getByText('Duplicate steps')
    screen.getByText('Delete steps')
  })

  it('should not render view details button if pipette is 96-channel', () => {
    vi.mocked(getSavedStepForms).mockReturnValue({
      [moveLiquidStepId]: {
        stepType: 'moveLiquid',
        id: moveLiquidStepId,
        pipette: mockId96,
      },
    })
    vi.mocked(getPipetteEntities).mockReturnValue({
      [mockId96]: {
        name: 'p1000_96',
        spec: {} as any,
        id: mockId96,
        tiprackLabwareDef: [],
        tiprackDefURI: ['mockDefURI1_96'],
      },
    })
    render(props)
    expect(screen.queryByText('View details')).not.toBeInTheDocument()
  })
})
