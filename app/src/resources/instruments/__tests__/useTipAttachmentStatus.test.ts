import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import {
  getCommands,
  getInstruments,
  getRunCurrentState,
} from '@opentrons/api-client'
import { getPipetteModelSpecs } from '@opentrons/shared-data'
import { useHost } from '@opentrons/react-api-client'

import { mockPipetteInfo } from '/app/redux/pipettes/__fixtures__'
import { useTipAttachmentStatus } from '../useTipAttachmentStatus'

import type { PipetteModelSpecs } from '@opentrons/shared-data'
import type { PipetteData } from '@opentrons/api-client'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getPipetteModelSpecs>()
  return {
    ...actual,
    getPipetteModelSpecs: vi.fn(),
  }
})
vi.mock('@opentrons/api-client')
vi.mock('@opentrons/react-api-client')

const MOCK_HOST = { ip: '1.2.3.4', port: 31950 } as any
const MOCK_RUN_ID = 'run-123'

const MOCK_ACTUAL_PIPETTE = {
  ...mockPipetteInfo.pipetteSpecs,
  model: 'model',
  tipLength: {
    value: 20,
  },
} as PipetteModelSpecs

const mockPipetteData: PipetteData = {
  mount: 'left',
  instrumentType: 'pipette',
  instrumentModel: 'p1000_single_v3.6',
  ok: true,
} as any

const mockSecondPipetteData: PipetteData = {
  ...mockPipetteData,
  mount: 'right',
}

const mockRunRecord = {
  data: {
    pipettes: [
      { id: 'pipette-1', mount: 'left' },
      { id: 'pipette-2', mount: 'right' },
    ],
  },
} as any

const mockTipStates = {
  'pipette-1': { hasTip: true },
  'pipette-2': { hasTip: true },
}

describe('useTipAttachmentStatus', () => {
  beforeEach(() => {
    vi.mocked(useHost).mockReturnValue(MOCK_HOST)
    vi.mocked(getPipetteModelSpecs).mockReturnValue(MOCK_ACTUAL_PIPETTE)

    vi.mocked(getInstruments).mockResolvedValue({
      data: { data: [mockPipetteData, mockSecondPipetteData] },
    } as any)

    vi.mocked(getRunCurrentState).mockResolvedValue({
      data: { data: { tipStates: mockTipStates } },
    } as any)

    vi.mocked(getCommands).mockResolvedValue({
      data: { data: [{ commandType: 'mockType' }] },
    } as any)
  })

  const renderTipAttachmentStatus = () => {
    return renderHook(() =>
      useTipAttachmentStatus({
        runId: MOCK_RUN_ID,
        runRecord: mockRunRecord,
      })
    )
  }

  it('should return the correct initial state', async () => {
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    expect(result.current.areTipsAttached).toBe(false)
    expect(result.current.aPipetteWithTip).toEqual(null)
    expect(result.current.initialPipettesWithTipsCount).toEqual(null)
  })

  it('should determine tip status and update state accordingly', async () => {
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.areTipsAttached).toBe(true)
    expect(result.current.aPipetteWithTip).toMatchObject({
      mount: 'left',
      specs: MOCK_ACTUAL_PIPETTE,
    })
    expect(result.current.initialPipettesWithTipsCount).toBe(2)
  })

  it('should handle network errors', async () => {
    vi.mocked(getInstruments).mockRejectedValueOnce(new Error('Error'))
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.areTipsAttached).toBe(false)
    expect(result.current.aPipetteWithTip).toBeNull()
  })

  it('should reset tip status', async () => {
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    act(() => {
      result.current.resetTipStatus()
    })

    expect(result.current.areTipsAttached).toBe(false)
    expect(result.current.aPipetteWithTip).toEqual(null)
    expect(result.current.initialPipettesWithTipsCount).toEqual(null)
  })

  it('should set tip status resolved and a  state', async () => {
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.aPipetteWithTip).toMatchObject({
      mount: 'left',
      specs: MOCK_ACTUAL_PIPETTE,
    })

    act(() => {
      result.current.setTipStatusResolved()
    })

    await waitFor(() =>
      expect(result.current.aPipetteWithTip?.mount).toBe('right')
    )
  })

  it('should call onEmptyCache callback when cache becomes empty', async () => {
    vi.mocked(getRunCurrentState).mockResolvedValueOnce({
      data: {
        data: {
          tipStates: {
            'pipette-1': { hasTip: true },
            'pipette-2': { hasTip: false },
          },
        },
      },
    } as any)

    const onEmptyCacheMock = vi.fn()
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.aPipetteWithTip).toMatchObject({
      mount: 'left',
      specs: MOCK_ACTUAL_PIPETTE,
    })

    act(() => {
      result.current.setTipStatusResolved(onEmptyCacheMock)
    })

    await waitFor(() => {
      expect(onEmptyCacheMock).toHaveBeenCalled()
    })
  })

  it('should handle tipPhysicallyMissing error by assuming tip is attached', async () => {
    vi.mocked(getCommands).mockResolvedValueOnce({
      data: {
        data: [
          {
            error: {
              errorType: 'tipPhysicallyMissing',
            },
          },
        ],
      },
    } as any)

    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.areTipsAttached).toBe(true)
  })

  it('should call onTipsDetected callback when tips remain after resolution', async () => {
    const onTipsDetectedMock = vi.fn()
    const { result } = renderTipAttachmentStatus()

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    await act(async () => {
      await result.current.determineTipStatus()
    })

    expect(result.current.aPipetteWithTip).toMatchObject({
      mount: 'left',
      specs: MOCK_ACTUAL_PIPETTE,
    })

    act(() => {
      result.current.setTipStatusResolved(undefined, onTipsDetectedMock)
    })

    await waitFor(() => {
      expect(onTipsDetectedMock).toHaveBeenCalled()
    })

    expect(result.current.aPipetteWithTip).toMatchObject({
      mount: 'right',
      specs: MOCK_ACTUAL_PIPETTE,
    })
  })
})
