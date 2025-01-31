import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ConfirmExitModal } from '../ConfirmExitModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ConfirmExitModal>) => {
  return renderWithProviders(<ConfirmExitModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ConfirmExitModal', () => {
  let props: ComponentProps<typeof ConfirmExitModal>

  beforeEach(() => {
    props = {
      confirmExit: vi.fn(),
      cancelExit: vi.fn(),
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the create new transfer screen and header', () => {
    render(props)
    screen.getByText('Exit quick transfer?')
    screen.getByText('You will lose all progress on this quick transfer.')
  })
  it('renders exit and cancel buttons and they work as expected', () => {
    render(props)
    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)
    expect(props.cancelExit).toHaveBeenCalled()
    const deleteBtn = screen.getByText('Delete')
    fireEvent.click(deleteBtn)
    expect(props.confirmExit).toHaveBeenCalled()
  })
})
