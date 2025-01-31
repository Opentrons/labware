import { describe, it, vi, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'

import { Banner } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Banner>) => {
  return renderWithProviders(<Banner {...props} />)[0]
}

describe('Banner', () => {
  let props: ComponentProps<typeof Banner>

  beforeEach(() => {
    props = {
      type: 'success',
      children: 'TITLE',
    }
  })

  it('renders success banner', () => {
    render(props)
    screen.getByLabelText('icon_success')
    screen.getByText('TITLE')
  })

  it('renders success banner with exit button and when click dismisses banner', () => {
    props = {
      type: 'success',
      children: 'TITLE',
      onCloseClick: vi.fn(),
    }
    render(props)
    screen.getByText('TITLE')
    const btn = screen.getByLabelText('close_icon')
    fireEvent.click(btn)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders warning banner', () => {
    props = {
      type: 'warning',
      children: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_warning')
    screen.getByText('TITLE')
  })

  it('renders error banner', () => {
    props = {
      type: 'error',
      children: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_error')
    screen.getByText('TITLE')
  })

  it('renders updating banner', () => {
    props = {
      type: 'updating',
      children: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_updating')
    screen.getByText('TITLE')
  })

  it('renders custom icon banner', () => {
    props = {
      type: 'warning',
      children: 'TITLE',
      icon: { name: 'ot-hot-to-touch' },
    }
    render(props)
    screen.getByLabelText('icon_warning')
    screen.getByText('TITLE')
  })

  it('renders custom close', () => {
    props = {
      type: 'warning',
      children: 'TITLE',
      closeButton: 'close button',
      onCloseClick: vi.fn(),
    }
    render(props)
    const btn = screen.getByText('close button')
    fireEvent.click(btn)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
