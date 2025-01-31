import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen, fireEvent } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { Slideout } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Slideout>) => {
  return renderWithProviders(<Slideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('Slideout', () => {
  let props: ComponentProps<typeof Slideout>
  const mockOnClick = vi.fn()
  beforeEach(() => {
    props = {
      title: 'Set Engage Height for Magnetic Module GEN1',
      children: <div>Mock Children</div>,
      isExpanded: true,
      onCloseClick: mockOnClick,
    }
  })

  it('renders correct title and body for a gen1 magnetic module', () => {
    render(props)

    screen.getByText('Set Engage Height for Magnetic Module GEN1')
    screen.getByText('Mock Children')
  })

  it('renders the exit button and it is clickable', () => {
    render(props)
    const button = screen.getByRole('button', { name: /exit/i })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('clicking overlay triggers close', () => {
    render(props)
    const button = screen.getByRole('button', { name: /exit/i })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mockOnClick).toHaveBeenCalled()
  })
})
