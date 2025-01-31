import userEvent from '@testing-library/user-event'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_CALIBRATION_HEALTH_CHECK_BUTTON_CLICKED,
} from '/app/redux/analytics'
import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
} from '/app/redux/calibration/pipette-offset/__fixtures__'
import {
  mockTipLengthCalibration1,
  mockTipLengthCalibration2,
} from '/app/redux/calibration/tip-length/__fixtures__'
import { mockAttachedPipette } from '/app/redux/pipettes/__fixtures__'
import { useRunStatuses } from '/app/resources/runs'
import {
  useAttachedPipettes,
  useAttachedPipetteCalibrations,
} from '/app/resources/instruments'
import { CalibrationHealthCheck } from '../CalibrationHealthCheck'

import type { ComponentProps } from 'react'
import type {
  AttachedPipettesByMount,
  PipetteCalibrationsByMount,
} from '/app/redux/pipettes/types'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/config')
vi.mock('/app/redux/pipettes')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/instruments')
vi.mock('/app/redux-resources/robots')

const mockAttachedPipettes: AttachedPipettesByMount = {
  left: mockAttachedPipette,
  right: mockAttachedPipette,
} as any
const mockAttachedPipetteCalibrations: PipetteCalibrationsByMount = {
  left: {
    offset: mockPipetteOffsetCalibration1,
    tipLength: mockTipLengthCalibration1,
  },
  right: {
    offset: mockPipetteOffsetCalibration2,
    tipLength: mockTipLengthCalibration2,
  },
} as any

const RUN_STATUSES = {
  isRunRunning: false,
  isRunStill: false,
  isRunTerminal: false,
  isRunIdle: false,
}

let mockTrackEvent: any
const mockDispatchRequests = vi.fn()

const render = (
  props?: Partial<ComponentProps<typeof CalibrationHealthCheck>>
) => {
  return renderWithProviders(
    <CalibrationHealthCheck
      buttonDisabledReason={null}
      dispatchRequests={mockDispatchRequests}
      isPending={false}
      robotName="otie"
      {...props}
    />,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CalibrationHealthCheck', () => {
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    vi.mocked(useAttachedPipettes).mockReturnValue(mockAttachedPipettes)
    vi.mocked(useRunStatuses).mockReturnValue(RUN_STATUSES)
  })

  it('renders a title and description - Calibration Health Check section', () => {
    render()
    screen.getByText('Calibration Health Check')
    screen.getByText(
      'Check the accuracy of key calibration points without recalibrating the robot.'
    )
  })

  it('renders a Check health button', () => {
    render()
    const button = screen.getByRole('button', { name: 'Check health' })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_CALIBRATION_HEALTH_CHECK_BUTTON_CLICKED,
      properties: {},
    })
  })

  it('Health check button is disabled when a button disabled reason is provided', () => {
    render({
      buttonDisabledReason: 'otie is unreachable',
    })
    const button = screen.getByRole('button', { name: 'Check health' })
    expect(button).toBeDisabled()
  })

  it('Health check button is disabled when a robot is running', () => {
    vi.mocked(useRunStatuses).mockReturnValue({
      ...RUN_STATUSES,
      isRunRunning: true,
    })
    render()
    const button = screen.getByRole('button', { name: 'Check health' })
    expect(button).toBeDisabled()
  })

  it('Health check button is disabled when pipette are not set', () => {
    vi.mocked(useAttachedPipettes).mockReturnValue({ left: null, right: null })
    render()
    const button = screen.getByRole('button', { name: 'Check health' })
    expect(button).toBeDisabled()
  })

  it('Health check button shows Tooltip when pipette are not set', async () => {
    vi.mocked(useAttachedPipettes).mockReturnValue({ left: null, right: null })
    render()
    const button = screen.getByRole('button', { name: 'Check health' })
    await userEvent.hover(button)
    await waitFor(() => {
      expect(
        screen.getByText(
          'Fully calibrate your robot before checking calibration health'
        )
      ).toBeInTheDocument()
    })
  })

  it('health check button should be disabled if there is a running protocol', () => {
    vi.mocked(useAttachedPipettes).mockReturnValue(mockAttachedPipettes)
    vi.mocked(useAttachedPipetteCalibrations).mockReturnValue(
      mockAttachedPipetteCalibrations
    )
    vi.mocked(useRunStatuses).mockReturnValue({
      ...RUN_STATUSES,
      isRunRunning: true,
    })
    render()
    const button = screen.getByRole('button', { name: 'Check health' })
    expect(button).toBeDisabled()
  })
})
