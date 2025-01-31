import { vi, it, expect, describe, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import {
  instrumentsResponseLeftPipetteFixture,
  instrumentsResponseRightPipetteFixture,
} from '@opentrons/api-client'
import { useIsOEMMode } from '/app/resources/robot-settings/hooks'
import { useAttachedPipettesFromInstrumentsQuery } from '..'
import type { FunctionComponent, ReactNode } from 'react'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/robot-settings/hooks')

describe('useAttachedPipettesFromInstrumentsQuery hook', () => {
  beforeEach(() => {
    vi.mocked(useIsOEMMode).mockReturnValue(false)
  })

  let wrapper: FunctionComponent<{ children: ReactNode }>
  it('returns attached pipettes', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          instrumentsResponseLeftPipetteFixture,
          instrumentsResponseRightPipetteFixture,
        ],
      },
    } as any)

    const { result } = renderHook(
      () => useAttachedPipettesFromInstrumentsQuery(),
      {
        wrapper,
      }
    )

    expect(result.current).toEqual({
      left: {
        ...instrumentsResponseLeftPipetteFixture,
        displayName: 'Flex 1-Channel 1000 μL',
      },
      right: {
        ...instrumentsResponseRightPipetteFixture,
        displayName: 'Flex 1-Channel 1000 μL',
      },
    })
  })
})
