import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { DeckFixtureSetupInstructionsModal } from '../DeckFixtureSetupInstructionsModal'

import type { ComponentProps } from 'react'

const mockFunc = vi.fn()
const PNG_FILE_NAME =
  '/app/src/assets/images/on-device-display/deck_fixture_setup_qrcode.png'

const render = (
  props: ComponentProps<typeof DeckFixtureSetupInstructionsModal>
) => {
  return renderWithProviders(<DeckFixtureSetupInstructionsModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Touchscreen DeckFixtureSetupInstructionsModal', () => {
  let props: ComponentProps<typeof DeckFixtureSetupInstructionsModal>

  beforeEach(() => {
    props = {
      setShowSetupInstructionsModal: mockFunc,
      isOnDevice: true,
    }
  })

  it('should render text and image', () => {
    render(props)
    screen.getByText('Deck fixture setup instructions')
    screen.getByText(
      "First, unscrew and remove the deck slot where you'll install a fixture. Then put the fixture in place and attach it as needed."
    )
    screen.getByText(
      'For details on installing different fixture types, scan the QR code or search for “deck configuration” on support.opentrons.com'
    )
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toEqual(PNG_FILE_NAME)
  })

  it('should call a mock function when tapping the close icon', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('closeIcon'))
    expect(mockFunc).toHaveBeenCalled()
  })
})

describe('Desktop DeckFixtureSetupInstructionsModal', () => {
  let props: ComponentProps<typeof DeckFixtureSetupInstructionsModal>

  beforeEach(() => {
    props = {
      setShowSetupInstructionsModal: mockFunc,
    }
  })

  it('should render text, image, and button', () => {
    render(props)
    expect(screen.getAllByText('Deck fixture setup instructions').length).toBe(
      2
    )
    screen.getByText(
      "First, unscrew and remove the deck slot where you'll install a fixture. Then put the fixture in place and attach it as needed."
    )
    screen.getByText(
      'For detailed instructions for different types of fixtures, scan the QR code or go to the link below.'
    )
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toEqual(PNG_FILE_NAME)
    expect(
      screen.queryByText('www.opentrons.com/support/fixtures')
    ).not.toBeInTheDocument()
    screen.getByRole('button', { name: 'Close' })
  })
})
