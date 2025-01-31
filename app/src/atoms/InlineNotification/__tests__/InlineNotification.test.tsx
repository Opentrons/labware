import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { InlineNotification } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof InlineNotification>) => {
  return renderWithProviders(<InlineNotification {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('InlineNotification', () => {
  let props: ComponentProps<typeof InlineNotification>

  beforeEach(() => {
    props = {
      type: 'success',
      heading: 'TITLE',
    }
  })
  it('renders success inline notification', () => {
    render(props)
    screen.getByLabelText('icon_success')
    screen.getByText('TITLE')
  })
  it('renders success inline notification with exit button and when click dismisses inline notification', () => {
    props = {
      type: 'success',
      heading: 'TITLE',
      onCloseClick: vi.fn(),
    }
    render(props)
    screen.getByText('TITLE')
    const btn = screen.getByLabelText('close_icon')
    fireEvent.click(btn)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
  it('renders alert inline notification', () => {
    props = {
      type: 'alert',
      heading: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_alert')
    screen.getByText('TITLE')
  })
  it('renders error inline notification', () => {
    props = {
      type: 'error',
      heading: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_error')
    screen.getByText('TITLE')
  })
  it('renders neutral inline notification', () => {
    props = {
      type: 'neutral',
      heading: 'TITLE',
    }
    render(props)
    screen.getByLabelText('icon_neutral')
    screen.getByText('TITLE')
  })
})
