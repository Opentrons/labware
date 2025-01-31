import { Provider } from 'react-redux'
import { createStore } from 'redux'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, render, fireEvent, screen } from '@testing-library/react'
import { useTrackEvent } from '/app/redux/analytics'
import { useToggleGroup } from '../useToggleGroup'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/analytics')

let mockTrackEvent: any

describe('useToggleGroup', () => {
  const store: Store<State> = createStore(vi.fn(), {})
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    store.dispatch = vi.fn()
  })

  it('should return default selectedValue and toggle buttons', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useToggleGroup('List View', 'Map View'),
      { wrapper }
    )

    expect(result.current[0]).toBe('List View')
  })
  it('should record an analytics event for list view', async () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useToggleGroup('List View', 'Map View', 'fake event'),
      { wrapper }
    )

    render(result.current[1] as any)
    const listViewButton = screen.getByText('List View')
    fireEvent.click(listViewButton)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'fake event',
      properties: { view: 'list' },
    })
  })
  it('should record an analytics event for map view', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useToggleGroup('List View', 'Map View', 'fake event'),
      { wrapper }
    )

    render(result.current[1] as any)
    const mapViewButton = screen.getByText('Map View')
    fireEvent.click(mapViewButton)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'fake event',
      properties: { view: 'map' },
    })
  })
})
