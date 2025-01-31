import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RUN_STATUS_RUNNING, RUN_STATUS_IDLE } from '@opentrons/api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRobotSideAnalysis } from '/app/molecules/Command/__fixtures__'
import { CurrentRunningProtocolCommand } from '../CurrentRunningProtocolCommand'
import { useRunningStepCounts } from '/app/resources/protocols/hooks'
import { useNotifyAllCommandsQuery } from '/app/resources/runs'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import type { ComponentProps } from 'react'

vi.mock('/app/resources/runs')
vi.mock('/app/resources/protocols/hooks')

const mockPlayRun = vi.fn()
const mockPauseRun = vi.fn()
const mockShowModal = vi.fn()
const mockUpdateLastAnimatedCommand = vi.fn()

const mockRunTimer = {
  runStatus: RUN_STATUS_RUNNING,
  startedAt: '2022-05-04T18:24:40.833862+00:00',
  stoppedAt: '',
  completedAt: '2022-05-04T18:24:41.833862+00:00',
}

const render = (
  props: ComponentProps<typeof CurrentRunningProtocolCommand>
) => {
  return renderWithProviders(<CurrentRunningProtocolCommand {...props} />, {
    i18nInstance: i18n,
  })
}

describe('CurrentRunningProtocolCommand', () => {
  let props: ComponentProps<typeof CurrentRunningProtocolCommand>

  beforeEach(() => {
    props = {
      runStatus: RUN_STATUS_RUNNING,
      robotSideAnalysis: mockRobotSideAnalysis,
      runTimerInfo: mockRunTimer,
      playRun: mockPlayRun,
      pauseRun: mockPauseRun,
      setShowConfirmCancelRunModal: mockShowModal,
      trackProtocolRunEvent: vi.fn(), // temporary
      robotAnalyticsData: {} as any,
      protocolName: 'mockRunningProtocolName',
      currentRunCommandIndex: 0,
      lastAnimatedCommand: null,
      lastRunCommand: null,
      updateLastAnimatedCommand: mockUpdateLastAnimatedCommand,
      robotType: FLEX_ROBOT_TYPE,
      runId: 'MOCK_RUN_ID',
      allRunDefs: [],
    }

    vi.mocked(useNotifyAllCommandsQuery).mockReturnValue({} as any)
    vi.mocked(useRunningStepCounts).mockReturnValue({
      totalStepCount: 10,
      currentStepNumber: 5,
      hasRunDiverged: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Running')
    screen.getByText('mockRunningProtocolName')
    screen.getByText('00:00:01')
    screen.getByText('Load P300 Single-Channel GEN1 in Left Mount')
    screen.getByLabelText('stop')
    screen.getByLabelText('pause')
  })

  it('should render play button when runStatus is idle', () => {
    props = {
      ...props,
      runStatus: RUN_STATUS_IDLE,
    }
    render(props)
    screen.getByLabelText('play')
  })

  it('when tapping stop button, the modal is showing up', () => {
    render(props)
    const button = screen.getByLabelText('stop')
    fireEvent.click(button)
    expect(mockShowModal).toHaveBeenCalled()
  })

  it('updates the last animated command when it is not the current command', () => {
    const [{ rerender }] = render(props)
    expect(mockUpdateLastAnimatedCommand).toHaveBeenLastCalledWith('-113949561')
    rerender(
      <CurrentRunningProtocolCommand
        {...props}
        lastAnimatedCommand="-113949561"
      />
    ) // won't trigger an update because the key matches
    const newProps = { ...props, lastAnimatedCommand: 'aNewCommandKey' }
    rerender(<CurrentRunningProtocolCommand {...newProps} />)
    expect(mockUpdateLastAnimatedCommand).toHaveBeenLastCalledWith('-113949561')
    expect(mockUpdateLastAnimatedCommand).toHaveBeenCalledTimes(2)
  })

  it('renders the step count in appropriate format if values are present', () => {
    render(props)

    screen.getByText('Step 5/10')
  })

  it('renders the step count in appropriate format if values are not present', () => {
    vi.mocked(useRunningStepCounts).mockReturnValue({
      totalStepCount: null,
      currentStepNumber: null,
      hasRunDiverged: true,
    })
    render(props)

    screen.getByText('Step: N/A')
  })

  // ToDo (kj:04/10/2023) once we fix the track event stuff, we can implement tests
  it.todo('when tapping play button, track event mock function is called')
})
