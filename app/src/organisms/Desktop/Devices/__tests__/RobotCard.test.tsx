import { MemoryRouter } from 'react-router-dom'
import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  mockOT2HealthResponse,
  mockOT2ServerHealthResponse,
  mockOT3HealthResponse,
  mockOT3ServerHealthResponse,
} from '../../../../../../discovery-client/src/fixtures'

import { i18n } from '/app/i18n'
import { mockFetchModulesSuccessActionPayloadModules } from '/app/redux/modules/__fixtures__'
import {
  mockLeftProtoPipette,
  mockRightProtoPipette,
} from '/app/redux/pipettes/__fixtures__'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import { getRobotUpdateDisplayInfo } from '/app/redux/robot-update'
import { getRobotModelByName } from '/app/redux/discovery'
import { useAttachedModules } from '/app/resources/modules'
import {
  HEALTH_STATUS_OK,
  ROBOT_MODEL_OT2,
  ROBOT_MODEL_OT3,
} from '/app/redux/discovery/constants'
import { useAttachedPipettes } from '/app/resources/instruments'
import { UpdateRobotBanner } from '../../UpdateRobotBanner'
import { RobotOverflowMenu } from '../RobotOverflowMenu'
import { RobotStatusHeader } from '../RobotStatusHeader'
import { RobotCard } from '../RobotCard'
import {
  ErrorRecoveryBanner,
  useErrorRecoveryBanner,
} from '../ErrorRecoveryBanner'

import type { ComponentProps } from 'react'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/robot-update/selectors')
vi.mock('/app/redux/discovery/selectors')
vi.mock('/app/resources/instruments')
vi.mock('/app/resources/modules')
vi.mock('/app/redux-resources/robots')
vi.mock('../../UpdateRobotBanner')
vi.mock('/app/redux/config')
vi.mock('../RobotOverflowMenu')
vi.mock('../RobotStatusHeader')
vi.mock('../ErrorRecoveryBanner')

const OT2_PNG_FILE_NAME = '/app/src/assets/images/OT2-R_HERO.png'
const FLEX_PNG_FILE_NAME = '/app/src/assets/images/FLEX.png'
const MOCK_STATE: State = {
  discovery: {
    robot: { connection: { connectedTo: null } },
    robotsByName: {
      'opentrons-robot-name': {
        name: 'opentrons-robot-name',
        health: mockOT2HealthResponse,
        serverHealth: mockOT2ServerHealthResponse,
        addresses: [
          {
            ip: '10.0.0.3',
            port: 31950,
            seen: true,
            healthStatus: HEALTH_STATUS_OK,
            serverHealthStatus: HEALTH_STATUS_OK,
            healthError: null,
            serverHealthError: null,
            advertisedModel: ROBOT_MODEL_OT2,
          },
        ],
      },
      buzz: {
        name: 'buzz',
        health: mockOT3HealthResponse,
        serverHealth: mockOT3ServerHealthResponse,
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

const render = (props: ComponentProps<typeof RobotCard>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
      initialState: MOCK_STATE,
    }
  )
}

describe('RobotCard', () => {
  let props: ComponentProps<typeof RobotCard>

  beforeEach(() => {
    props = { robot: mockConnectableRobot }
    vi.mocked(useAttachedModules).mockReturnValue(
      mockFetchModulesSuccessActionPayloadModules
    )
    vi.mocked(useAttachedPipettes).mockReturnValue({
      left: mockLeftProtoPipette,
      right: mockRightProtoPipette,
    })
    vi.mocked(UpdateRobotBanner).mockReturnValue(
      <div>Mock UpdateRobotBanner</div>
    )
    vi.mocked(RobotOverflowMenu).mockReturnValue(
      <div>Mock RobotOverflowMenu</div>
    )
    vi.mocked(RobotStatusHeader).mockReturnValue(
      <div>Mock RobotStatusHeader</div>
    )
    vi.mocked(getRobotUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'reinstall',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    when(getRobotModelByName)
      .calledWith(MOCK_STATE, mockConnectableRobot.name)
      .thenReturn('OT-2')
    vi.mocked(ErrorRecoveryBanner).mockReturnValue(
      <div>MOCK_RECOVERY_BANNER</div>
    )
    vi.mocked(useErrorRecoveryBanner).mockReturnValue({
      showRecoveryBanner: false,
      recoveryIntent: 'recovering',
    })
  })

  it('renders an OT-2 image when robot model is OT-2', () => {
    render(props)
    const image = screen.getByRole('img')

    expect(image.getAttribute('src')).toEqual(OT2_PNG_FILE_NAME)
  })

  it('renders a Flex image when robot model is OT-3', () => {
    props = { robot: { ...mockConnectableRobot, name: 'buzz' } }
    when(getRobotModelByName)
      .calledWith(MOCK_STATE, 'buzz')
      .thenReturn('Opentrons Flex')
    render(props)
    const image = screen.getByRole('img')

    expect(image.getAttribute('src')).toEqual(FLEX_PNG_FILE_NAME)
  })

  it('renders a UpdateRobotBanner component', () => {
    render(props)
    screen.getByText('Mock UpdateRobotBanner')
  })

  it('renders a RobotOverflowMenu component', () => {
    render(props)
    screen.getByText('Mock RobotOverflowMenu')
  })

  it('renders a RobotStatusHeader component', () => {
    render(props)
    screen.getByText('Mock RobotStatusHeader')
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
