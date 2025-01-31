import { describe, it, vi, expect, beforeEach } from 'vitest'
import { renderHook, act, screen, fireEvent } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useHomePipettes } from '/app/local-resources/instruments'
import {
  useProtocolDropTipModal,
  ProtocolDropTipModal,
} from '../ProtocolDropTipModal'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/local-resources/instruments')

describe('useProtocolDropTipModal', () => {
  let props: Parameters<typeof useProtocolDropTipModal>[0]
  let mockHomePipettes: Mock

  beforeEach(() => {
    props = {
      areTipsAttached: true,
      enableDTWiz: vi.fn(),
      isRunCurrent: true,
      onSkipAndHome: vi.fn(),
      currentRunId: 'MOCK_ID',
      pipetteInfo: {
        pipetteId: '123',
        pipetteName: 'MOCK_NAME',
        mount: 'left',
      },
    }
    mockHomePipettes = vi.fn()

    vi.mocked(useHomePipettes).mockReturnValue({
      homePipettes: mockHomePipettes,
      isHoming: false,
    })
  })

  it('should return initial values', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current).toEqual({
      showModal: true,
      modalProps: {
        onSkip: expect.any(Function),
        onBeginRemoval: expect.any(Function),
        isDisabled: false,
      },
    })
  })

  it('should update showDTModal when areTipsAttached changes', () => {
    const { result, rerender } = renderHook(() =>
      useProtocolDropTipModal(props)
    )

    expect(result.current.showModal).toBe(true)

    props.areTipsAttached = false
    rerender()

    expect(result.current.showModal).toBe(false)
  })

  it('should not show modal when isRunCurrent is false', () => {
    props.isRunCurrent = false
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current.showModal).toBe(false)
  })

  it('should call homePipettes when onDTModalSkip is called', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    act(() => {
      result.current.modalProps?.onSkip()
    })

    expect(mockHomePipettes).toHaveBeenCalled()
  })

  it('should call toggleDTWiz when onDTModalRemoval is called', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    act(() => {
      result.current.modalProps?.onBeginRemoval()
    })

    expect(props.enableDTWiz).toHaveBeenCalled()
  })

  it('should set isDisabled to true when isHomingPipettes is true', () => {
    vi.mocked(useHomePipettes).mockReturnValue({
      homePipettes: mockHomePipettes,
      isHoming: true,
    })

    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current.modalProps?.isDisabled).toBe(true)
  })
})

const render = (props: ComponentProps<typeof ProtocolDropTipModal>) => {
  return renderWithProviders(<ProtocolDropTipModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolDropTipModal', () => {
  let props: ComponentProps<typeof ProtocolDropTipModal>

  beforeEach(() => {
    props = {
      onSkip: vi.fn(),
      onBeginRemoval: vi.fn(),
      mount: 'left',
      isDisabled: false,
    }
  })

  it('renders the modal with correct content', () => {
    render(props)

    screen.getByText('Remove any attached tips')
    screen.queryByText(
      /Homing the .* pipette with liquid in the tips may damage it\. You must remove all tips before using the pipette again\./
    )
    screen.getByText('Begin removal')
    screen.getByText('Skip and home pipette')
  })

  it('calls onSkip when skip button is clicked', () => {
    render(props)

    fireEvent.click(screen.getByText('Skip and home pipette'))

    expect(props.onSkip).toHaveBeenCalled()
  })

  it('calls onBeginRemoval when begin removal button is clicked', () => {
    render(props)

    fireEvent.click(screen.getByText('Begin removal'))

    expect(props.onBeginRemoval).toHaveBeenCalled()
  })
})
