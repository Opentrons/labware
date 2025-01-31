import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useRunLoadedLabwareDefinitions } from '@opentrons/react-api-client'
import { fixture96Plate } from '@opentrons/shared-data'

import { useRunLoadedLabwareDefinitionsByUri } from '/app/resources/runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')

const mockLabwareDef = fixture96Plate as LabwareDefinition2

describe('useRunLoadedLabwareDefinitionsByUri', () => {
  beforeEach(() => {
    vi.mocked(useRunLoadedLabwareDefinitions).mockReturnValue({
      data: { data: [mockLabwareDef] },
    } as any)
  })

  it('returns a record of labware definitions keyed by URI', () => {
    const { result } = renderHook(() =>
      useRunLoadedLabwareDefinitionsByUri('mockId')
    )

    expect(result.current).toEqual({
      'fixture/fixture_96_plate/1': mockLabwareDef,
    })
  })
})
