import { it, describe } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import * as Sessions from '/app/redux/sessions'

import { i18n } from '/app/i18n'
import { Body } from '../Body'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Body>) => {
  return renderWithProviders(<Body {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('Body', () => {
  it('renders correct text for health check', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK,
    })
    screen.getByText(
      'Calibration Health Check diagnoses problems with Deck, Tip Length, and Pipette Offset Calibration.'
    )
    screen.getByText(
      'You will move the pipettes to various positions, which will be compared against your existing calibration data.'
    )
    screen.getByText(
      'If there is a large difference, you will be prompted to redo some or all of your calibrations.'
    )
  })
  it('renders correct text for deck cal', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
    })
    screen.getByText(
      'Deck calibration ensures positional accuracy so that your robot moves as expected. It will accurately establish the OT-2’s deck orientation relative to the gantry.'
    )
  })
  it('renders correct text for pip offset cal', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION,
    })
    screen.getByText(
      'Calibrating pipette offset measures a pipette’s position relative to the pipette mount and the deck.'
    )
  })
  it('renders correct text for tip length cal', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
    })
    screen.getByText(
      'Tip length calibration measures the distance between the bottom of the tip and the pipette’s nozzle.'
    )
  })
})
