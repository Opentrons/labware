import { describe, it, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '../../../testing/utils'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { TYPOGRAPHY, SPACING } from '../../../ui-style-constants'
import { AltPrimaryButton } from '../AltPrimaryButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof AltPrimaryButton>) => {
  return renderWithProviders(<AltPrimaryButton {...props} />)[0]
}

describe('AltPrimaryButton', () => {
  let props: ComponentProps<typeof AltPrimaryButton>

  beforeEach(() => {
    props = {
      children: 'alt primary button',
    }
  })

  it('renders alt primary button with text', () => {
    render(props)
    const button = screen.getByText('alt primary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16} ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight20}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle(`box-shadow: none`)
    expect(button).toHaveStyle(`color: ${COLORS.black90}`)
  })

  it('renders alt primary button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByText('alt primary button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  // (kk: 09/23/2024) hover test needs jsdom update so this will be activated later
  //   it('applies the correct states to the button - hover', () => {
  //     render(props)
  //     const button = screen.getByText('alt primary button')
  //     fireEvent.mouseOver(button)
  //     expect(button).toHaveStyle(`background-color: ${COLORS.grey35}`)
  //   })
})
