import { vi, it, describe, expect, beforeEach } from 'vitest'
import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { getDeckDefinitions } from '@opentrons/shared-data'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import * as Sessions from '/app/redux/sessions'
import { mockPipetteOffsetCalibrationSessionAttributes } from '/app/redux/sessions/__fixtures__'
import {
  useCalibrationError,
  CalibrationError,
} from '/app/organisms/Desktop/CalibrationError'
import { CalibratePipetteOffset } from '../index'

import type { ComponentProps, ComponentType } from 'react'
import type { PipetteOffsetCalibrationStep } from '/app/redux/sessions/types'
import type { DispatchRequestsType } from '/app/redux/robot-api'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getDeckDefinitions>()
  return {
    ...actual,
    getDeckDefinitions: vi.fn(),
  }
})
vi.mock('/app/redux/sessions/selectors')
vi.mock('/app/redux/robot-api/selectors')
vi.mock('/app/organisms/Desktop/CalibrationError')
vi.mock('/app/redux/config')

interface CalibratePipetteOffsetSpec {
  heading: string
  currentStep: PipetteOffsetCalibrationStep
}

describe('CalibratePipetteOffset', () => {
  let dispatchRequests: DispatchRequestsType
  const render = (
    props: Partial<ComponentProps<typeof CalibratePipetteOffset>> = {}
  ) => {
    const {
      showSpinner = false,
      isJogging = false,
      session = mockPipOffsetCalSession,
    } = props
    return renderWithProviders<ComponentType<typeof CalibratePipetteOffset>>(
      <CalibratePipetteOffset
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
  let mockPipOffsetCalSession: Sessions.PipetteOffsetCalibrationSession
  const SPECS: CalibratePipetteOffsetSpec[] = [
    { heading: 'Before you begin', currentStep: 'sessionStarted' },
    { heading: 'Prepare the space', currentStep: 'labwareLoaded' },
    { heading: 'Position pipette over A1', currentStep: 'preparingPipette' },
    {
      heading: 'Did pipette pick up tip successfully?',
      currentStep: 'inspectingTip',
    },
    { heading: 'Calibrate z-axis in slot 5', currentStep: 'joggingToDeck' },
    {
      heading: 'Calibrate x- and y-axis in slot 1',
      currentStep: 'savingPointOne',
    },
    {
      heading: 'Pipette Offset Calibration complete!',
      currentStep: 'calibrationComplete',
    },
  ]

  beforeEach(() => {
    dispatchRequests = vi.fn()
    when(vi.mocked(getDeckDefinitions)).calledWith().thenReturn({})
    vi.mocked(useCalibrationError).mockReturnValue(null)
    vi.mocked(CalibrationError).mockReturnValue(
      <div>MOCK_CALIBRATION_ERROR</div>
    )

    mockPipOffsetCalSession = {
      id: 'fake_session_id',
      ...mockPipetteOffsetCalibrationSessionAttributes,
    }
  })

  SPECS.forEach(spec => {
    it(`renders correct contents when currentStep is ${spec.currentStep}`, () => {
      render({
        session: {
          ...mockPipOffsetCalSession,
          details: {
            ...mockPipOffsetCalSession.details,
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
        name: 'Pipette Offset Calibration progress will be lost',
      })
    ).toBeNull()
    const exitButton = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exitButton)
    expect(
      screen.getByRole('heading', {
        name: 'Pipette Offset Calibration progress will be lost',
      })
    ).toBeInTheDocument()
  })

  it('does not render contents when showSpinner is true', () => {
    render({
      showSpinner: true,
      session: {
        ...mockPipOffsetCalSession,
        details: {
          ...mockPipOffsetCalSession.details,
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
      ...mockPipetteOffsetCalibrationSessionAttributes,
      details: {
        ...mockPipetteOffsetCalibrationSessionAttributes.details,
        currentStep: Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE,
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
      ...mockPipetteOffsetCalibrationSessionAttributes,
      details: {
        ...mockPipetteOffsetCalibrationSessionAttributes.details,
        currentStep: Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE,
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
