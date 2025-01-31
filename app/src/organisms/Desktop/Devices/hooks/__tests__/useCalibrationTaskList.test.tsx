import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { when } from 'vitest-when'
import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useDeleteCalibrationMutation,
  useAllPipetteOffsetCalibrationsQuery,
  useAllTipLengthCalibrationsQuery,
  useCalibrationStatusQuery,
} from '@opentrons/react-api-client'
import { useCalibrationTaskList } from '../useCalibrationTaskList'
import { useAttachedPipettes } from '/app/resources/instruments'
import {
  TASK_COUNT,
  mockAttachedPipettesResponse,
  mockBadDeckCalibration,
  mockBadPipetteOffsetCalibrations,
  mockBadTipLengthCalibrations,
  mockCompleteDeckCalibration,
  mockCompletePipetteOffsetCalibrations,
  mockCompleteTipLengthCalibrations,
  mockIncompleteDeckCalibration,
  mockSingleAttachedPipetteResponse,
  mockIncompletePipetteOffsetCalibrations,
  mockIncompleteTipLengthCalibrations,
  expectedTaskList,
} from '../__fixtures__/taskListFixtures'
import { i18n } from '/app/i18n'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('/app/resources/instruments')
vi.mock('@opentrons/react-api-client')

const mockPipOffsetCalLauncher = vi.fn()
const mockTipLengthCalLauncher = vi.fn()
const mockDeckCalLauncher = vi.fn()

describe('useCalibrationTaskList hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  let store: Store<State>
  const mockDeleteCalibration = vi.fn()

  beforeEach(() => {
    vi.mocked(useDeleteCalibrationMutation).mockReturnValue({
      deleteCalibration: mockDeleteCalibration,
    } as any)
    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns a task list with 3 tasks: Deck Calibration, Left Mount, and Right Mount', () => {
    const tasks = ['Deck Calibration', 'Left Mount', 'Right Mount']
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)

    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.taskList.length).toEqual(TASK_COUNT)
    result.current.taskList.forEach((task, i) => {
      expect(task.title).toEqual(tasks[i])
    })
  })

  it('returns a null active index when all calibrations are complete', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)

    const { result } = renderHook(
      () =>
        useCalibrationTaskList(mockTipLengthCalLauncher, mockDeckCalLauncher),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual(null)
  })

  it('returns "Empty" for a mount without an attached pipette', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockSingleAttachedPipetteResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.taskList[2].description).toEqual('Empty')
  })

  it('returns the the correct active when Deck Calibration is needed', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockIncompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([0, 0])
  })

  it('returns the the correct active when Deck Recalibration is needed', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockBadDeckCalibration } as any) // markedBad === true
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([0, 0])
  })

  it('returns the the correct active index when a pipette is missing Offset Calibrations', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompletePipetteOffsetCalibrations },
      } as any) // right mount marked as bad
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([2, 1])
  })

  it('returns the the correct active index when both pipettes have bad Offset Calibrations', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockBadPipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([1, 1])
  })

  it('returns the the correct active index when a pipette is missing Tip Length Calibrations', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([1, 0])
  })

  it('returns the the correct active index when both pipettes have bad Tip Length Calibrations', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: { data: mockBadTipLengthCalibrations } } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([1, 0])
  })

  it('returns the the correct active index when both tlc and poc are bad', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: { data: mockBadTipLengthCalibrations } } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockBadPipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([1, 0])
  })

  it('returns the the correct active index when both deck and poc are bad', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockBadDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockBadPipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([0, 0])
  })

  it('returns the the correct active index when all calibrations are marked bad', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockBadDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: { data: mockBadTipLengthCalibrations } } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockBadPipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([0, 0])
  })

  it('returns the earliest encountered task as the active index when multiple tasks require calibrations', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockIncompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompletePipetteOffsetCalibrations },
      } as any) // right mount marked as bad
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.activeIndex).toEqual([0, 0])
  })

  it('returns descriptions for tasks that need to be completed', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: null } as any) // null deck response
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompleteTipLengthCalibrations },
      } as any) // left calibration missing
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompletePipetteOffsetCalibrations },
      } as any) // right mount marked as bad
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.taskList[0].description).toEqual(
      'Start with Deck Calibration, which is the basis for the rest of calibration.'
    )
    expect(result.current.taskList[1].subTasks[0].description).toEqual(
      'Calibrate the length of a tip on this pipette.'
    )
    expect(result.current.taskList[2].subTasks[1].description).toEqual(
      "Calibrate this pipette's offset while attached to the robot's right mount."
    )
  })

  it('returns timestamps for tasks that have been completed', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)
    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    expect(result.current.taskList[0].footer).toEqual(
      expectedTaskList.taskList[0].footer
    )
    expect(result.current.taskList[1].subTasks[0].footer).toEqual(
      expectedTaskList.taskList[1].subTasks[0].footer
    )
    expect(result.current.taskList[2].subTasks[1].footer).toEqual(
      expectedTaskList.taskList[2].subTasks[1].footer
    )
  })

  it('passes the launcher function to cta onclick handlers for recalibration', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockCompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockCompletePipetteOffsetCalibrations },
      } as any)

    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    result.current.taskList[0].cta?.onClick()
    expect(mockDeckCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[1].subTasks[0].cta?.onClick()
    expect(mockTipLengthCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[1].subTasks[1].cta?.onClick()
    expect(mockPipOffsetCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[2].subTasks[0].cta?.onClick()
    expect(mockTipLengthCalLauncher).toHaveBeenCalledTimes(2)
    result.current.taskList[2].subTasks[1].cta?.onClick()
    expect(mockPipOffsetCalLauncher).toHaveBeenCalledTimes(2)
  })

  it('passes the launcher function to cta onclick handlers for calibration', () => {
    when(vi.mocked(useAttachedPipettes))
      .calledWith()
      .thenReturn(mockAttachedPipettesResponse)
    when(vi.mocked(useCalibrationStatusQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({ data: mockIncompleteDeckCalibration } as any)
    when(vi.mocked(useAllTipLengthCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompleteTipLengthCalibrations },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith({ refetchInterval: 5000 })
      .thenReturn({
        data: { data: mockIncompletePipetteOffsetCalibrations },
      } as any)

    const { result } = renderHook(
      () =>
        useCalibrationTaskList(
          mockPipOffsetCalLauncher,
          mockTipLengthCalLauncher,
          mockDeckCalLauncher
        ),
      {
        wrapper,
      }
    )

    result.current.taskList[0].cta?.onClick()
    expect(mockDeckCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[1].subTasks[0].cta?.onClick()
    expect(mockTipLengthCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[1].subTasks[1].cta?.onClick()
    expect(mockPipOffsetCalLauncher).toHaveBeenCalledTimes(1)
    result.current.taskList[2].subTasks[0].cta?.onClick()
    expect(mockTipLengthCalLauncher).toHaveBeenCalledTimes(2)
    result.current.taskList[2].subTasks[1].cta?.onClick()
    expect(mockPipOffsetCalLauncher).toHaveBeenCalledTimes(2)
  })
})
