import { describe, it, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '../../../testing/utils'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { TYPOGRAPHY, SPACING } from '../../../ui-style-constants'
import { PrimaryButton } from '../PrimaryButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof PrimaryButton>) => {
  return renderWithProviders(<PrimaryButton {...props} />)[0]
}

describe('PrimaryButton', () => {
  let props: ComponentProps<typeof PrimaryButton>

  beforeEach(() => {
    props = {
      children: 'primary button',
    }
  })

  it('renders primary button with text', () => {
    render(props)
    const button = screen.getByText('primary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
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
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders primary button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByText('primary button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('applies the correct states to the button - hover', () => {
    render(props)
    const button = screen.getByText('primary button')
    fireEvent.mouseOver(button)
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
  })

  it('renders primary button with text and different background color', () => {
    props.backgroundColor = COLORS.red50
    render(props)
    const button = screen.getByText('primary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.red50}`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })
})
