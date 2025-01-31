import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockCalibrationCheckLabware } from '/app/redux/sessions/__fixtures__'
import * as Sessions from '/app/redux/sessions'
import { i18n } from '/app/i18n'
import { Introduction } from '../'
import { ChooseTipRack } from '../../ChooseTipRack'

import type { ComponentProps } from 'react'

vi.mock('../../ChooseTipRack')

const mockCalInvalidationHandler = vi.fn()

describe('Introduction', () => {
  const mockSendCommands = vi.fn()
  const mockCleanUpAndExit = vi.fn()

  const render = (props: Partial<ComponentProps<typeof Introduction>> = {}) => {
    return renderWithProviders(
      <Introduction
        sendCommands={mockSendCommands}
        cleanUpAndExit={mockCleanUpAndExit}
        tipRack={mockCalibrationCheckLabware}
        isMulti={false}
        mount="left"
        currentStep={Sessions.CHECK_STEP_LABWARE_LOADED}
        sessionType={Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK}
        {...props}
      />,
      {
        i18nInstance: i18n,
      }
    )
  }
  beforeEach(() => {
    vi.mocked(ChooseTipRack).mockReturnValue(<div>mock choose tip rack</div>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct text', () => {
    render()
    screen.getByRole('heading', { name: 'Before you begin' })
    screen.getByRole('button', { name: 'Get started' })
    screen.getByRole('link', { name: 'Need help?' })
    expect(screen.queryByRole('button', { name: 'Change tip rack' })).toBe(null)
  })
  it('renders change tip rack button if allowChangeTipRack', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
      allowChangeTipRack: true,
    })
    const button = screen.getByRole('button', { name: 'Change tip rack' })
    fireEvent.click(button)
    screen.getByText('mock choose tip rack')
    expect(screen.queryByRole('heading', { name: 'Before you begin' })).toBe(
      null
    )
  })
  it('clicking proceed loads alternate tiprack if load labware supported for session', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
      supportedCommands: [Sessions.sharedCalCommands.LOAD_LABWARE],
    })
    const startButton = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(startButton)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: 'calibration.loadLabware',
      data: { tiprackDefinition: mockCalibrationCheckLabware.definition },
    })
  })
  it('clicking proceed loads default if load labware is not supported for session', () => {
    render({ sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION })
    const startButton = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(startButton)
    expect(mockSendCommands).toHaveBeenCalledWith({
      command: 'calibration.loadLabware',
    })
  })
  it('displays the InvalidationWarning when necessary - Deck session', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
      calInvalidationHandler: mockCalInvalidationHandler,
    })
    screen.getByText('Recalibrating the deck clears pipette offset data')
    screen.getByText(
      'Pipette offsets for both mounts will have to be recalibrated.'
    )
  })
  it('displays the InvalidationWarning when necessary - Tip Length session', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
      calInvalidationHandler: mockCalInvalidationHandler,
    })
    screen.getByText('Recalibrating tip length will clear pipette offset data.')
  })
  it('calls the calInvalidationHandler when appropriate', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_DECK_CALIBRATION,
      calInvalidationHandler: mockCalInvalidationHandler,
    })
    const startButton = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(startButton)
    expect(mockCalInvalidationHandler).toHaveBeenCalled()
  })
  it('does not call the calInvalidationHandler if not a deck or tip length session', () => {
    render({
      sessionType: Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION,
      calInvalidationHandler: mockCalInvalidationHandler,
    })
    const startButton = screen.getByRole('button', { name: 'Get started' })
    fireEvent.click(startButton)
    expect(mockCalInvalidationHandler).not.toHaveBeenCalled()
  })
})
