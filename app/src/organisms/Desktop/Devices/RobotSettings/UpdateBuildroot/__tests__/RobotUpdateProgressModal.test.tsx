import { i18n } from '/app/i18n'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import {
  RobotUpdateProgressModal,
  TIME_BEFORE_ALLOWING_EXIT,
  TIME_BEFORE_ALLOWING_EXIT_INIT,
} from '../RobotUpdateProgressModal'
import { useRobotUpdateInfo } from '../useRobotUpdateInfo'
import {
  getRobotSessionIsManualFile,
  getRobotUpdateDownloadError,
} from '/app/redux/robot-update'
import { useDispatchStartRobotUpdate } from '/app/redux/robot-update/hooks'
import {
  useRobotInitializationStatus,
  INIT_STATUS,
} from '/app/resources/health/hooks'

import type { ComponentProps } from 'react'
import type { SetStatusBarCreateCommand } from '@opentrons/shared-data'
import type { RobotUpdateSession } from '/app/redux/robot-update/types'

vi.mock('@opentrons/react-api-client')
vi.mock('../useRobotUpdateInfo')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/robot-update/hooks')
vi.mock('/app/resources/health/hooks')

const render = (props: ComponentProps<typeof RobotUpdateProgressModal>) => {
  return renderWithProviders(<RobotUpdateProgressModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DownloadUpdateModal', () => {
  const mockRobotUpdateSession: RobotUpdateSession | null = {
    robotName: 'testRobot',
    fileInfo: null,
    token: null,
    pathPrefix: null,
    step: 'getToken',
    stage: 'validating',
    progress: 50,
    error: null,
  }

  let props: ComponentProps<typeof RobotUpdateProgressModal>
  const mockCreateLiveCommand = vi.fn()
  const mockDispatchStartRobotUpdate = vi.fn()

  beforeEach(() => {
    mockCreateLiveCommand.mockResolvedValue(null)
    props = {
      robotName: 'testRobot',
      session: mockRobotUpdateSession,
      closeUpdateBuildroot: vi.fn(),
    }
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
    vi.mocked(useRobotUpdateInfo).mockReturnValue({
      updateStep: 'install',
      progressPercent: 50,
    })
    vi.mocked(getRobotSessionIsManualFile).mockReturnValue(false)
    vi.mocked(useDispatchStartRobotUpdate).mockReturnValue(
      mockDispatchStartRobotUpdate
    )
    vi.mocked(getRobotUpdateDownloadError).mockReturnValue(null)
  })

  it('renders robot update download errors', () => {
    vi.mocked(getRobotUpdateDownloadError).mockReturnValue(
      'test download error'
    )
    render(props)
    screen.getByText('test download error')
  })

  it('renders the robot name as a part of the header', () => {
    render(props)
    expect(screen.getByText('Updating testRobot')).toBeInTheDocument()
  })

  it('activates the Update animation when first rendered', () => {
    render(props)
    const updatingCommand: SetStatusBarCreateCommand = {
      commandType: 'setStatusBar',
      params: { animation: 'updating' },
    }
    expect(useCreateLiveCommandMutation).toBeCalledWith()
    expect(mockCreateLiveCommand).toBeCalledWith({
      command: updatingCommand,
      waitUntilComplete: false,
    })
  })

  it('renders the correct text when installing the robot update with no close button', () => {
    render(props)
    expect(screen.getByText('Installing update...')).toBeInTheDocument()
    expect(
      screen.getByText(
        "This could take up to 15 minutes. Don't turn off the robot."
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the correct text when finalizing the robot update with no close button', () => {
    vi.mocked(useRobotUpdateInfo).mockReturnValue({
      updateStep: 'restart',
      progressPercent: 100,
    })
    render(props)

    expect(
      screen.getByText('Install complete, robot restarting...')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "This could take up to 15 minutes. Don't turn off the robot."
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a success modal and exit button upon finishing the update process', () => {
    vi.mocked(useRobotUpdateInfo).mockReturnValue({
      updateStep: 'finished',
      progressPercent: 100,
    })
    render(props)

    const exitButton = screen.getByText('exit')

    expect(
      screen.getByText('Robot software successfully updated')
    ).toBeInTheDocument()
    expect(exitButton).toBeInTheDocument()
    expect(mockCreateLiveCommand).toHaveBeenCalled()
    fireEvent.click(exitButton)
    expect(props.closeUpdateBuildroot).toHaveBeenCalled()
  })

  it('renders an error modal and exit button if an error occurs', () => {
    props = {
      ...props,
      session: {
        ...mockRobotUpdateSession,
        error: 'test error',
      },
    }
    const idleCommand: SetStatusBarCreateCommand = {
      commandType: 'setStatusBar',
      params: { animation: 'idle' },
    }

    render(props)
    const exitButton = screen.getByText('exit')

    expect(screen.getByText('test error')).toBeInTheDocument()
    fireEvent.click(exitButton)
    expect(props.closeUpdateBuildroot).toHaveBeenCalled()

    expect(useCreateLiveCommandMutation).toBeCalledWith()
    expect(mockCreateLiveCommand).toHaveBeenCalled()
    expect(mockCreateLiveCommand).toBeCalledWith({
      command: idleCommand,
      waitUntilComplete: false,
    })
  })

  it('renders alternative text if update takes too long', () => {
    vi.useFakeTimers()
    render(props)

    act(() => {
      vi.advanceTimersByTime(TIME_BEFORE_ALLOWING_EXIT)
    })

    screen.getByText(/Try restarting the update./i)
    screen.getByText(/This update is taking longer than usual/i)
  })

  it('renders alternative text if the robot is initializing', () => {
    vi.mocked(useRobotInitializationStatus).mockReturnValue(
      INIT_STATUS.INITIALIZING
    )
    vi.mocked(useRobotUpdateInfo).mockReturnValue({
      updateStep: 'restart',
      progressPercent: 100,
    })
    render(props)

    screen.getByText(/Initializing robot.../i)
    screen.getByText(
      "This could take up to 40 minutes. Don't turn off the robot."
    )
  })

  it('renders alternative text if update takes too long while robot is initializing', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(useRobotInitializationStatus).mockReturnValue(
      INIT_STATUS.INITIALIZING
    )
    vi.mocked(useRobotUpdateInfo).mockReturnValue({
      updateStep: 'restart',
      progressPercent: 100,
    })
    render(props)

    act(() => {
      vi.advanceTimersByTime(TIME_BEFORE_ALLOWING_EXIT_INIT)
    })

    screen.getByText(
      /Check the Advanced tab of its settings page to see whether it updated successfully./i
    )
  })
})
