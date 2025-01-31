import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { COLORS } from '@opentrons/components'

import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { DisabledScreen } from '..'

const render = () => {
  return renderWithProviders(<DisabledScreen />, { i18nInstance: i18n })
}

describe('DisabledScreen', () => {
  it('should render icon and text', () => {
    render()
    screen.getByTestId('browser_icon_in_DisabledScreen')
    screen.getByText('Your browser size is too small')
    screen.getByText(
      'Resize your browser to at least 768px wide and 650px tall to continue editing your protocol'
    )
  })

  it('should render background with transparent', () => {
    render()
    expect(screen.getByLabelText('BackgroundOverlay_ModalShell')).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity40HexCode}`
    )
  })

  it('should render white text', () => {
    render()
    expect(screen.getByText('Your browser size is too small')).toHaveStyle(
      `color: ${COLORS.white}`
    )
    expect(
      screen.getByText(
        'Resize your browser to at least 768px wide and 650px tall to continue editing your protocol'
      )
    ).toHaveStyle(`color: ${COLORS.white}`)
  })
})
