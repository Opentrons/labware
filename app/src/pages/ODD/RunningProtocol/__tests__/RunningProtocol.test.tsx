import { Route, MemoryRouter, Routes } from 'react-router-dom'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { when } from 'vitest-when'
import { screen } from '@testing-library/react'

import {
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_IDLE,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
} from '@opentrons/api-client'
import {
  useProtocolAnalysesQuery,
  useProtocolQuery,
  useRunActionMutations,
} from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockRobotSideAnalysis } from '/app/molecules/Command/__fixtures__'
import {
  CurrentRunningProtocolCommand,
  RunningProtocolSkeleton,
} from '/app/organisms/ODD/RunningProtocol'
/* eslint-disable-next-line opentrons/no-imports-across-applications */
import { mockUseAllCommandsResponseNonDeterministic } from '/app/organisms/Desktop/RunProgressMeter/__fixtures__'
import { getLocalRobot } from '/app/redux/discovery'
import { CancelingRunModal } from '/app/organisms/ODD/RunningProtocol/CancelingRunModal'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import { OpenDoorAlertModal } from '/app/organisms/ODD/OpenDoorAlertModal'
import { RunningProtocol } from '..'
import {
  useRunStatus,
  useRunTimestamps,
  useNotifyRunQuery,
  useNotifyAllCommandsQuery,
  useMostRecentCompletedAnalysis,
  useLastRunCommand,
} from '/app/resources/runs'
import { useFeatureFlag } from '/app/redux/config'
import {
  ErrorRecoveryFlows,
  useErrorRecoveryFlows,
} from '/app/organisms/ErrorRecoveryFlows'
import {
  useInterventionModal,
  InterventionModal,
} from '/app/organisms/InterventionModal'

import type { UseQueryResult } from 'react-query'
import type { ProtocolAnalyses, RunCommandSummary } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux-resources/analytics')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/organisms/RunTimeControl/hooks')
vi.mock('/app/organisms/ODD/RunningProtocol')
vi.mock('/app/redux/discovery')
vi.mock('/app/organisms/ODD/RunningProtocol/CancelingRunModal')
vi.mock('/app/organisms/ODD/OpenDoorAlertModal')
vi.mock('/app/resources/runs')
vi.mock('/app/redux/config')
vi.mock('/app/organisms/ErrorRecoveryFlows')
vi.mock('/app/organisms/InterventionModal')

