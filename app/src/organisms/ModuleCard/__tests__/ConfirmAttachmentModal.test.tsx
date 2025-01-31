import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ConfirmAttachmentModal } from '../ConfirmAttachmentModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ConfirmAttachmentModal>) => {
  return renderWithProviders(<ConfirmAttachmentModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ConfirmAttachmentBanner', () => {
  let props: ComponentProps<typeof ConfirmAttachmentModal>

  beforeEach(() => {
    props = {
      onConfirmClick: vi.fn(),
      isProceedToRunModal: false,
      onCloseClick: vi.fn(),
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the correct modal info when accessed through set shake slideout', () => {
    render(props)
    screen.getByText('Confirm Heater-Shaker Module attachment')
    screen.getByText(
      'Module should have both anchors fully extended for a firm attachment to the deck.'
    )
    screen.getByText('The thermal adapter should be attached to the module.')
    screen.getByText('Don’t show me again')
    screen.getByText('cancel')
    screen.getByText('Confirm attachment')
    const confirmBtn = screen.getByRole('button', {
      name: 'Confirm attachment',
    })
    fireEvent.click(confirmBtn)
    expect(props.onConfirmClick).toHaveBeenCalled()
    const cancelbtn = screen.getByRole('button', { name: 'cancel' })
    fireEvent.click(cancelbtn)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders the correct modal info when accessed through proceed to run CTA and clicks proceed to run button', () => {
    props = {
      onCloseClick: vi.fn(),
      isProceedToRunModal: true,
      onConfirmClick: vi.fn(),
    }

    render(props)

    screen.getByText(
      'Before the run begins, module should have both anchors fully extended for a firm attachment to the deck.'
    )
    screen.getByText('The thermal adapter should be attached to the module.')
    const btn = screen.getByRole('button', { name: 'Proceed to run' })
    fireEvent.click(btn)
    expect(props.onConfirmClick).toHaveBeenCalled()
    const cancelbtn = screen.getByRole('button', { name: 'cancel' })
    fireEvent.click(cancelbtn)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
