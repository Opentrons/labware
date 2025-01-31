import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'

import { i18n } from '/app/i18n'
import { ConfirmAttachedModal } from '../ConfirmAttachedModal'

import type { ComponentProps } from 'react'

const mockOnCloseClick = vi.fn()
const mockOnConfirmClick = vi.fn()

const render = (props: ComponentProps<typeof ConfirmAttachedModal>) => {
  return renderWithProviders(<ConfirmAttachedModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ConfirmAttachedModal', () => {
  let props: ComponentProps<typeof ConfirmAttachedModal>

  beforeEach(() => {
    props = {
      onCloseClick: mockOnCloseClick,
      isProceedToRunModal: true,
      onConfirmClick: mockOnConfirmClick,
    }
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Confirm Heater-Shaker Module is attached')
    screen.getByText(
      'Before the run begins, module should have both anchors fully extended for a firm attachment. The thermal adapter should be attached to the module.'
    )
    screen.getByText('Cancel')
    screen.getByText('Proceed to run')
  })

  it('should call a mock function when tapping cancel button', () => {
    render(props)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnCloseClick).toHaveBeenCalled()
  })

  it('should call a mock function when tapping proceed to run button', () => {
    render(props)
    fireEvent.click(screen.getByText('Proceed to run'))
    expect(mockOnConfirmClick).toHaveBeenCalled()
  })
})
