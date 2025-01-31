import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { renderWithProviders } from '/app/__testing-utils__'

import { i18n } from '/app/i18n'
import { BackButton } from '..'

import type { HTMLProps } from 'react'

const render = (props?: HTMLProps<HTMLButtonElement>) => {
  return renderWithProviders(
    <MemoryRouter
      initialEntries={['/previous-page', '/current-page']}
      initialIndex={1}
    >
      <BackButton {...props} />
      <Routes>
        <Route path="/current-page" element={<>this is the current page</>} />
        <Route path="/previous-page" element={<>this is the previous page</>} />
      </Routes>
    </MemoryRouter>,
    { i18nInstance: i18n }
  )[0]
}

describe('BackButton', () => {
  it('renders a button that says Back', () => {
    render()
    screen.getByRole('button', { name: 'Back' })
  })

  it('calls provided on click handler and does not go back one page', () => {
    const mockOnClick = vi.fn()

    render({ onClick: mockOnClick })

    expect(mockOnClick).toBeCalledTimes(0)
    screen.getByText('this is the current page')
    expect(screen.queryByText('this is the previous page')).toBeNull()
    fireEvent.click(screen.getByText('Back'))
    expect(mockOnClick).toBeCalledTimes(1)
    screen.getByText('this is the current page')
    expect(screen.queryByText('this is the previous page')).toBeNull()
  })

  it('goes back one page in navigate on click if no on click handler provided', () => {
    render()

    screen.getByText('this is the current page')
    expect(screen.queryByText('this is the previous page')).toBeNull()
    fireEvent.click(screen.getByText('Back'))
    screen.getByText('this is the previous page')
    expect(screen.queryByText('this is the current page')).toBeNull()
  })
})
