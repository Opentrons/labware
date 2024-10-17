import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useHomeGripperZAxis } from '../useHomeGripperZAxis'
import { RECOVERY_MAP } from '/app/organisms/ErrorRecoveryFlows/constants'

describe('useHomeGripperZAxis', () => {
  const mockRecoveryCommands = {
    homeGripperZAxis: vi.fn().mockResolvedValue(undefined),
  }

  const mockRouteUpdateActions = {
    handleMotionRouting: vi.fn().mockResolvedValue(undefined),
    goBackPrevStep: vi.fn(),
  }

  const mockRecoveryMap = {
    step: RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE,
  }

  const mockDoorStatusUtils = {
    isDoorOpen: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should home gripper Z axis when in manual gripper step and door is closed', async () => {
    renderHook(() => {
      useHomeGripperZAxis({
        recoveryCommands: mockRecoveryCommands,
        routeUpdateActions: mockRouteUpdateActions,
        recoveryMap: mockRecoveryMap,
        doorStatusUtils: mockDoorStatusUtils,
      } as any)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockRouteUpdateActions.handleMotionRouting).toHaveBeenCalledWith(
      true
    )
    expect(mockRecoveryCommands.homeGripperZAxis).toHaveBeenCalled()
    expect(mockRouteUpdateActions.handleMotionRouting).toHaveBeenCalledWith(
      false
    )
  })

  it('should go back to previous step when door is open', () => {
    renderHook(() => {
      useHomeGripperZAxis({
        recoveryCommands: mockRecoveryCommands,
        routeUpdateActions: mockRouteUpdateActions,
        recoveryMap: mockRecoveryMap,
        doorStatusUtils: { ...mockDoorStatusUtils, isDoorOpen: true },
      } as any)
    })

    expect(mockRouteUpdateActions.goBackPrevStep).toHaveBeenCalled()
    expect(mockRecoveryCommands.homeGripperZAxis).not.toHaveBeenCalled()
  })

  it('should not home again if already homed once', async () => {
    const { rerender } = renderHook(() => {
      useHomeGripperZAxis({
        recoveryCommands: mockRecoveryCommands,
        routeUpdateActions: mockRouteUpdateActions,
        recoveryMap: mockRecoveryMap,
        doorStatusUtils: mockDoorStatusUtils,
      } as any)
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockRecoveryCommands.homeGripperZAxis).toHaveBeenCalledTimes(1)

    rerender()

    expect(mockRecoveryCommands.homeGripperZAxis).toHaveBeenCalledTimes(1)
  })

  it('should reset hasHomedOnce when step changes to non-manual gripper step and back', async () => {
    const { rerender } = renderHook(
      ({ recoveryMap }) => {
        useHomeGripperZAxis({
          recoveryCommands: mockRecoveryCommands,
          routeUpdateActions: mockRouteUpdateActions,
          recoveryMap,
          doorStatusUtils: mockDoorStatusUtils,
        } as any)
      },
      {
        initialProps: { recoveryMap: mockRecoveryMap },
      }
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockRecoveryCommands.homeGripperZAxis).toHaveBeenCalledTimes(1)

    rerender({ recoveryMap: { step: 'SOME_OTHER_STEP' } as any })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    rerender({ recoveryMap: mockRecoveryMap })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockRecoveryCommands.homeGripperZAxis).toHaveBeenCalledTimes(2)
  })
})
