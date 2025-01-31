import { describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { StepMeter } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof StepMeter>) => {
  return renderWithProviders(<StepMeter {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('StepMeter', () => {
  let props: ComponentProps<typeof StepMeter>

  beforeEach(() => {
    props = {
      totalSteps: 5,
      currentStep: 0,
    }
  })

  it('renders StepMeterBar at 0% width', () => {
    render(props)
    screen.getByTestId('StepMeter_StepMeterContainer')
    const bar = screen.getByTestId('StepMeter_StepMeterBar')
    expect(bar).toHaveStyle('width: 0%')
  })

  it('renders StepMeterBar at 40% width', () => {
    props = {
      ...props,
      currentStep: 2,
    }
    render(props)
    screen.getByTestId('StepMeter_StepMeterContainer')
    const bar = screen.getByTestId('StepMeter_StepMeterBar')
    expect(bar).toHaveStyle('width: 40%')
  })

  //  this case should never happen
  it('renders StepMeterBar at 100% width when currentStep is above totalStep', () => {
    props = {
      ...props,
      currentStep: 6,
    }
    render(props)
    screen.getByTestId('StepMeter_StepMeterContainer')
    const bar = screen.getByTestId('StepMeter_StepMeterBar')
    expect(bar).toHaveStyle('width: 100%')
  })

  it('should transition with style when progressing forward and no style if progressing backward', () => {
    props = {
      ...props,
      currentStep: 2,
    }
    render(props)
    screen.getByTestId('StepMeter_StepMeterContainer')
    const bar = screen.getByTestId('StepMeter_StepMeterBar')
    expect(bar).toHaveStyle('transition: width 0.5s ease-in-out;')

    props = {
      ...props,
      currentStep: 1,
    }
    expect(bar).not.toHaveStyle('transition: ;')
  })
})
