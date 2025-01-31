import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { HowCalibrationWorksModal } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof HowCalibrationWorksModal>) => {
  return renderWithProviders(<HowCalibrationWorksModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HowCalibrationWorksModal', () => {
  let props: ComponentProps<typeof HowCalibrationWorksModal>
  beforeEach(() => {
    props = { onCloseClick: vi.fn() }
  })

  it('should render the correct header', () => {
    render(props)
    screen.getByText('How Robot Calibration Works')
  })

  it('should render the correct body', () => {
    render(props)
    screen.getByText(
      'Robot calibration establishes how the robot knows where it is in relation to the deck. Accurate Robot calibration is essential to run protocols successfully. Robot calibration has 3 parts: Deck calibration, Tip Length calibration and Pipette Offset calibration.'
    )
    expect(
      screen.getByRole('heading', { name: 'Deck Calibration' })
    ).toBeTruthy()
    screen.getByText(
      'This measures the deck X and Y values relative to the gantry. Deck Calibration is the foundation for Tip Length Calibration and Pipette Offset Calibration.'
    )
    screen.getByText('Perform Deck Calibration during new robot setup.')
    screen.getByText('Redo Deck Calibration if you relocate your robot.')
    expect(
      screen.getByRole('heading', { name: 'Tip Length Calibration' })
    ).toBeTruthy()
    screen.getByText(
      'This measures the Z distance between the bottom of the tip and the pipette’s nozzle. If you redo the tip length calibration for the tip you used to calibrate a pipette, you will also have to redo that Pipette Offset Calibration.'
    )
    screen.getByText(
      'Perform Tip Length Calibration for each new tip type used on a pipette.'
    )
    expect(
      screen.getByRole('heading', { name: 'Pipette Offset Calibration' })
    ).toBeTruthy()
    screen.getByText(
      'This measures a pipette’s X, Y and Z values in relation to the pipette mount and the deck. Pipette Offset Calibration relies on Deck Calibration and Tip Length Calibration.'
    )
    screen.getByText(
      'Perform Pipette Offset calibration the first time you attach a pipette to a new mount.'
    )
    screen.getByText(
      'Redo Pipette Offset Calibration after performing Deck Calibration.'
    )
    screen.getByText(
      'Redo Pipette Offset Calibration after performing Tip Length Calibration for the tip you used to calibrate the pipette.'
    )
  })

  it('should render a link to the learn more page', () => {
    render(props)
    expect(
      screen
        .getByRole('link', {
          name: 'Learn more about robot calibration',
        })
        .getAttribute('href')
    ).toBe(
      'https://support.opentrons.com/s/article/How-positional-calibration-works-on-the-OT-2'
    )
  })

  it('should call onCloseClick when the close button is pressed', () => {
    render(props)
    expect(props.onCloseClick).not.toHaveBeenCalled()
    const closeButton = screen.getByRole('button', { name: 'close' })
    fireEvent.click(closeButton)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
