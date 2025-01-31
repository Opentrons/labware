import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockDeckCalTipRack } from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { TipConfirmation } from '../TipConfirmation'

import type { ComponentProps } from 'react'

describe('TipConfirmation', () => {
  const mockSendCommands = vi.fn()
  const mockDeleteSession = vi.fn()
  const render = (
    props: Partial<ComponentProps<typeof TipConfirmation>> = {}
  ) => {
    const {
      mount = 'left',
      isMulti = false,
      tipRack = mockDeckCalTipRack,
      sendCommands = mockSendCommands,
      cleanUpAndExit = mockDeleteSession,
      currentStep = Sessions.DECK_STEP_INSPECTING_TIP,
      sessionType = Sessions.SESSION_TYPE_DECK_CALIBRATION,
    } = props
    return renderWithProviders(
      <TipConfirmation
        isMulti={isMulti}
        mount={mount}
        tipRack={tipRack}
        sendCommands={sendCommands}
        cleanUpAndExit={cleanUpAndExit}
        currentStep={currentStep}
        sessionType={sessionType}
      />,
      { i18nInstance: i18n }
    )
  }

  it('renders correct heading', () => {
    render()
    screen.getByRole('heading', {
      name: 'Did pipette pick up tip successfully?',
    })
  })
  it('clicking invalidate tip send invalidate tip command', () => {
    render()
    const button = screen.getByRole('button', { name: 'try again' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.INVALIDATE_TIP,
    })
  })
  it('proceeds to move to deck for pipette offset calibration', () => {
    render({ sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION })
    const button = screen.getByRole('button', { name: 'yes' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_DECK,
    })
  })
  it('proceeds to move to deck for deck calibration', () => {
    render({ sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION })
    const button = screen.getByRole('button', { name: 'yes' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_DECK,
    })
  })
  it('proceeds to move to reference point for tip length calibration', () => {
    render({ sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION })
    const button = screen.getByRole('button', { name: 'yes' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_REFERENCE_POINT,
    })
  })
  it('proceeds to move to reference point for calibration health check', () => {
    render({ sessionType: Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK })
    const button = screen.getByRole('button', { name: 'yes' })
    fireEvent.click(button)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: Sessions.sharedCalCommands.MOVE_TO_REFERENCE_POINT,
    })
  })
})
