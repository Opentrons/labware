import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import type { PipetteModelSpecs } from '@opentrons/shared-data'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { LEFT } from '@opentrons/shared-data'
import { fixtureP10Multi } from '@opentrons/shared-data/pipette/fixtures/name'
import { i18n } from '/app/i18n'
import { mockPipetteInfo } from '/app/redux/pipettes/__fixtures__'
import { Instructions } from '../Instructions'
import { CheckPipettesButton } from '../CheckPipettesButton'

import type { ComponentProps } from 'react'

vi.mock('../CheckPipettesButton')

const render = (props: ComponentProps<typeof Instructions>) => {
  return renderWithProviders(<Instructions {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_ACTUAL_PIPETTE = {
  ...mockPipetteInfo.pipetteSpecs,
  model: 'model',
  tipLength: {
    value: 20,
  },
} as PipetteModelSpecs

describe('Instructions', () => {
  let props: ComponentProps<typeof Instructions>

  beforeEach(() => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: null,
      actualPipette: MOCK_ACTUAL_PIPETTE,
      displayCategory: 'GEN1',
      direction: 'detach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 1,
      attachedWrong: false,
    }
    vi.mocked(CheckPipettesButton).mockReturnValue(
      <div>mock check pipettes button</div>
    )
  })
  it('renders 1st page of the detach pipette flow', () => {
    render(props)
    screen.getByText('Loosen the screws')
    screen.getByText(
      'Using a 2.5 mm screwdriver, loosen the three screws on the back of the pipette that is currently attached.'
    )
    screen.getByAltText('detach-left-single-GEN1-screws')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    const cont = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(goBack)
    expect(props.back).toHaveBeenCalled()
    fireEvent.click(cont)
    expect(props.nextStep).toHaveBeenCalled()
  })

  it('renders 2nd page of the detach pipette flow', () => {
    props = {
      ...props,
      currentStepCount: 2,
    }
    render(props)
    screen.getByText('Remove the pipette')
    screen.getByText(
      'Hold onto the pipette so it does not fall. Disconnect the pipette from the robot by pulling the white connector tab.'
    )
    screen.getByAltText('detach-left-single-GEN1-tab')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.prevStep).toHaveBeenCalled()
    screen.getByText('mock check pipettes button')
  })

  it('renders the attach flow when no pipette is selected', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: null,
      actualPipette: null,
      displayCategory: null,
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 0,
      attachedWrong: false,
    }
    render(props)
    screen.getByText('Choose a pipette to attach')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.back).toHaveBeenCalled()
    expect(screen.queryByText('Continue')).not.toBeInTheDocument()
  })

  it('renders the 1st page of the attach flow when a p10 single gen 1 is selected', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: mockPipetteInfo.pipetteSpecs,
      actualPipette: null,
      displayCategory: 'GEN1',
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 1,
      attachedWrong: false,
    }
    render(props)
    screen.getByText('Insert screws')
    screen.getByText(
      'Using a 2.5 mm screwdriver, insert the the three screws on the back of the pipette.'
    )
    screen.getByText(
      'Starting with screw #1, tighten the screws with a clockwise motion.'
    )
    screen.getByAltText('attach-left-single-GEN1-screws')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.setWantedName).toHaveBeenCalled()
    const cont = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(cont)
    expect(props.nextStep).toHaveBeenCalled()
  })

  it('renders the 2nd page of the attach flow when a p10 single gen 1 is selected', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: mockPipetteInfo.pipetteSpecs,
      actualPipette: null,
      displayCategory: 'GEN1',
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 2,
      attachedWrong: false,
    }
    render(props)
    screen.getByText('Attach the pipette')
    screen.getByText(
      'Push in the white connector tab until you feel it plug into the pipette.'
    )
    screen.getByAltText('attach-left-single-GEN1-tab')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.prevStep).toHaveBeenCalled()
    screen.getByText('mock check pipettes button')
  })

  it('renders the attach flow 1st page when a p10 8 channel is selected', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: fixtureP10Multi,
      actualPipette: null,
      displayCategory: 'GEN1',
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 1,
      attachedWrong: false,
    }
    render(props)
    screen.getByText('Insert screws')
    screen.getByText(
      'Using a 2.5 mm screwdriver, insert the the three screws on the back of the pipette.'
    )
    screen.getByText(
      nestedTextMatcher(
        'Starting with screw #1, loosely tighten the screws with a clockwise motion. You will tighten them fully in a later step.'
      )
    )
    screen.getByAltText('attach-left-multi-GEN1-screws')
    const cont = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(cont)
    expect(props.nextStep).toHaveBeenCalled()
  })

  it('renders the attach flow 2nd page when a p10 8 channel is selected', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: fixtureP10Multi,
      actualPipette: null,
      displayCategory: 'GEN1',
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 2,
      attachedWrong: false,
    }
    render(props)
    screen.getByText('Attach the pipette')
    screen.getByText(
      'Push in the white connector tab until you feel it plug into the pipette.'
    )
    screen.getByAltText('attach-left-multi-GEN1-tab')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.prevStep).toHaveBeenCalled()
    screen.getByText('mock check pipettes button')
  })

  it('renders the attach flow 2nd page when a p10 8 channel is selected and the pipette is wrong', () => {
    props = {
      robotName: 'otie',
      mount: LEFT,
      wantedPipette: fixtureP10Multi,
      actualPipette: null,
      displayCategory: 'GEN1',
      direction: 'attach',
      setWantedName: vi.fn(),
      confirm: vi.fn(),
      back: vi.fn(),
      nextStep: vi.fn(),
      prevStep: vi.fn(),
      currentStepCount: 2,
      attachedWrong: true,
    }
    render(props)
    screen.getByText('Attach the pipette')
    screen.getByText(
      'Push in the white connector tab until you feel it plug into the pipette.'
    )
    screen.getByAltText('attach-left-multi-GEN1-tab')
    const goBack = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(goBack)
    expect(props.prevStep).toHaveBeenCalled()
    screen.getByText('mock check pipettes button')
  })
})
