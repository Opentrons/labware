import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { ConfirmExit } from '../ConfirmExit'

import type { ComponentProps } from 'react'

describe('ConfirmExit', () => {
  const mockBack = vi.fn()
  const mockExit = vi.fn()
  const render = (props: Partial<ComponentProps<typeof ConfirmExit>> = {}) => {
    const { heading, body } = props
    return renderWithProviders(
      <ConfirmExit
        exit={mockExit}
        back={mockBack}
        heading={heading}
        body={body}
      />,
      { i18nInstance: i18n }
    )
  }

  it('clicking confirm exit calls exit', () => {
    render()
    const button = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(button)
    expect(mockExit).toHaveBeenCalled()
  })

  it('clicking back calls back', () => {
    render()
    const button = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(button)
    expect(mockBack).toHaveBeenCalled()
  })

  it('renders body and heading text if present', () => {
    render({
      heading: 'fake heading',
      body: 'fake body',
    })
    screen.getByRole('heading', { name: 'fake heading' })
    screen.getByText('fake heading')
  })
})
