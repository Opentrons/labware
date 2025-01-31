import { act, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ChooseRobotToRunProtocolSlideout } from '/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
} from '/app/redux/analytics'
import { getValidCustomLabwareFiles } from '/app/redux/custom-labware/selectors'
import {
  getConnectableRobots,
  getReachableRobots,
  getScanning,
  getUnreachableRobots,
} from '/app/redux/discovery'
import { getIsProtocolAnalysisInProgress } from '/app/redux/protocol-storage/selectors'
import {
  mockConnectableRobot,
  mockReachableRobot,
  mockUnreachableRobot,
} from '/app/redux/discovery/__fixtures__'
import { storedProtocolData } from '/app/redux/protocol-storage/__fixtures__'
import { ProtocolDetails } from '..'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type { ProtocolAnalysisOutput } from '@opentrons/shared-data'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/custom-labware/selectors')
vi.mock('/app/redux/discovery/selectors')
vi.mock('/app/redux/protocol-storage/selectors')
vi.mock('/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout')
vi.mock('/app/organisms/Desktop/SendProtocolToFlexSlideout')

const render = (
  props: Partial<ComponentProps<typeof ProtocolDetails>> = {}
) => {
  return renderWithProviders(
    <MemoryRouter>
      <ProtocolDetails
        {...{ ...storedProtocolData, ...props, groupedCommands: null }}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

const protocolType = 'json'
const schemaVersion = 6
const author = 'Otie'
const createdAt = '2022-05-04T18:33:48.916159+00:00'
const description = 'fake protocol description'

const mockMostRecentAnalysis: ProtocolAnalysisOutput = storedProtocolData.mostRecentAnalysis as ProtocolAnalysisOutput

let mockTrackEvent: Mock

describe('ProtocolDetails', () => {
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(getValidCustomLabwareFiles).mockReturnValue([])
    vi.mocked(getConnectableRobots).mockReturnValue([mockConnectableRobot])
    vi.mocked(getUnreachableRobots).mockReturnValue([mockUnreachableRobot])
    vi.mocked(getReachableRobots).mockReturnValue([mockReachableRobot])
    vi.mocked(getScanning).mockReturnValue(false)

    vi.mocked(ChooseRobotToRunProtocolSlideout).mockReturnValue(
      <div>close ChooseRobotToRunProtocolSlideout</div>
    )
    vi.mocked(getIsProtocolAnalysisInProgress).mockReturnValue(false)
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders protocol title as display name if present in metadata', () => {
    const protocolName = 'fakeProtocolDisplayName'
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
          protocolName,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    screen.getByText('fakeProtocolDisplayName')
  })
  it('renders protocol title as file name if not in metadata', () => {
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
          author,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    expect(screen.getByText('fakeSrcFileName')).toBeInTheDocument()
  })
  it('renders deck view section', () => {
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    expect(
      screen.getByRole('heading', { name: 'Deck View' })
    ).toBeInTheDocument()
    screen.getByText('close ChooseRobotToRunProtocolSlideout')
  })
  it('opens choose robot to run protocol slideout when Start setup button is clicked', async () => {
    vi.mocked(ChooseRobotToRunProtocolSlideout).mockReturnValue(
      <div>open ChooseRobotToRunProtocolSlideout</div>
    )
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    const runProtocolButton = screen.getByRole('button', {
      name: 'Start setup',
    })
    act(() => {
      runProtocolButton.click()
    })
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith({
        name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
        properties: { sourceLocation: 'ProtocolsDetail' },
      })
    })
    screen.getByText('open ChooseRobotToRunProtocolSlideout')
  })
  it('renders the protocol creation method', () => {
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    screen.getByRole('heading', { name: 'creation method' })
    screen.getByText('Protocol Designer 6.0')
  })
  it('renders the last analyzed date', () => {
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    screen.getByRole('heading', { name: 'last analyzed' })
  })
  it('renders the protocol description', () => {
    render({
      mostRecentAnalysis: {
        ...mockMostRecentAnalysis,
        createdAt,
        metadata: {
          ...mockMostRecentAnalysis.metadata,
          description,
        },
        config: {
          ...mockMostRecentAnalysis.config,
          protocolType,
          schemaVersion,
        },
      },
    })
    screen.getByRole('heading', { name: 'description' })
    screen.getByText('fake protocol description')
  })
})
