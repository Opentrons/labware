import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import { DraggableSidebar } from '../DraggableSidebar'

import type { ComponentProps } from 'react'

vi.mock('../../../../step-forms/selectors')
vi.mock('../../../../ui/steps/selectors')
vi.mock('../../../../feature-flags/selectors')
vi.mock('../Timeline/DraggableSteps')
vi.mock('../Timeline/PresavedStep')
vi.mock('../Timeline/AddStepButton')

const mockSetTargetWidth = vi.fn()

const render = (props: ComponentProps<typeof DraggableSidebar>) => {
  return renderWithProviders(<DraggableSidebar {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DraggableSidebar', () => {
  let props: ComponentProps<typeof DraggableSidebar>
  beforeEach(() => {
    props = {
      setTargetWidth: mockSetTargetWidth,
    }
  })

  it('renders initial timeline toolbox', () => {
    render(props)
    screen.getByText('Timeline')
    screen.getByText('Starting deck')
    screen.getByText('Ending deck')
  })

  // ToDo (kk: 2024/12/12): Add more tests
})
