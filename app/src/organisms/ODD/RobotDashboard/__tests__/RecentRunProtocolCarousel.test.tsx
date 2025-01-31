import { screen } from '@testing-library/react'
import { beforeEach, describe, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { useNotifyAllRunsQuery } from '/app/resources/runs'
import { RecentRunProtocolCard, RecentRunProtocolCarousel } from '..'

import type { ComponentProps } from 'react'
import type { RunData } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('../RecentRunProtocolCard')
vi.mock('/app/resources/runs')

const mockRun = {
  actions: [],
  completedAt: '2023-04-12T15:14:13.811757+00:00',
  createdAt: '2023-04-12T15:13:52.110602+00:00',
  current: false,
  errors: [],
  hasEverEnteredErrorRecovery: false,
  id: '853a3fae-8043-47de-8f03-5d28b3ee3d35',
  labware: [],
  labwareOffsets: [],
  liquids: [],
  modules: [],
  pipettes: [],
  protocolId: 'mockSortedProtocolID',
  status: 'stopped',
  runTimeParameters: [],
}

const render = (props: ComponentProps<typeof RecentRunProtocolCarousel>) => {
  return renderWithProviders(<RecentRunProtocolCarousel {...props} />)
}

describe('RecentRunProtocolCarousel', () => {
  let props: ComponentProps<typeof RecentRunProtocolCarousel>

  beforeEach(() => {
    props = {
      recentRunsOfUniqueProtocols: [mockRun as RunData],
    }
    vi.mocked(RecentRunProtocolCard).mockReturnValue(
      <div>mock RecentRunProtocolCard</div>
    )
    vi.mocked(useNotifyAllRunsQuery).mockReturnValue({
      data: { data: [mockRun] },
    } as any)
  })

  it('should render RecentRunProtocolCard', () => {
    render(props)
    screen.getByText('mock RecentRunProtocolCard')
  })

  // Note(kj:04/14/2023) still looking for a way to test swipe gesture in a unit test
  it.todo('test swipe gesture')
})
