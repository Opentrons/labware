import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__testing-utils__'
import { i18n } from '../../../../../assets/localization'
import {
  getOrderedStepIds,
  getUnsavedForm,
} from '../../../../../step-forms/selectors'
import { TerminalItemStep } from '../TerminalItemStep'
import { DraggableSteps } from '../DraggableSteps'
import { PresavedStep } from '../PresavedStep'
import { AddStepButton } from '../AddStepButton'
import { TimelineToolbox } from '../TimelineToolbox'

import type { ComponentProps } from 'react'

vi.mock('../AddStepButton')
vi.mock('../DraggableSteps')
vi.mock('../PresavedStep')
vi.mock('../TerminalItemStep')
vi.mock('../../../../../step-forms/selectors')
const render = (props: ComponentProps<typeof TimelineToolbox>) => {
  return renderWithProviders(<TimelineToolbox {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TimelineToolbox', () => {
  let props: ComponentProps<typeof TimelineToolbox>

  beforeEach(() => {
    props = {
      sidebarWidth: 350,
    }
    vi.mocked(getOrderedStepIds).mockReturnValue(['mock1Step'])
    vi.mocked(getUnsavedForm).mockReturnValue(null)
    vi.mocked(TerminalItemStep).mockReturnValue(
      <div>mock TerminalItemStep</div>
    )
    vi.mocked(DraggableSteps).mockReturnValue(<div>mock DraggableSteps</div>)
    vi.mocked(PresavedStep).mockReturnValue(<div>mock PresavedStep</div>)
    vi.mocked(AddStepButton).mockReturnValue(<div>mock AddStepButton</div>)
  })

  it('renders 2 terminal item steps, a draggable step and presaved step with toolbox title', () => {
    render(props)
    screen.getByText('Timeline')
    screen.getByText('mock AddStepButton')
    screen.getByText('mock PresavedStep')
    screen.getByText('mock DraggableSteps')
    expect(screen.getAllByText('mock TerminalItemStep')).toHaveLength(2)
  })
})
