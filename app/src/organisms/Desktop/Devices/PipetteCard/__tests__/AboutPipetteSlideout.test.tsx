import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { AboutPipetteSlideout } from '../AboutPipetteSlideout'
import { mockLeftSpecs } from '/app/redux/pipettes/__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof AboutPipetteSlideout>) => {
  return renderWithProviders(<AboutPipetteSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AboutPipetteSlideout', () => {
  let props: ComponentProps<typeof AboutPipetteSlideout>
  beforeEach(() => {
    props = {
      pipetteId: '123',
      pipetteName: mockLeftSpecs.displayName,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
  })

  it('renders correct info', () => {
    render(props)

    screen.getByText('About Left Pipette Pipette')
    screen.getByText('123')
    screen.getByText('SERIAL NUMBER')
    const button = screen.getByRole('button', { name: /exit/i })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
  it('renders the firmware version if it exists', () => {
    props = {
      pipetteId: '123',
      pipetteName: mockLeftSpecs.displayName,
      isExpanded: true,
      firmwareVersion: '12',
      onCloseClick: vi.fn(),
    }
    render(props)

    screen.getByText('CURRENT VERSION')
    screen.getByText('12')
  })
})
