import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'

import { i18n } from '/app/i18n'
import { useDispatchStartRobotUpdate } from '../hooks'
import { startRobotUpdate, clearRobotUpdateSession } from '../actions'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '../../types'

describe('useDispatchStartRobotUpdate', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  let store: Store<State>
  const mockRobotName = 'robotName'
  const mockSystemFile = 'systemFile'
  beforeEach(() => {
    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
  })

  it('clears the robot update session before dispatching a new session with the given robotName and systemFile', () => {
    const { result } = renderHook(useDispatchStartRobotUpdate, {
      wrapper,
    })

    result.current(mockRobotName, mockSystemFile)
    expect(store.dispatch).toHaveBeenCalledWith(clearRobotUpdateSession())
    expect(store.dispatch).toHaveBeenCalledWith(
      startRobotUpdate(mockRobotName, mockSystemFile)
    )
  })
})