const RUN_ID = 'run_id'
const ROBOT_NAME = 'otie'
const PROTOCOL_ID = 'protocol_id'
const PROTOCOL_KEY = 'protocol_key'
const PROTOCOL_ANALYSIS = {
  id: 'fake analysis',
  status: 'completed',
  labware: [],
} as any
const mockPlayRun = vi.fn()
const mockPauseRun = vi.fn()
const mockStopRun = vi.fn()
const mockResumeRunFromRecovery = vi.fn()
const mockResumeRunFromRecoveryAssumingFalsePositive = vi.fn()

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <Routes>
        <Route path="/runs/:runId/run" element={<RunningProtocol />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RunningProtocol', () => {
  beforeEach(() => {
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID, { staleTime: Infinity })
      .thenReturn({
        data: {
          data: {
            id: RUN_ID,
            protocolId: PROTOCOL_ID,
            errors: [],
          },
        },
      } as any)
    vi.mocked(getLocalRobot).mockReturnValue({ name: ROBOT_NAME } as any)
    when(vi.mocked(useTrackProtocolRunEvent))
      .calledWith(RUN_ID, ROBOT_NAME)
      .thenReturn({
        trackProtocolRunEvent: vi.fn(),
      })
    when(vi.mocked(useRunStatus)).calledWith(RUN_ID).thenReturn(RUN_STATUS_IDLE)
    when(vi.mocked(useProtocolAnalysesQuery))
      .calledWith(PROTOCOL_ID, { staleTime: Infinity }, expect.any(Boolean))
      .thenReturn({
        data: { data: [PROTOCOL_ANALYSIS] },
      } as UseQueryResult<ProtocolAnalyses>)
    when(vi.mocked(useProtocolQuery))
      .calledWith(PROTOCOL_ID, { staleTime: Infinity })
      .thenReturn({
        data: {
          data: {
            key: PROTOCOL_KEY,
            metadata: { protocolName: 'mock protocol name' },
          },
        },
      } as any)
    vi.mocked(useRunTimestamps).mockReturnValue({
      startedAt: '2022-05-04T18:24:40.833862+00:00',
      pausedAt: '',
      stoppedAt: '',
      completedAt: '2022-05-04T18:24:41.833862+00:00',
    })
    when(vi.mocked(useRunActionMutations)).calledWith(RUN_ID).thenReturn({
      playRun: mockPlayRun,
      pauseRun: mockPauseRun,
      stopRun: mockStopRun,
      resumeRunFromRecovery: mockResumeRunFromRecovery,
      resumeRunFromRecoveryAssumingFalsePositive: mockResumeRunFromRecoveryAssumingFalsePositive,
      isPlayRunActionLoading: false,
      isPauseRunActionLoading: false,
      isStopRunActionLoading: false,
      isResumeRunFromRecoveryActionLoading: false,
      isResumeRunFromRecoveryAssumingFalsePositiveActionLoading: false,
    })
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(mockRobotSideAnalysis)
    when(vi.mocked(useNotifyAllCommandsQuery))
      .calledWith(RUN_ID, {
        pageLength: 1,
      })
      .thenReturn(mockUseAllCommandsResponseNonDeterministic)
    vi.mocked(useLastRunCommand).mockReturnValue({
      key: 'FAKE_COMMAND_KEY',
    } as RunCommandSummary)
    when(vi.mocked(useFeatureFlag))
      .calledWith('enableRunNotes')
      .thenReturn(true)
    vi.mocked(ErrorRecoveryFlows).mockReturnValue(
      <div>MOCK ERROR RECOVERY</div>
    )
    vi.mocked(useErrorRecoveryFlows).mockReturnValue({
      isERActive: false,
      failedCommand: {} as any,
      runLwDefsByUri: {} as any,
    })
    vi.mocked(useInterventionModal).mockReturnValue({
      showModal: false,
      modalProps: {} as any,
    })
    vi.mocked(InterventionModal).mockReturnValue(
      <div>MOCK_INTERVENTION_MODAL</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render Skeleton when robotSideAnalysis does not have data', () => {
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(null)
    render(`/runs/${RUN_ID}/run`)
    expect(vi.mocked(RunningProtocolSkeleton)).toHaveBeenCalled()
  })
  it('should render the canceling run modal when run status is stop requested', () => {
    when(vi.mocked(useRunStatus))
      .calledWith(RUN_ID, { refetchInterval: 5000 })
      .thenReturn(RUN_STATUS_STOP_REQUESTED)
    render(`/runs/${RUN_ID}/run`)
    expect(vi.mocked(CancelingRunModal)).toHaveBeenCalled()
  })
  it('should render CurrentRunningProtocolCommand when loaded the data', () => {
    render(`/runs/${RUN_ID}/run`)
    expect(vi.mocked(CurrentRunningProtocolCommand)).toHaveBeenCalled()
  })

  it('should render open door alert modal, when run staus is blocked by open door', () => {
    when(vi.mocked(useRunStatus))
      .calledWith(RUN_ID, { refetchInterval: 5000 })
      .thenReturn(RUN_STATUS_BLOCKED_BY_OPEN_DOOR)
    render(`/runs/${RUN_ID}/run`)
    expect(vi.mocked(OpenDoorAlertModal)).toHaveBeenCalled()
  })

  it(`should render not open door alert modal, when run status is ${RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR}`, () => {
    when(vi.mocked(useRunStatus))
      .calledWith(RUN_ID, { refetchInterval: 5000 })
      .thenReturn(RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR)
    render(`/runs/${RUN_ID}/run`)
    expect(vi.mocked(OpenDoorAlertModal)).not.toHaveBeenCalled()
  })

  it(`should display a Run Paused splash screen if the run status is "${RUN_STATUS_AWAITING_RECOVERY}"`, () => {
    when(vi.mocked(useRunStatus))
      .calledWith(RUN_ID, { refetchInterval: 5000 })
      .thenReturn(RUN_STATUS_AWAITING_RECOVERY)
    render(`/runs/${RUN_ID}/run`)
  })

  it('should render ErrorRecovery appropriately', () => {
    render(`/runs/${RUN_ID}/run`)
    expect(screen.queryByText('MOCK ERROR RECOVERY')).not.toBeInTheDocument()

    vi.mocked(useErrorRecoveryFlows).mockReturnValue({
      isERActive: true,
      failedCommand: {} as any,
      runLwDefsByUri: {} as any,
    })
    render(`/runs/${RUN_ID}/run`)
    screen.getByText('MOCK ERROR RECOVERY')
  })

  it('should render an InterventionModal appropriately', () => {
    vi.mocked(useInterventionModal).mockReturnValue({
      showModal: true,
      modalProps: {} as any,
    })
    render(`/runs/${RUN_ID}/run`)

    screen.getByText('MOCK_INTERVENTION_MODAL')
  })

  // ToDo (kj:04/04/2023) need to figure out the way to simulate swipe
  it.todo('should render RunningProtocolCommandList when swiping left')
  // const [{ getByText }] = render(`/runs/${RUN_ID}/run`)
  // const targetScreen = getByText('mock CurrentRunningProtocolCommand')
  // fireEvent.dragStart(targetScreen)
  // fireEvent.dragEnd(targetScreen)
  // getByText('mock RunningProtocolCommandList')

  it.todo('should render CurrentRunningProtocolCommand when swiping right')
})
