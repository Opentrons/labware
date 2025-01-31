import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'

import { renderWithProviders } from '/app/__testing-utils__'
import { getDeckDefinitions } from '@opentrons/shared-data'

import { i18n } from '/app/i18n'
import * as Sessions from '/app/redux/sessions'
import { mockTipLengthCalibrationSessionAttributes } from '/app/redux/sessions/__fixtures__'
import { CalibrateTipLength } from '../index'
import {
  useCalibrationError,
  CalibrationError,
} from '/app/organisms/Desktop/CalibrationError'

import type { ComponentProps, ComponentType } from 'react'
import type { TipLengthCalibrationStep } from '/app/redux/sessions/types'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getDeckDefinitions>()
  return {
    ...actual,
    getDeckDefinitions: vi.fn(),
  }
})
vi.mock('/app/redux/sessions/selectors')
vi.mock('/app/redux/robot-api/selectors')
vi.mock('/app/redux/config')
vi.mock('/app/organisms/Desktop/CalibrationError')

interface CalibrateTipLengthSpec {
  heading: string
  currentStep: TipLengthCalibrationStep
}

describe('CalibrateTipLength', () => {
  const dispatchRequests = vi.fn()
  const mockTipLengthSession: Sessions.TipLengthCalibrationSession = {
    id: 'fake_session_id',
    ...mockTipLengthCalibrationSessionAttributes,
  }
  const render = (
    props: Partial<ComponentProps<typeof CalibrateTipLength>> = {}
  ) => {
    const {
      showSpinner = false,
      isJogging = false,
      session = mockTipLengthSession,
    } = props
    return renderWithProviders<ComponentType<typeof CalibrateTipLength>>(
      <CalibrateTipLength
        robotName="robot-name"
        session={session}
        dispatchRequests={dispatchRequests}
        showSpinner={showSpinner}
        isJogging={isJogging}
        requestIds={[]}
      />,
      { i18nInstance: i18n }
    )
  }

  const SPECS: CalibrateTipLengthSpec[] = [
    { heading: 'Before you begin', currentStep: 'sessionStarted' },
    { heading: 'Prepare the space', currentStep: 'labwareLoaded' },
    {
      heading: 'Calibrate z-axis on block',
      currentStep: 'measuringNozzleOffset',
    },
    { heading: 'Position pipette over A1', currentStep: 'preparingPipette' },
    {
      heading: 'Did pipette pick up tip successfully?',
      currentStep: 'inspectingTip',
    },
    { heading: 'Calibrate tip on block', currentStep: 'measuringTipOffset' },
    {
      heading: 'Tip Length Calibration complete!',
      currentStep: 'calibrationComplete',
    },
  ]

  beforeEach(() => {
    when(vi.mocked(getDeckDefinitions)).calledWith().thenReturn({})
    vi.mocked(useCalibrationError).mockReturnValue(null)
    vi.mocked(CalibrationError).mockReturnValue(
      <div>MOCK_CALIBRATION_ERROR</div>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  SPECS.forEach(spec => {
    it(`renders correct contents when currentStep is ${spec.currentStep}`, () => {
      render({
        session: {
          ...mockTipLengthSession,
          details: {
            ...mockTipLengthSession.details,
            currentStep: spec.currentStep,
          },
        },
      })

      SPECS.forEach(({ currentStep, heading }) => {
        if (currentStep === spec.currentStep) {
          expect(
            screen.getByRole('heading', { name: spec.heading })
          ).toBeInTheDocument()
        } else {
          expect(screen.queryByRole('heading', { name: heading })).toBeNull()
        }
      })
    })
  })

  it('renders confirm exit on exit click', () => {
    render()
    expect(
      screen.queryByRole('heading', {
        name: 'Tip Length Calibration progress will be lost',
      })
    ).toBeNull()
    const exitButton = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exitButton)
    expect(
      screen.getByRole('heading', {
        name: 'Tip Length Calibration progress will be lost',
      })
    ).toBeInTheDocument()
  })

  it('does not render contents when showSpinner is true', () => {
    render({
      showSpinner: true,
      session: {
        ...mockTipLengthSession,
        details: {
          ...mockTipLengthSession.details,
          currentStep: 'sessionStarted',
        },
      },
    })
    expect(
      screen.queryByRole('heading', { name: 'Before you begin' })
    ).toBeNull()
  })

  it('does dispatch jog requests when not isJogging', () => {
    const session = {
      id: 'fake_session_id',
      ...mockTipLengthCalibrationSessionAttributes,
      details: {
        ...mockTipLengthCalibrationSessionAttributes.details,
        currentStep: Sessions.DECK_STEP_PREPARING_PIPETTE,
      },
    }
    render({ isJogging: false, session })
    const forwardButton = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(forwardButton)
    expect(dispatchRequests).toHaveBeenCalledWith(
      Sessions.createSessionCommand('robot-name', session.id, {
        command: Sessions.sharedCalCommands.JOG,
        data: { vector: [0, -0.1, 0] },
      })
    )
  })

  it('does not dispatch jog requests when isJogging', () => {
    const session = {
      id: 'fake_session_id',
      ...mockTipLengthCalibrationSessionAttributes,
      details: {
        ...mockTipLengthCalibrationSessionAttributes.details,
        currentStep: Sessions.DECK_STEP_PREPARING_PIPETTE,
      },
    }
    render({ isJogging: true, session })
    const forwardButton = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(forwardButton)
    expect(dispatchRequests).not.toHaveBeenCalledWith(
      Sessions.createSessionCommand('robot-name', session.id, {
        command: Sessions.sharedCalCommands.JOG,
        data: { vector: [0, -0.1, 0] },
      })
    )
  })

  it('renders an error modal if there is an error', () => {
    vi.mocked(useCalibrationError).mockReturnValue({
      title: 'test',
      subText: 'test',
    })

    render()

    screen.getByText('MOCK_CALIBRATION_ERROR')
  })
})
