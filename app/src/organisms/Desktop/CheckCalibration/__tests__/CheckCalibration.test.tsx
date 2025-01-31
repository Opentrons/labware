import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'

import { getDeckDefinitions } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import * as Sessions from '/app/redux/sessions'
import { mockCalibrationCheckSessionAttributes } from '/app/redux/sessions/__fixtures__'

import { CheckCalibration } from '../index'

import type { ComponentProps, ComponentType } from 'react'
import type { RobotCalibrationCheckStep } from '/app/redux/sessions/types'

vi.mock('/app/redux/calibration/selectors')
vi.mock('/app/redux/config')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getDeckDefinitions>()
  return {
    ...actual,
    getDeckDefinitions: vi.fn(),
  }
})

interface CheckCalibrationSpec {
  heading: string
  currentStep: RobotCalibrationCheckStep
}

describe('CheckCalibration', () => {
  const dispatchRequests = vi.fn()
  const mockCalibrationCheckSession: Sessions.CalibrationCheckSession = {
    id: 'fake_check_session_id',
    ...mockCalibrationCheckSessionAttributes,
  }

  const render = (
    props: Partial<ComponentProps<typeof CheckCalibration>> = {}
  ) => {
    const {
      showSpinner = false,
      isJogging = false,
      session = mockCalibrationCheckSession,
    } = props
    return renderWithProviders<ComponentType<typeof CheckCalibration>>(
      <CheckCalibration
        robotName="robot-name"
        session={session}
        dispatchRequests={dispatchRequests}
        showSpinner={showSpinner}
        hasBlock={false}
        isJogging={isJogging}
      />,
      { i18nInstance: i18n }
    )
  }

  const SPECS: CheckCalibrationSpec[] = [
    { heading: 'Before you begin', currentStep: 'sessionStarted' },
    { heading: 'Prepare the space', currentStep: 'labwareLoaded' },
    { heading: 'Position pipette over A1', currentStep: 'preparingPipette' },
    {
      heading: 'Did pipette pick up tip successfully?',
      currentStep: 'inspectingTip',
    },
    { heading: 'Check z-axis on slot 5', currentStep: 'comparingHeight' },
    {
      heading: 'Check x- and y-axis in slot 1',
      currentStep: 'comparingPointOne',
    },
    {
      heading: 'Check x- and y-axis in slot 3',
      currentStep: 'comparingPointTwo',
    },
    {
      heading: 'Check x- and y-axis in slot 7',
      currentStep: 'comparingPointThree',
    },
    {
      heading: 'Return tip and continue to next pipette',
      currentStep: 'returningTip',
    },
    {
      heading: 'Calibration Health Check Results',
      currentStep: 'resultsSummary',
    },
  ]

  beforeEach(() => {
    when(vi.mocked(getDeckDefinitions)).calledWith().thenReturn({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  SPECS.forEach(spec => {
    it(`renders correct contents when currentStep is ${spec.currentStep}`, () => {
      render({
        session: {
          ...mockCalibrationCheckSession,
          details: {
            ...mockCalibrationCheckSession.details,
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
        name: 'Calibration Health Check progress will be lost',
      })
    ).toBeNull()
    const button = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(button)
    expect(
      screen.getByRole('heading', {
        name: 'Calibration Health Check progress will be lost',
      })
    ).toBeInTheDocument()
  })

  it('does not render contents when showSpinner is true', () => {
    render({
      showSpinner: true,
      session: {
        ...mockCalibrationCheckSession,
        details: {
          ...mockCalibrationCheckSession.details,
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
      ...mockCalibrationCheckSessionAttributes,
      details: {
        ...mockCalibrationCheckSessionAttributes.details,
        currentStep: Sessions.DECK_STEP_PREPARING_PIPETTE,
      },
    }
    render({ isJogging: false, session })
    const button = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(button)
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
      ...mockCalibrationCheckSessionAttributes,
      details: {
        ...mockCalibrationCheckSessionAttributes.details,
        currentStep: Sessions.DECK_STEP_PREPARING_PIPETTE,
      },
    }
    render({ isJogging: true, session })
    const button = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(button)
    expect(dispatchRequests).not.toHaveBeenCalledWith(
      Sessions.createSessionCommand('robot-name', session.id, {
        command: Sessions.sharedCalCommands.JOG,
        data: { vector: [0, -0.1, 0] },
      })
    )
  })
})
