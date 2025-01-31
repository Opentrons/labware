import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  PreviousVersionModal,
  UNINSTALL_APP_URL,
  PREVIOUS_RELEASES_URL,
} from '../PreviousVersionModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof PreviousVersionModal>) => {
  return renderWithProviders(<PreviousVersionModal {...props} />, {
    i18nInstance: i18n,
  })
}
const props: ComponentProps<typeof PreviousVersionModal> = {
  closeModal: vi.fn(),
}

describe('PreviousVersionModal', () => {
  it('renders correct title and body text', () => {
    render(props)
    screen.getByText('How to Restore a Previous Software Version')
    screen.getByText(
      'Opentrons does not recommend reverting to previous software versions, but you can access previous releases below. For best results, uninstall the existing app and remove its configuration files before installing the previous version.'
    )
  })
  it('renders correct support links', () => {
    render(props)
    const uninstallLink = screen.getByRole('link', {
      name: 'Learn more about uninstalling the Opentrons App',
    })
    expect(uninstallLink.getAttribute('href')).toBe(UNINSTALL_APP_URL)
    const previousReleasesLink = screen.getByRole('link', {
      name: 'View previous Opentrons releases',
    })
    expect(previousReleasesLink.getAttribute('href')).toBe(
      PREVIOUS_RELEASES_URL
    )
  })
  it('renders the close button and calls closeModal when clicked', () => {
    render(props)
    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)
    expect(props.closeModal).toBeCalled()
  })
})
