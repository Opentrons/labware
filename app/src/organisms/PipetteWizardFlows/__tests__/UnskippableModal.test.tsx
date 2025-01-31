import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { UnskippableModal } from '../UnskippableModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof UnskippableModal>) => {
  return renderWithProviders(<UnskippableModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UnskippableModal', () => {
  let props: ComponentProps<typeof UnskippableModal>
  it('returns the correct information for unskippable modal, pressing return button calls goBack prop', () => {
    props = {
      goBack: vi.fn(),
      proceed: vi.fn(),
      isOnDevice: false,
      isRobotMoving: false,
    }
    render(props)
    screen.getByText('This is a critical step that should not be skipped')
    screen.getByText(
      'You must detach the mounting plate and reattach the z-axis carriage before using other pipettes. We do not recommend exiting this process before completion.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()
  })
  it('renders the is on device button with correct text when it is on device display', () => {
    props = {
      goBack: vi.fn(),
      proceed: vi.fn(),
      isOnDevice: true,
      isRobotMoving: false,
    }
    render(props)
    screen.getByText('This is a critical step that should not be skipped')
    screen.getByText(
      'You must detach the mounting plate and reattach the z-axis carriage before using other pipettes. We do not recommend exiting this process before completion.'
    )
    screen.getByText('Exit')
    screen.getByText('Go back')
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(props.proceed).toHaveBeenCalled()
  })
})
