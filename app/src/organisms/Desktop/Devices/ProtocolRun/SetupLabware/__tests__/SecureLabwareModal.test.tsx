import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SecureLabwareModal } from '../SecureLabwareModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof SecureLabwareModal>) => {
  return renderWithProviders(<SecureLabwareModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}
const mockTypeMagDeck = 'magneticModuleType'
const mockTypeTC = 'thermocyclerModuleType'

describe('SecureLabwareModal', () => {
  let props: ComponentProps<typeof SecureLabwareModal>
  beforeEach(() => {
    props = { type: mockTypeMagDeck, onCloseClick: vi.fn() }
  })

  it('should render the correct modal for magnetic module type', () => {
    render(props)
    screen.getByText('Securing labware to the Magnetic Module')
    screen.getByText(
      'Opentrons recommends ensuring your labware locks to the Magnetic Module by adjusting the black plate bracket on top of the module.'
    )
    screen.getByText(
      "There are two sizes of plate brackets supplied with your module: standard and deep well. These brackets can be removed and swapped by unscrewing the module's thumb screw (the silver knob on the front)."
    )
  })
  it('should render magnetic module type modal and call onCloseClick when button is pressed', () => {
    render(props)
    expect(props.onCloseClick).not.toHaveBeenCalled()
    const closeButton = screen.getByRole('button', { name: 'close' })
    fireEvent.click(closeButton)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('should render the correct modal for thermocycler module type', () => {
    props = { type: mockTypeTC, onCloseClick: vi.fn() }
    render(props)
    screen.getByText('Securing labware to the Thermocycler')
    screen.getByText(
      'Opentrons recommends securing your labware to the Thermocycler Module by closing its latch. Doing so ensures level and accurate plate placement for optimal results.'
    )
  })

  it('should render tc module type modal and call onCloseClick when button is pressed', () => {
    props = { type: mockTypeTC, onCloseClick: vi.fn() }
    render(props)
    expect(props.onCloseClick).not.toHaveBeenCalled()
    const closeButton = screen.getByRole('button', { name: 'close' })
    fireEvent.click(closeButton)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
