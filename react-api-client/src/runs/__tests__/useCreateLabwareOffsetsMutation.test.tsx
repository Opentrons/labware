import type * as React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createLabwareOffset } from '@opentrons/api-client'
import { useHost } from '../../api'

import { useCreateLabwareOffsetMutation } from '../useCreateLabwareOffsetMutation'
import type {
  HostConfig,
  LegacyLabwareOffsetCreateData,
} from '@opentrons/api-client'

vi.mock('@opentrons/api-client')
vi.mock('../../api/useHost')

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const RUN_ID = 'run_id'
const DEFINITION_URI = 'definition_uri'
const LABWARE_LOCATION = { slotName: '4' }
const OFFSET = { x: 1, y: 2, z: 3 }

describe('useCreateLabwareOffsetMutation hook', () => {
  let wrapper: React.FunctionComponent<{ children: React.ReactNode }>
  let labwareOffset: LegacyLabwareOffsetCreateData

  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{
      children: React.ReactNode
    }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
    labwareOffset = {
      definitionUri: DEFINITION_URI,
      location: LABWARE_LOCATION,
      vector: OFFSET,
    }
  })

  it('should create labware offsets when callback is called', async () => {
    vi.mocked(useHost).mockReturnValue(HOST_CONFIG)
    vi.mocked(createLabwareOffset).mockResolvedValue({
      data: 'created offsets!',
    } as any)

    const { result } = renderHook(useCreateLabwareOffsetMutation, {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
    act(() => {
      result.current.createLabwareOffset({
        runId: RUN_ID,
        data: labwareOffset,
      })
    })
    await waitFor(() => {
      expect(result.current.data).toBe('created offsets!')
    })
  })
})
