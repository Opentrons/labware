import { renderHook } from '@testing-library/react'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { useRobotUpdateInfo } from '../useRobotUpdateInfo'
import { getRobotUpdateDownloadProgress } from '/app/redux/robot-update'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'
import type {
  RobotUpdateSession,
  UpdateSessionStep,
  UpdateSessionStage,
} from '/app/redux/robot-update/types'

vi.mock('/app/redux/robot-update')

describe('useRobotUpdateInfo', () => {
  let store: Store<State>
  let wrapper: FunctionComponent<{ children: ReactNode }>

  const MOCK_ROBOT_NAME = 'testRobot'
  const mockRobotUpdateSession: RobotUpdateSession | null = {
    robotName: MOCK_ROBOT_NAME,
    fileInfo: { isManualFile: true, systemFile: 'testFile', version: '1.0.0' },
    token: null,
    pathPrefix: null,
    step: 'processFile',
    stage: 'writing',
    progress: 50,
    error: null,
  }

  beforeEach(() => {
    vi.useFakeTimers()
    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    vi.mocked(getRobotUpdateDownloadProgress).mockReturnValue(50)
  })

  it('should return null when session is null', () => {
    const { result } = renderHook(
      () => useRobotUpdateInfo(MOCK_ROBOT_NAME, null),
      { wrapper }
    )

    expect(result.current.updateStep).toBe(null)
    expect(result.current.progressPercent).toBe(0)
  })

  it('should return initial values when there is no session step and stage', () => {
    const { result } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: {
          ...mockRobotUpdateSession,
          step: null,
          stage: null,
        } as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('initial')
    expect(result.current.progressPercent).toBe(0)
  })

  it('should return download updateStep and appropriate percentages when the update is downloading', () => {
    const { result, rerender } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: {
          ...mockRobotUpdateSession,
          step: 'downloadFile',
        } as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('download')
    expect(Math.round(result.current.progressPercent)).toBe(17)

    rerender({
      ...mockRobotUpdateSession,
    })

    expect(result.current.updateStep).toBe('install')
    expect(result.current.progressPercent).toBe(50)
  })

  it('should update updateStep and progressPercent when session is provided', () => {
    const { result, rerender } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: mockRobotUpdateSession as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(Math.round(result.current.progressPercent)).toBe(25)

    rerender({
      ...mockRobotUpdateSession,
      step: 'restart',
      stage: 'ready-for-restart',
      progress: 100,
      error: null,
    })

    expect(result.current.updateStep).toBe('restart')
    expect(result.current.progressPercent).toBe(100)
  })

  it('should return correct updateStep and progressPercent values when there is an error', () => {
    const { result, rerender } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: mockRobotUpdateSession as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(Math.round(result.current.progressPercent)).toBe(25)

    rerender({
      ...mockRobotUpdateSession,
      error: 'Something went wrong',
    })

    expect(result.current.updateStep).toBe('error')
    expect(Math.round(result.current.progressPercent)).toBe(25)
  })

  it('should calculate correct progressPercent when the update is not manual', () => {
    const { result } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: {
          ...mockRobotUpdateSession,
          fileInfo: {
            systemFile: 'downloadPath',
            version: '1.0.0',
            isManualFile: false,
          },
        } as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(Math.round(result.current.progressPercent)).toBe(25)
  })

  it('should ignore progressPercent reported by a step marked as ignored', () => {
    const { result } = renderHook(
      session => useRobotUpdateInfo(MOCK_ROBOT_NAME, session),
      {
        initialProps: {
          ...mockRobotUpdateSession,
          step: 'processFile' as UpdateSessionStep,
          stage: 'awaiting-file' as UpdateSessionStage,
          progress: 100,
        } as any,
        wrapper,
      }
    )

    expect(result.current.updateStep).toBe('install')
    expect(Math.round(result.current.progressPercent)).toBe(0)
  })
})
