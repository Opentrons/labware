import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'
import { Toast, TOAST_ANIMATION_DURATION } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Toast>) => {
  return renderWithProviders(<Toast {...props} displayType="desktop" />)[0]
}

describe('Toast', () => {
  let props: ComponentProps<typeof Toast>
  beforeEach(() => {
    props = {
      id: '1',
      message: 'test message',
      type: 'success',
      closeButton: true,
      onClose: vi.fn(),
    }
  })

  it('renders correct message', () => {
    render(props)
    screen.getByText('test message')
  })

  it('calls onClose when close button is pressed', () => {
    vi.useFakeTimers()
    render(props)
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    act(() => {
      vi.advanceTimersByTime(TOAST_ANIMATION_DURATION)
    })
    expect(props.onClose).toHaveBeenCalled()
  })

  it('does not render x button if prop is false', () => {
    props = {
      ...props,
      closeButton: false,
    }
    render(props)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('should have success styling when passing success as type', () => {
    render(props)
    const successToast = screen.getByTestId('Toast_success')
    expect(successToast).toHaveStyle(`color: #04aa65
    background-color: #f3fffa`)
    screen.getByLabelText('icon_success')
  })

  it('should have warning styling when passing warning as type', () => {
    props = {
      ...props,
      type: 'warning',
    }
    render(props)
    const warningToast = screen.getByTestId('Toast_warning')
    expect(warningToast).toHaveStyle(`color: #f09d20
    background-color: #fffcf5`)
    screen.getByLabelText('icon_warning')
  })

  it('should have error styling when passing error as type', () => {
    props = {
      ...props,
      type: 'error',
    }
    render(props)
    const errorToast = screen.getByTestId('Toast_error')
    expect(errorToast).toHaveStyle(`color: #bf0000
    background-color: #fff3f3`)
    screen.getByLabelText('icon_error')
  })

  it('should have info styling when passing info as type', () => {
    props = {
      ...props,
      type: 'info',
    }
    render(props)
    const infoToast = screen.getByTestId('Toast_info')
    expect(infoToast).toHaveStyle(`color: #16212D
    background-color: #eaeaeb`)
    screen.getByLabelText('icon_info')
  })

  it('should stay more than 7 seconds when disableTimeout is true', async () => {
    vi.useFakeTimers()
    props = {
      ...props,
      disableTimeout: true,
    }
    render(props)
    screen.getByText('test message')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(props.onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(7000)
    })
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('should not stay more than 7 seconds when disableTimeout is false', async () => {
    vi.useFakeTimers()
    props = {
      ...props,
      disableTimeout: false,
    }
    render(props)
    screen.getByText('test message')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(props.onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(9000)
    })
    expect(props.onClose).toHaveBeenCalled()
  })

  it('should dismiss when a second toast appears', async () => {
    vi.useFakeTimers()
    props = {
      ...props,
      disableTimeout: true,
      exitNow: true,
    }
    render(props)
    screen.getByText('test message')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(props.onClose).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(TOAST_ANIMATION_DURATION)
    })
    expect(props.onClose).toHaveBeenCalled()
  })
  it('renders link text with an optional callback', async () => {
    vi.useFakeTimers()
    props = {
      ...props,
      linkText: 'test link',
      onLinkClick: vi.fn(),
    }
    render(props)
    const clickableLink = screen.getByText('test link')
    fireEvent.click(clickableLink)
    expect(props.onLinkClick).toHaveBeenCalled()
  })
  it('toast will not disappear on a general click if both close button and clickable link present', async () => {
    vi.useFakeTimers()
    props = {
      ...props,
      linkText: 'test link',
      closeButton: true,
    }
    render(props)
    const clickableLink = screen.getByText('test message')
    fireEvent.click(clickableLink)
    act(() => {
      vi.advanceTimersByTime(TOAST_ANIMATION_DURATION)
    })
    expect(props.onClose).not.toHaveBeenCalled()
  })
})
