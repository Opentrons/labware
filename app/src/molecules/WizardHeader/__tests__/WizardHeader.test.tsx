import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { getIsOnDevice } from '/app/redux/config'
import { StepMeter } from '/app/atoms/StepMeter'
import { WizardHeader } from '..'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

vi.mock('/app/atoms/StepMeter')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof WizardHeader>) => {
  return renderWithProviders(<WizardHeader {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('WizardHeader', () => {
  let props: ComponentProps<typeof WizardHeader>

  beforeEach(() => {
    props = {
      title: 'Tip Length Calibrations',
      totalSteps: 5,
      onExit: vi.fn(),
      currentStep: 1,
    }
    vi.mocked(StepMeter).mockReturnValue(<div>step meter</div>)
    vi.mocked(getIsOnDevice).mockReturnValue(false)
  })

  it('renders correct information with step count visible and pressing on button calls props', () => {
    render(props)
    screen.getByText('Tip Length Calibrations')
    const exit = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exit)
    expect(props.onExit).toHaveBeenCalled()
    screen.getByText('step meter')
    screen.getByText('Step 1 / 5')
  })

  it('renders correct information when on device display is true', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByText('Tip Length Calibrations')
    const exit = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exit)
    expect(props.onExit).toHaveBeenCalled()
    screen.getByText('step meter')
    screen.getByText('Step 1 / 5')
  })

  it('renders exit button as disabled when isDisabled is true', () => {
    props = {
      ...props,
      exitDisabled: true,
    }
    render(props)
    screen.getByText('Tip Length Calibrations')
    const exit = screen.getByRole('button', { name: 'Exit' })
    expect(exit).toBeDisabled()
  })

  it('renders correct information with no step count visible due to currentStep = 0', () => {
    props = {
      ...props,
      currentStep: 0,
    }

    render(props)
    screen.getByText('Tip Length Calibrations')
    screen.getByRole('button', { name: 'Exit' })
    expect(screen.queryByText('Step 0 / 5')).not.toBeInTheDocument()
  })

  it('renders correct information with no step count visible due to error state', () => {
    props = {
      ...props,
      currentStep: null,
    }

    render(props)
    screen.getByText('Tip Length Calibrations')
    screen.getByRole('button', { name: 'Exit' })
    expect(screen.queryByText('Step 1 / 5')).not.toBeInTheDocument()
  })
})
