import { MemoryRouter } from 'react-router-dom'
import { when } from 'vitest-when'
import { screen, fireEvent } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import * as DiscoveryClientFixtures from '../../../../../../discovery-client/src/fixtures'
import { useAuthorization } from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { useCurrentRunId, useRunStatuses } from '/app/resources/runs'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import { getRobotUpdateDisplayInfo } from '/app/redux/robot-update'
import { getConfig, useFeatureFlag } from '/app/redux/config'
import {
  getRobotAddressesByName,
  getRobotModelByName,
} from '/app/redux/discovery'
import {
  HEALTH_STATUS_OK,
  OPENTRONS_USB,
  ROBOT_MODEL_OT3,
} from '/app/redux/discovery/constants'
import {
  useIsRobotBusy,
  useIsRobotViewable,
  useRobot,
} from '/app/redux-resources/robots'
import { useLights } from '/app/resources/devices'
import { useCalibrationTaskList } from '../hooks'
import {
  expectedBadDeckTaskList,
  expectedBadDeckAndPipetteOffsetTaskList,
  expectedBadEverythingTaskList,
  expectedBadPipetteOffsetTaskList,
  expectedBadTipLengthTaskList,
  expectedBadTipLengthAndOffsetTaskList,
  expectedIncompleteDeckCalTaskList,
  expectedTaskList,
} from '../hooks/__fixtures__/taskListFixtures'
import { UpdateRobotBanner } from '../../UpdateRobotBanner'
import { RobotStatusHeader } from '../RobotStatusHeader'
import { RobotOverview } from '../RobotOverview'
import { RobotOverviewOverflowMenu } from '../RobotOverviewOverflowMenu'
import {
  ErrorRecoveryBanner,
  useErrorRecoveryBanner,
} from '../ErrorRecoveryBanner'

import type { ComponentProps } from 'react'
import type * as ReactApiClient from '@opentrons/react-api-client'
import type { Config } from '/app/redux/config/types'
import type { DiscoveryClientRobotAddress } from '/app/redux/discovery/types'
import type { State } from '/app/redux/types'

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ReactApiClient>()
  return {
    ...actual,
    useAuthorization: vi.fn(),
  }
})
vi.mock('/app/redux/robot-controls')
vi.mock('/app/redux/robot-update/selectors')
vi.mock('/app/redux/config')
vi.mock('/app/redux/discovery/selectors')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/devices')
vi.mock('../hooks')
vi.mock('/app/redux-resources/robots')
vi.mock('../RobotStatusHeader')
vi.mock('../../UpdateRobotBanner')
vi.mock('../RobotOverviewOverflowMenu')
vi.mock('../ErrorRecoveryBanner')

const OT2_PNG_FILE_NAME = '/app/src/assets/images/OT2-R_HERO.png'
const FLEX_PNG_FILE_NAME = '/app/src/assets/images/FLEX.png'

const MOCK_STATE: State = {
  discovery: {
    robot: { connection: { connectedTo: null } },
    robotsByName: {
      [mockConnectableRobot.name]: mockConnectableRobot,
      buzz: {
        name: 'buzz',
        health: DiscoveryClientFixtures.mockOT3HealthResponse,
        serverHealth: DiscoveryClientFixtures.mockOT3ServerHealthResponse,
        addresses: [
          {
            ip: '10.0.0.4',
            port: 31950,
            seen: true,
            healthStatus: HEALTH_STATUS_OK,
            serverHealthStatus: HEALTH_STATUS_OK,
            healthError: null,
            serverHealthError: null,
            advertisedModel: ROBOT_MODEL_OT3,
          },
        ],
      },
    },
  },
} as any

const mockToggleLights = vi.fn()

const render = (props: ComponentProps<typeof RobotOverview>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotOverview robotName={props.robotName} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
      initialState: MOCK_STATE,
    }
  )
}

