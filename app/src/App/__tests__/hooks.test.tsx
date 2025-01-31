import { vi, describe, beforeEach, afterEach, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'

import { i18n } from '/app/i18n'
import { checkShellUpdate } from '/app/redux/shell'
import { useSoftwareUpdatePoll } from '../hooks'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

describe('useSoftwareUpdatePoll', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  let store: Store<State>
  beforeEach(() => {
    vi.useFakeTimers()
    store = createStore(vi.fn(), {})
    store.dispatch = vi.fn()
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.resetAllMocks()
  })
  it('checks for update availability on an interval', () => {
    renderHook(useSoftwareUpdatePoll, { wrapper })

    expect(store.dispatch).not.toHaveBeenCalledWith(checkShellUpdate())
    vi.advanceTimersByTime(60001)
    expect(store.dispatch).toHaveBeenCalledTimes(1)
    expect(store.dispatch).toHaveBeenCalledWith(checkShellUpdate())
  })
})
