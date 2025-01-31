import { fireEvent, screen } from '@testing-library/react'
import { formatDistance } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { when } from 'vitest-when'

import { RUN_STATUS_FAILED } from '@opentrons/api-client'
import { COLORS } from '@opentrons/components'
import {
  useProtocolQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { simpleAnalysisFileFixture } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { Skeleton } from '/app/atoms/Skeleton'
import { useMissingProtocolHardware } from '/app/transformations/commands'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
} from '/app/redux/analytics'
import { useCloneRun, useNotifyAllRunsQuery } from '/app/resources/runs'
import { useRerunnableStatusText } from '../hooks'
import { RecentRunProtocolCard } from '../'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { ProtocolHardware } from '/app/transformations/commands'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@opentrons/react-api-client')
vi.mock('/app/atoms/Skeleton')
vi.mock('/app/transformations/commands')
vi.mock('/app/organisms/RunTimeControl/hooks')
vi.mock('/app/redux/analytics')
vi.mock('../hooks')
vi.mock('/app/resources/runs')
vi.mock('/app/redux-resources/analytics')

const RUN_ID = 'mockRunId'
const ROBOT_NAME = 'otie'

const mockMissingPipette = [
  {
    hardwareType: 'pipette',
    pipetteName: 'p1000_single_flex',
    mount: 'left',
    connected: false,
  },
] as ProtocolHardware[]

const mockMissingModule = [
  {
    hardwareType: 'module',
    moduleModel: 'temperatureModuleV2',
    slot: '1',
    connected: false,
  },
] as ProtocolHardware[]

const missingBoth = [
  {
    hardwareType: 'pipette',
    pipetteName: 'p1000_single_flex',
    mount: 'left',
    connected: false,
  },
  {
    hardwareType: 'module',
    moduleModel: 'temperatureModuleV2',
    slot: '1',
    connected: false,
  },
] as ProtocolHardware[]

const mockRunData = {
  id: RUN_ID,
  createdAt: '2022-05-03T21:36:12.494778+00:00',
  completedAt: '2023-05-03T21:36:12.494778+00:00',
  startedAt: 'thistime',
  protocolId: 'mockProtocolId',
  status: RUN_STATUS_FAILED,
} as any

const mockBadRunData = {
  ...mockRunData,
  ok: false,
  dataError: {
    title: 'Bad run oh no',
  },
} as any

const mockCloneRun = vi.fn()

const render = (props: ComponentProps<typeof RecentRunProtocolCard>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RecentRunProtocolCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockTrackEvent = vi.fn()
const mockTrackProtocolRunEvent = vi.fn(
  () => new Promise(resolve => resolve({}))
)

describe('RecentRunProtocolCard', () => {
  let props: ComponentProps<typeof RecentRunProtocolCard>

  beforeEach(() => {
    props = {
      runData: mockRunData,
    }

    vi.mocked(Skeleton).mockReturnValue(<div>mock Skeleton</div>)
    vi.mocked(useRerunnableStatusText).mockReturnValue('Ready to run')
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: [],
    })
    vi.mocked(useNotifyAllRunsQuery).mockReturnValue({
      data: { data: [mockRunData] },
    } as any)
    vi.mocked(useProtocolQuery).mockReturnValue({
      data: {
        data: {
          metadata: { protocolName: 'mockProtocol' },
          id: 'mockProtocolId',
        },
      },
    } as any)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: {
        ...simpleAnalysisFileFixture,
        runTimeParameters: [],
      },
    } as any)
    when(useTrackProtocolRunEvent).calledWith(RUN_ID, ROBOT_NAME).thenReturn({
      trackProtocolRunEvent: mockTrackProtocolRunEvent,
    })
    vi.mocked(useCloneRun).mockReturnValue({
      cloneRun: mockCloneRun,
      isLoadingRun: false,
      isCloning: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render text', () => {
    render(props)
    const lastRunTime = formatDistance(
      new Date(mockRunData.completedAt),
      new Date(),
      {
        addSuffix: true,
      }
    ).replace('about ', '')
    screen.getByText('Ready to run')
    screen.getByText('mockProtocol')
    screen.getByText(`Failed ${lastRunTime}`)
  })

  it('should render missing chip when missing a pipette', () => {
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: mockMissingPipette,
      isLoading: false,
      conflictedSlots: [],
    })
    vi.mocked(useRerunnableStatusText).mockReturnValue('Missing 1 pipette')
    render(props)
    screen.getByText('Missing 1 pipette')
  })

  it('should render missing chip when conflicted fixture', () => {
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: ['cutoutD3'],
    })
    vi.mocked(useRerunnableStatusText).mockReturnValue('Location conflicts')
    render(props)
    screen.getByText('Location conflicts')
  })

  it('should render missing chip when missing a module', () => {
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: mockMissingModule,
      isLoading: false,
      conflictedSlots: [],
    })
    vi.mocked(useRerunnableStatusText).mockReturnValue('Missing 1 module')
    render(props)
    screen.getByText('Missing 1 module')
  })

  it('should render missing chip (module and pipette) when missing a pipette and a module', () => {
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: missingBoth,
      isLoading: false,
      conflictedSlots: [],
    })
    vi.mocked(useRerunnableStatusText).mockReturnValue('Missing hardware')
    render(props)
    screen.getByText('Missing hardware')
  })

  it('should render bad protocol chip when the protocol is bad even if hardware matches', () => {
    vi.mocked(useNotifyAllRunsQuery).mockReturnValue({
      data: { data: [mockRunData] },
    } as any)
    const propsWithBadRun = { runData: mockBadRunData }
    vi.mocked(useRerunnableStatusText).mockReturnValue(
      'Run could not be loaded'
    )
    render(propsWithBadRun)
    screen.getByText('Run could not be loaded')
  })

  it('when tapping a card, mock functions is called and loading state is activated', () => {
    render(props)
    const button = screen.getByLabelText('RecentRunProtocolCard')
    expect(button).toHaveStyle(`background-color: ${COLORS.green35}`)
    fireEvent.click(button)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: { sourceLocation: 'RecentRunProtocolCard' },
    })
    // TODO(BC, 08/30/23): reintroduce check for tracking when tracking is reintroduced lazily
    // expect(mockTrackProtocolRunEvent).toBeCalledWith({ name: 'runAgain' })
    screen.getByLabelText('icon_ot-spinner')
    expect(button).toHaveStyle(`background-color: ${COLORS.green40}`)
  })

  it('should render the skeleton when react query is loading', () => {
    vi.mocked(useProtocolQuery).mockReturnValue({
      isLoading: true,
      data: { data: { metadata: { protocolName: 'mockProtocol' } } },
    } as any)
    render(props)
    screen.getByText('mock Skeleton')
  })

  it('should push to protocol details if protocol contains runtime parameters', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: simpleAnalysisFileFixture,
    } as any)
    render(props)
    const button = screen.getByLabelText('RecentRunProtocolCard')
    fireEvent.click(button)
    expect(mockNavigate).toBeCalledWith('/protocols/mockProtocolId')
  })
})
