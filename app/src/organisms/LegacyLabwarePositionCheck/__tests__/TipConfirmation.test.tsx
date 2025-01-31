import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { TipConfirmation } from '../TipConfirmation'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof TipConfirmation>) => {
  return renderWithProviders(<TipConfirmation {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TipConfirmation', () => {
  let props: ComponentProps<typeof TipConfirmation>

  beforeEach(() => {
    props = {
      invalidateTip: vi.fn(),
      confirmTip: vi.fn(),
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should render correct copy', () => {
    render(props)
    screen.getByText('Did pipette pick up tip successfully?')
    screen.getByRole('button', { name: 'Yes' })
    screen.getByRole('button', { name: 'Try again' })
  })
  it('should invoke callback props when ctas are clicked', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(props.invalidateTip).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(props.confirmTip).toHaveBeenCalled()
  })
})
