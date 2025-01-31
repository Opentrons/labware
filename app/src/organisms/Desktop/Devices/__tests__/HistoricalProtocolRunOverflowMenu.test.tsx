import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { when } from 'vitest-when'
import { MemoryRouter } from 'react-router-dom'

import { useDeleteRunMutation } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import runRecord from '../ProtocolRun/ProtocolRunHeader/RunHeaderModalContainer/modals/__fixtures__/runRecord.json'
import { useDownloadRunLog } from '../hooks'
import { useRobot } from '/app/redux-resources/robots'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import { useRunControls } from '/app/organisms/RunTimeControl'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
} from '/app/redux/analytics'
import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'
import { useIsEstopNotDisengaged } from '/app/resources/devices'
import { HistoricalProtocolRunOverflowMenu } from '../HistoricalProtocolRunOverflowMenu'
import { useNotifyAllCommandsQuery } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type { UseQueryResult } from 'react-query'
import type { CommandsData } from '@opentrons/api-client'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/robot-update/selectors')
vi.mock('/app/redux-resources/robots')
vi.mock('../hooks')
vi.mock('/app/organisms/RunTimeControl')
vi.mock('/app/redux/analytics')
vi.mock('/app/redux/config')
vi.mock('/app/resources/devices')
vi.mock('/app/resources/runs')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux-resources/analytics')
vi.mock('@opentrons/react-api-client')

const render = (
  props: ComponentProps<typeof HistoricalProtocolRunOverflowMenu>
) => {
  return renderWithProviders(
    <MemoryRouter>
      <HistoricalProtocolRunOverflowMenu {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}
const PAGE_LENGTH = 101
const RUN_ID = 'id'
const ROBOT_NAME = 'otie'
let mockTrackEvent: any
let mockTrackProtocolRunEvent: any
const mockDownloadRunLog = vi.fn()

describe('HistoricalProtocolRunOverflowMenu', () => {
  let props: ComponentProps<typeof HistoricalProtocolRunOverflowMenu>
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    mockTrackProtocolRunEvent = vi.fn(() => new Promise(resolve => resolve({})))
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(false)
    vi.mocked(useDownloadRunLog).mockReturnValue({
      downloadRunLog: mockDownloadRunLog,
      isRunLogLoading: false,
    })
    vi.mocked(useDeleteRunMutation).mockReturnValue({
      deleteRun: vi.fn(),
    } as any)

    when(useTrackProtocolRunEvent).calledWith(RUN_ID, ROBOT_NAME).thenReturn({
      trackProtocolRunEvent: mockTrackProtocolRunEvent,
    })
    when(useRunControls)
      .calledWith(RUN_ID, expect.anything())
      .thenReturn({
        play: () => {},
        pause: () => {},
        stop: () => {},
        reset: () => {},
        resumeFromRecovery: () => {},
        isPlayRunActionLoading: false,
        isPauseRunActionLoading: false,
        isStopRunActionLoading: false,
        isResetRunLoading: false,
        isResumeRunFromRecoveryActionLoading: false,
        isRunControlLoading: false,
      })
    when(useNotifyAllCommandsQuery)
      .calledWith(
        RUN_ID,
        {
          cursor: 0,
          pageLength: PAGE_LENGTH,
        },
        { staleTime: Infinity }
      )
      .thenReturn(({
        data: { data: runRecord.data.commands, meta: { totalLength: 14 } },
      } as unknown) as UseQueryResult<CommandsData>)
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(false)
    props = {
      runId: RUN_ID,
      robotName: ROBOT_NAME,
      robotIsBusy: false,
    }
    when(vi.mocked(useRobot))
      .calledWith(ROBOT_NAME)
      .thenReturn(mockConnectableRobot)
  })

  it('renders the correct menu when a runId is present', () => {
    render(props)

    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    screen.getByRole('button', {
      name: 'View protocol run record',
    })
    const rerunBtn = screen.getByRole('button', { name: 'Rerun protocol now' })
    screen.getByRole('button', { name: 'Download protocol run log' })
    const deleteBtn = screen.getByRole('button', {
      name: 'Delete protocol run record',
    })
    fireEvent.click(rerunBtn)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: {
        robotSerialNumber: 'mock-serial',
        sourceLocation: 'HistoricalProtocolRun',
      },
    })
    expect(useRunControls).toHaveBeenCalled()
    expect(mockTrackProtocolRunEvent).toHaveBeenCalled()
    fireEvent.click(deleteBtn)
    expect(useDeleteRunMutation).toHaveBeenCalled()
  })

  it('disables the rerun protocol menu item if robot software update is available', () => {
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(true)
    render(props)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    screen.getByRole('button', {
      name: 'View protocol run record',
    })
    const rerunBtn = screen.getByRole('button', { name: 'Rerun protocol now' })
    expect(rerunBtn).toBeDisabled()
  })

  it('disables the rerun protocol menu item if run data is loading', () => {
    when(useRunControls)
      .calledWith(RUN_ID, expect.anything())
      .thenReturn({
        play: () => {},
        pause: () => {},
        stop: () => {},
        reset: () => {},
        resumeFromRecovery: () => {},
        isPlayRunActionLoading: false,
        isPauseRunActionLoading: false,
        isStopRunActionLoading: false,
        isResetRunLoading: false,
        isResumeRunFromRecoveryActionLoading: false,
        isRunControlLoading: true,
      })
    render(props)
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    screen.getByRole('button', {
      name: 'View protocol run record',
    })
    const rerunBtn = screen.getByRole('button', { name: 'Rerun protocol now' })
    expect(rerunBtn).toBeDisabled()
  })

  it('should make overflow menu disabled when e-stop is pressed', () => {
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(true)
    render(props)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
