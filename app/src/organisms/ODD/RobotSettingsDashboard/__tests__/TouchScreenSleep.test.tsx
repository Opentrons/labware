import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { i18n } from '/app/i18n'
import { updateConfigValue } from '/app/redux/config'
import { TouchScreenSleep } from '../TouchScreenSleep'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

// Note (kj:06/28/2023) this line is to avoid causing errors for scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const render = (props: ComponentProps<typeof TouchScreenSleep>) => {
  return renderWithProviders(<TouchScreenSleep {...props} />, {
    i18nInstance: i18n,
  })
}

describe('TouchScreenSleep', () => {
  let props: ComponentProps<typeof TouchScreenSleep>

  beforeEach(() => {
    props = {
      setCurrentOption: vi.fn(),
    }
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Touchscreen Sleep')
    screen.getByText('Never')
    screen.getByText('3 minutes')
    screen.getByText('5 minutes')
    screen.getByText('10 minutes')
    screen.getByText('15 minutes')
    screen.getByText('30 minutes')
    screen.getByText('1 hour')
  })

  it('should call a mock function when changing the sleep option', () => {
    render(props)
    const button = screen.getByText('10 minutes')
    fireEvent.click(button)
    expect(updateConfigValue).toHaveBeenCalled()
  })
})
