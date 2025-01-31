import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { ConnectionTroubleshootingModal } from '../ConnectionTroubleshootingModal'

import type { ComponentProps } from 'react'

const render = (
  props: ComponentProps<typeof ConnectionTroubleshootingModal>
) => {
  return renderWithProviders(<ConnectionTroubleshootingModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ConnectionTroubleshootingModal', () => {
  let props: ComponentProps<typeof ConnectionTroubleshootingModal>
  beforeEach(() => {
    props = {
      onClose: vi.fn(),
    }
  })
  it('should render correct text', () => {
    render(props)
    screen.getByText('Why is this robot unavailable?')
    screen.getByText(
      'If you’re having trouble with the robot’s connection, try these troubleshooting tasks. First, double check that the robot is powered on.'
    )
    screen.getByText(
      'Wait for a minute after connecting the robot to the computer'
    )
    screen.getByText('Make sure the robot is connected to this computer')
    screen.getByText('If connecting wirelessly:')
    screen.getByText(
      'Check that the computer and robot are on the same network'
    )
    screen.getByText('If connecting via USB:')
    screen.getByText('If you’re still having issues:')
    screen.getByText('Restart the robot')
    screen.getByText('Restart the app')
    screen.getByText(
      'If none of these work, contact Opentrons Support for help (via the question mark link in this app, or by emailing support@opentrons.com.)'
    )
    screen.getByRole('link', {
      name: 'Learn more about troubleshooting connection problems',
    })
  })
  it('should render button and button is clickable', () => {
    render(props)
    const btn = screen.getByRole('button', { name: 'close' })
    fireEvent.click(btn)
    expect(props.onClose).toHaveBeenCalled()
  })
})