describe('RobotOverview', () => {
  let props: ComponentProps<typeof RobotOverview>

  beforeEach(() => {
    props = { robotName: mockConnectableRobot.name }
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: false,
      isRunTerminal: true,
      isRunIdle: false,
    })
    vi.mocked(getRobotUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'reinstall',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    vi.mocked(useCalibrationTaskList).mockReturnValue(expectedTaskList)
    vi.mocked(useFeatureFlag).mockReturnValue(false)
    vi.mocked(useIsRobotBusy).mockReturnValue(false)
    vi.mocked(useLights).mockReturnValue({
      lightsOn: false,
      toggleLights: mockToggleLights,
    })
    vi.mocked(useRobot).mockReturnValue(mockConnectableRobot)
    vi.mocked(RobotStatusHeader).mockReturnValue(
      <div>Mock RobotStatusHeader</div>
    )
    vi.mocked(UpdateRobotBanner).mockReturnValue(
      <div>Mock UpdateRobotBanner</div>
    )
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(RobotOverviewOverflowMenu).mockReturnValue(
      <div>mock RobotOverviewOverflowMenu</div>
    )
    when(getRobotModelByName)
      .calledWith(MOCK_STATE, mockConnectableRobot.name)
      .thenReturn('OT-2')
    when(getRobotAddressesByName)
      .calledWith(MOCK_STATE, mockConnectableRobot.name)
      .thenReturn([])
    vi.mocked(getConfig).mockReturnValue({
      userInfo: { userId: 'opentrons-robot-user' },
    } as Config)
    when(useAuthorization)
      .calledWith({
        subject: 'Opentrons',
        agent: 'com.opentrons.app',
        agentId: 'opentrons-robot-user',
      })
      .thenReturn({
        authorizationToken: { token: 'my.authorization.jwt' },
        registrationToken: { token: 'my.registration.jwt' },
      })
    vi.mocked(useIsRobotViewable).mockReturnValue(true)
    vi.mocked(ErrorRecoveryBanner).mockReturnValue(
      <div>MOCK_RECOVERY_BANNER</div>
    )
    vi.mocked(useErrorRecoveryBanner).mockReturnValue({
      showRecoveryBanner: false,
      recoveryIntent: 'recovering',
    })
  })

  it('renders an OT-2 image', () => {
    render(props)
    const image = screen.getByRole('img')
    expect(image.getAttribute('src')).toEqual(OT2_PNG_FILE_NAME)
  })

  it('renders a Flex image', () => {
    when(getRobotModelByName)
      .calledWith(MOCK_STATE, mockConnectableRobot.name)
      .thenReturn('Opentrons Flex')
    render(props)
    const image = screen.getByRole('img')
    expect(image.getAttribute('src')).toEqual(FLEX_PNG_FILE_NAME)
  })

  it('renders a RobotStatusHeader component', () => {
    render(props)
    screen.getByText('Mock RobotStatusHeader')
  })

  it('renders a UpdateRobotBanner component', () => {
    render(props)
    screen.getByText('Mock UpdateRobotBanner')
  })

  it('does not render a calibration status label when calibration is good and the calibration wizard feature flag is set', () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    expect(
      screen.queryByRole('link', {
        name: 'Go to calibration',
      })
    ).not.toBeInTheDocument()
  })

  it('renders a missing calibration status label when the calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedIncompleteDeckCalTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Robot is missing calibration data')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('does not render a missing calibration status label when the robot is not viewable', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedIncompleteDeckCalTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    vi.mocked(useIsRobotViewable).mockReturnValue(false)
    render(props)
    expect(
      screen.queryByText('Robot is missing calibration data')
    ).not.toBeInTheDocument()
  })

  it('renders a recommended recalibration status label when the deck is bad and calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(expectedBadDeckTaskList)
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('renders a recommended recalibration status label when both the deck and offset is bad and the calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadDeckAndPipetteOffsetTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('renders a recommended recalibration status label when everything is bad and the calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadEverythingTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('renders a recommended recalibration status label when the offset is bad and calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadPipetteOffsetTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('renders a recommended recalibration status label when the tip length is bad and calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadTipLengthTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('renders a recommended recalibration status label when both the tip length and offset is bad and the calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadTipLengthAndOffsetTaskList
    )
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    screen.getByText('Recalibration recommended')
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Go to calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/opentrons-robot-name/robot-settings/calibration'
    )
  })

  it('does not render a calibration status label when robot is busy and the calibration wizard feature flag is set', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedIncompleteDeckCalTaskList
    )
    vi.mocked(useIsRobotBusy).mockReturnValue(true)
    vi.mocked(useFeatureFlag).mockReturnValue(true)
    render(props)
    expect(
      screen.queryByRole('link', {
        name: 'Go to calibration',
      })
    ).not.toBeInTheDocument()
  })

  it('fetches lights status', async () => {
    vi.mocked(useLights).mockReturnValue({
      lightsOn: true,
      toggleLights: mockToggleLights,
    })
    render(props)
    const toggle = screen.getByRole('switch', { name: 'Lights' })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('renders a lights toggle button', () => {
    render(props)

    screen.getByText('Controls')
    screen.getByText('Lights')
    const toggle = screen.getByRole('switch', { name: 'Lights' })
    fireEvent.click(toggle)
    expect(mockToggleLights).toBeCalled()
  })

  it('renders an overflow menu for the robot overview', () => {
    render(props)

    screen.getByText('mock RobotOverviewOverflowMenu')
  })

  it('requests a usb registration token if connected by usb', () => {
    when(getRobotAddressesByName)
      .calledWith(MOCK_STATE, mockConnectableRobot.name)
      .thenReturn([{ ip: OPENTRONS_USB } as DiscoveryClientRobotAddress])
    render(props)
    expect(useAuthorization).toBeCalledWith({
      subject: 'Opentrons',
      agent: 'com.opentrons.app.usb',
      agentId: 'opentrons-robot-user',
    })
  })

  it('renders the error recovery banner when another user is performing error recovery', () => {
    vi.mocked(useErrorRecoveryBanner).mockReturnValue({
      showRecoveryBanner: true,
      recoveryIntent: 'recovering',
    })

    render(props)

    screen.getByText('MOCK_RECOVERY_BANNER')
  })
})
