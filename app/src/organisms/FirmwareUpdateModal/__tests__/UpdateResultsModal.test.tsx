import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { UpdateResultsModal } from '../UpdateResultsModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof UpdateResultsModal>) => {
  return renderWithProviders(<UpdateResultsModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UpdateResultsModal', () => {
  let props: ComponentProps<typeof UpdateResultsModal>
  beforeEach(() => {
    props = {
      isSuccess: true,
      shouldExit: true,
      onClose: vi.fn(),
      instrument: {
        ok: true,
        instrumentType: 'gripper',
        subsystem: 'gripper',
        instrumentModel: 'gripper',
      } as any,
    }
  })
  it('renders correct text for a successful instrument update', () => {
    render(props)
    screen.getByText('Successful update!')
  })
  it('calls close modal when the close button is pressed', () => {
    render(props)
    fireEvent.click(screen.getByText('Close'))
    expect(props.onClose).toHaveBeenCalled()
  })
  it('renders correct text for a failed instrument update', () => {
    props = {
      isSuccess: false,
      shouldExit: true,
      onClose: vi.fn(),
      instrument: {
        ok: false,
      } as any,
    }
    render(props)
    screen.getByText('Update failed')
    screen.getByText(
      'Download the robot logs from the Opentrons App and send them to support@opentrons.com for assistance.'
    )
  })
})
