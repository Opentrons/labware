import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ExitModal } from '../ExitModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ExitModal>) => {
  return renderWithProviders(<ExitModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('ExitModal', () => {
  let props: ComponentProps<typeof ExitModal>
  beforeEach(() => {
    props = {
      back: vi.fn(),
      exit: vi.fn(),
      direction: 'attach',
      isDisabled: false,
    }
  })
  it('renders the correct information and buttons for attach when no pipette is attached', () => {
    render(props)
    screen.getByText('Progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before attaching your pipette?'
    )
    const back = screen.getByRole('button', { name: 'Go back' })
    const exit = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.back).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.exit).toHaveBeenCalled()
  })

  it('renders the correct text and body text for detach when no pipette is attached', () => {
    props = {
      ...props,
      direction: 'detach',
    }
    render(props)
    screen.getByText(
      'Are you sure you want to exit before detaching your pipette?'
    )
  })

  it('renders buttons disabled when isDisbaled is true', () => {
    props = {
      ...props,
      isDisabled: true,
    }
    render(props)
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'exit' })).toBeDisabled()
  })
})
