import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_PROCEED_TO_MODULE_SETUP_STEP,
} from '/app/redux/analytics'
import { useIsFlex } from '/app/redux-resources/robots'
import { mockDeckCalData } from '/app/redux/calibration/__fixtures__'
import { useDeckCalibrationData } from '../../hooks'
import { useRunHasStarted } from '/app/resources/runs'

import { SetupDeckCalibration } from '../SetupDeckCalibration'
import { SetupInstrumentCalibration } from '../SetupInstrumentCalibration'
import { SetupTipLengthCalibration } from '../SetupTipLengthCalibration'
import { SetupRobotCalibration } from '../SetupRobotCalibration'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/analytics')
vi.mock('../../hooks')
vi.mock('/app/resources/runs')
vi.mock('/app/redux-resources/robots')
vi.mock('../SetupDeckCalibration')
vi.mock('../SetupInstrumentCalibration')
vi.mock('../SetupTipLengthCalibration')

const ROBOT_NAME = 'otie'
const RUN_ID = '1'

describe('SetupRobotCalibration', () => {
  const mockExpandStep = vi.fn()
  const mockTrackEvent = vi.fn()

  const render = ({
    robotName = ROBOT_NAME,
    runId = RUN_ID,
    nextStep = 'module_setup_step',
    calibrationStatus = { complete: true },
    expandStep = mockExpandStep,
  }: Partial<ComponentProps<typeof SetupRobotCalibration>> = {}) => {
    return renderWithProviders(
      <SetupRobotCalibration
        {...{
          robotName,
          runId,
          nextStep,
          calibrationStatus,
          expandStep,
        }}
      />,
      { i18nInstance: i18n }
    )
  }

  beforeEach(() => {
    when(vi.mocked(useTrackEvent)).calledWith().thenReturn(mockTrackEvent)
    vi.mocked(SetupDeckCalibration).mockReturnValue(
      <div>Mock SetupDeckCalibration</div>
    )
    vi.mocked(SetupInstrumentCalibration).mockReturnValue(
      <div>Mock SetupInstrumentCalibration</div>
    )
    vi.mocked(SetupTipLengthCalibration).mockReturnValue(
      <div>Mock SetupTipLengthCalibration</div>
    )
    when(vi.mocked(useDeckCalibrationData)).calledWith(ROBOT_NAME).thenReturn({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: true,
    })
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(false)
    when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(false)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders deck, pipette, and tip length calibration components', () => {
    render()
    screen.getByText('Mock SetupDeckCalibration')
    screen.getByText('Mock SetupInstrumentCalibration')
    screen.getByText('Mock SetupTipLengthCalibration')
  })

  it('renders only pipette calibration component for Flex', () => {
    when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
    render()
    expect(screen.queryByText('Mock SetupDeckCalibration')).toBeNull()
    screen.getByText('Mock SetupInstrumentCalibration')
    expect(screen.queryByText('Mock SetupTipLengthCalibration')).toBeNull()
  })

  it('changes Proceed CTA copy based on next step', () => {
    render({ nextStep: 'labware_setup_step' })
    screen.getByRole('button', { name: 'Proceed to labware' })
  })

  it('calls the expandStep function and tracks the analytics event on click', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to modules' }))
    expect(mockExpandStep).toHaveBeenCalled()
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROCEED_TO_MODULE_SETUP_STEP,
      properties: {},
    })
  })

  it('does not call the expandStep function on click if calibration is not complete', () => {
    render({ calibrationStatus: { complete: false } })
    const button = screen.getByRole('button', { name: 'Proceed to modules' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(mockExpandStep).not.toHaveBeenCalled()
  })

  it('does not call the expandStep function on click if run has started', () => {
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(true)
    render()
    const button = screen.getByRole('button', { name: 'Proceed to modules' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(mockExpandStep).not.toHaveBeenCalled()
  })
})
