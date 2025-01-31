import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { useCommandQuery } from '@opentrons/react-api-client'
import {
  RUN_STATUS_IDLE,
  RUN_STATUS_RUNNING,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_STOPPED,
} from '@opentrons/api-client'

import { i18n } from '/app/i18n'
import {
  useInterventionModal,
  InterventionModal,
} from '/app/organisms/InterventionModal'
import { ProgressBar } from '/app/atoms/ProgressBar'
import { useRunControls } from '/app/organisms/RunTimeControl'
import {
  useNotifyRunQuery,
  useNotifyAllCommandsQuery,
  useRunStatus,
  useMostRecentCompletedAnalysis,
  useLastRunCommand,
} from '/app/resources/runs'
import { useDownloadRunLog } from '../../Devices/hooks'
import {
  mockUseAllCommandsResponseNonDeterministic,
  mockUseCommandResultNonDeterministic,
  NON_DETERMINISTIC_COMMAND_KEY,
} from '../__fixtures__'

import { RunProgressMeter } from '..'
import { renderWithProviders } from '/app/__testing-utils__'
import { useRunningStepCounts } from '/app/resources/protocols/hooks'

import type { ComponentProps } from 'react'
import type { RunCommandSummary } from '@opentrons/api-client'
import type * as ApiClient from '@opentrons/react-api-client'

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ApiClient>()
  return {
    ...actual,
    useCommandQuery: vi.fn(),
  }
})
vi.mock('/app/organisms/RunTimeControl')
vi.mock('/app/resources/runs')
vi.mock('/app/atoms/ProgressBar')
vi.mock('/app/organisms/InterventionModal')
vi.mock('../../Devices/hooks')
vi.mock('/app/resources/protocols/hooks')
vi.mock('/app/redux-resources/robots')

const render = (props: ComponentProps<typeof RunProgressMeter>) => {
  return renderWithProviders(<RunProgressMeter {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const NON_DETERMINISTIC_RUN_ID = 'nonDeterministicID'
const ROBOT_NAME = 'otie'

describe('RunProgressMeter', () => {
  let props: ComponentProps<typeof RunProgressMeter>
  beforeEach(() => {
    vi.mocked(ProgressBar).mockReturnValue(<div>MOCK PROGRESS BAR</div>)
    vi.mocked(InterventionModal).mockReturnValue(
      <div>MOCK_INTERVENTION_MODAL</div>
    )
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_RUNNING)
    when(useMostRecentCompletedAnalysis)
      .calledWith(NON_DETERMINISTIC_RUN_ID)
      .thenReturn(null)
    when(useNotifyAllCommandsQuery)
      .calledWith(NON_DETERMINISTIC_RUN_ID, {
        pageLength: 1,
      })
      .thenReturn(mockUseAllCommandsResponseNonDeterministic)
    when(useCommandQuery)
      .calledWith(NON_DETERMINISTIC_RUN_ID, NON_DETERMINISTIC_COMMAND_KEY)
      .thenReturn(mockUseCommandResultNonDeterministic)
    vi.mocked(useDownloadRunLog).mockReturnValue({
      downloadRunLog: vi.fn(),
      isRunLogLoading: false,
    })
    when(useLastRunCommand)
      .calledWith(NON_DETERMINISTIC_RUN_ID, { refetchInterval: 1000 })
      .thenReturn({ key: NON_DETERMINISTIC_COMMAND_KEY } as RunCommandSummary)

    vi.mocked(useNotifyRunQuery).mockReturnValue({ data: null } as any)
    vi.mocked(useRunningStepCounts).mockReturnValue({
      totalStepCount: null,
      currentStepNumber: null,
      hasRunDiverged: true,
    })
    vi.mocked(useInterventionModal).mockReturnValue({
      showModal: false,
      modalProps: {} as any,
    })
    vi.mocked(useRunControls).mockReturnValue({ play: vi.fn() } as any)

    props = {
      runId: NON_DETERMINISTIC_RUN_ID,
      robotName: ROBOT_NAME,
      makeHandleJumpToStep: vi.fn(),
    }
  })

  it('should show only the total count of commands in run and not show the meter when protocol is non-deterministic', () => {
    vi.mocked(useCommandQuery).mockReturnValue({ data: null } as any)
    render(props)
    expect(screen.getByText('Current Step N/A:')).toBeTruthy()
    expect(screen.queryByText('MOCK PROGRESS BAR')).toBeFalsy()
  })
  it('should give the correct info when run status is idle', () => {
    vi.mocked(useCommandQuery).mockReturnValue({ data: null } as any)
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_IDLE)
    render(props)
    screen.getByText('Current Step:')
    screen.getByText('Not started yet')
    screen.getByText('Download run log')
  })

  it('should render an intervention modal when showInterventionModal is true', () => {
    vi.mocked(useCommandQuery).mockReturnValue({ data: null } as any)
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_IDLE)
    vi.mocked(useInterventionModal).mockReturnValue({
      showModal: true,
      modalProps: {} as any,
    })

    render(props)

    screen.getByText('MOCK_INTERVENTION_MODAL')
  })

  it('should render the correct run status when run status is completed', () => {
    vi.mocked(useCommandQuery).mockReturnValue({ data: null } as any)
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_SUCCEEDED)
    vi.mocked(useRunningStepCounts).mockReturnValue({
      totalStepCount: 10,
      currentStepNumber: 10,
      hasRunDiverged: false,
    })
    render(props)
    screen.getByText('Final Step 10/10:')
  })

  it('should render the correct step info when the run is cancelled before running', () => {
    vi.mocked(useCommandQuery).mockReturnValue({ data: null } as any)
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_STOPPED)
    render(props)
    screen.getByText('Final Step: N/A')
  })
})
