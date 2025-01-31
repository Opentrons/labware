import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { HowLPCWorksModal } from '../HowLPCWorksModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof HowLPCWorksModal>) => {
  return renderWithProviders(<HowLPCWorksModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HowLPCWorksModal', () => {
  let props: ComponentProps<typeof HowLPCWorksModal>
  beforeEach(() => {
    props = { onCloseClick: vi.fn() }
  })

  it('should render the correct header', () => {
    render(props)
    screen.getByRole('heading', { name: 'How labware offsets work' })
  })
  it('should render the correct body', () => {
    render(props)
    screen.getByText(
      'A Labware Offset is a type of positional adjustment that accounts for small, real-world variances in the overall position of the labware on a robot’s deck. Labware Offset data is unique to a specific combination of labware definition, deck slot, and robot.'
    )
    screen.getByText(
      'Labware Position Check is intended to correct for minor variances. Opentrons does not recommend using Labware Position Check to compensate for large positional adjustments. Needing to set large labware offsets could indicate a problem with robot calibration.'
    )
  })
  it('should render a link to the learn more page', () => {
    render(props)
    expect(
      screen
        .getByRole('link', {
          name: 'Learn more about Labware Offset Data',
        })
        .getAttribute('href')
    ).toBe(
      'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'
    )
  })
  it('should call onCloseClick when the close button is pressed', () => {
    render(props)
    expect(props.onCloseClick).not.toHaveBeenCalled()
    const closeButton = screen.getByRole('button', { name: 'close' })
    fireEvent.click(closeButton)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
})
