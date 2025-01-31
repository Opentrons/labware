import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SetWifiCred } from '../SetWifiCred'

import type { ComponentProps } from 'react'

const mockSetPassword = vi.fn()
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/robot-api')

const render = (props: ComponentProps<typeof SetWifiCred>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SetWifiCred {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('SetWifiCred', () => {
  let props: ComponentProps<typeof SetWifiCred>
  beforeEach(() => {
    props = {
      password: 'mock-password',
      setPassword: mockSetPassword,
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render text, button and software keyboard', () => {
    render(props)
    screen.getByText('Enter password')
    expect(screen.getByLabelText('wifi_password')).toBeInTheDocument()
    screen.getByRole('button', { name: 'Show' })
    // software keyboard
    screen.getByRole('button', { name: 'del' })
    screen.getByRole('button', { name: 'a' })
    screen.getByRole('button', { name: 'ABC' })
  })

  it('should display password', () => {
    render(props)
    const inputBox = screen.getByLabelText('wifi_password')
    expect(inputBox).toHaveValue('mock-password')
  })

  it('should switch the input type and button text when tapping the icon next to the input', () => {
    render(props)
    const button = screen.getByRole('button', { name: 'Show' })
    const inputBox = screen.getByLabelText('wifi_password')
    expect(inputBox).toHaveAttribute('type', 'password')
    fireEvent.click(button)
    screen.getByRole('button', { name: 'Hide' })
    screen.getByTestId('icon_eye-slash')
    expect(screen.getByLabelText('wifi_password')).toHaveAttribute(
      'type',
      'text'
    )
  })
})
