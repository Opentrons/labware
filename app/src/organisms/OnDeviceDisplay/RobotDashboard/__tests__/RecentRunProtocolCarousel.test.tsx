import * as React from 'react'
import { UseQueryResult } from 'react-query'

import { renderWithProviders } from '@opentrons/components'
import { useAllRunsQuery } from '@opentrons/react-api-client'

import { RecentProtocolRunCard, RecentRunProtocolCarousel } from '..'

import type { ProtocolResource } from '@opentrons/shared-data'
import type { Runs } from '@opentrons/api-client'

jest.mock('@opentrons/react-api-client')
jest.mock('../RecentProtocolRunCard')

const mockSortedProtocol = [
  {
    analysisSummaries: [],
    createdAt: '2023-04-11T00:44:20.669922+00:00',
    files: [
      {
        name: 'Mock Protocol',
        role: '',
      },
    ],
    id: 'mockSortedProtocolID',
    key: 'mockKey',
    metadata: {
      author: 'New API User',
      description: 'mock protocol',
      name: 'Mock Protocol',
    },
    protocolType: 'python',
  },
] as ProtocolResource[]

const mockRun = {
  actions: [],
  completedAt: '2023-04-12T15:14:13.811757+00:00',
  createdAt: '2023-04-12T15:13:52.110602+00:00',
  current: false,
  errors: [],
  id: '853a3fae-8043-47de-8f03-5d28b3ee3d35',
  labware: [],
  labwareOffsets: [],
  liquids: [],
  modules: [],
  pipettes: [],
  protocolId: 'mockSortedProtocolID',
  status: 'stopped',
}

const mockRecentProtocolRunCard = RecentProtocolRunCard as jest.MockedFunction<
  typeof RecentProtocolRunCard
>
const mockUseAllRunsQuery = useAllRunsQuery as jest.MockedFunction<
  typeof useAllRunsQuery
>

const render = (
  props: React.ComponentProps<typeof RecentRunProtocolCarousel>
) => {
  return renderWithProviders(<RecentRunProtocolCarousel {...props} />)
}

describe('RecentRunProtocolCarousel', () => {
  let props: React.ComponentProps<typeof RecentRunProtocolCarousel>

  beforeEach(() => {
    props = {
      sortedProtocols: mockSortedProtocol,
    }
    mockRecentProtocolRunCard.mockReturnValue(
      <div>mock RecentProtocolRunCard</div>
    )
    mockUseAllRunsQuery.mockReturnValue({ data: { data: [mockRun] } } as any)
  })

  it('should render RecentRunProtocolCard', () => {
    const [{ getByText }] = render(props)
    getByText('mock RecentProtocolRunCard')
  })

  // Note(kj:04/14/2023) still looking for a way to test swipe gesture in a unit test
  it.todo('test swipe gesture')
})
