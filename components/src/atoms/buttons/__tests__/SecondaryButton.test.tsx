import { describe, it, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '../../../testing/utils'
import { TYPOGRAPHY, SPACING } from '../../../ui-style-constants'
import { BORDERS, COLORS } from '../../../helix-design-system'

import { SecondaryButton } from '../SecondaryButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof SecondaryButton>) => {
  return renderWithProviders(<SecondaryButton {...props} />)[0]
}

describe('SecondaryButton', () => {
  let props: ComponentProps<typeof SecondaryButton>

  beforeEach(() => {
    props = {
      children: 'secondary button',
    }
  })

  it('renders primary button with text', () => {
    render(props)
    const button = screen.getByText('secondary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight20}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle(`color: ${COLORS.blue50}`)
  })

  it('renders secondary button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByText('secondary button')
    expect(button).toBeDisabled()
  })

  it('renders secondary button with text and different background color', () => {
    props.color = COLORS.red50
    render(props)
    const button = screen.getByText('secondary button')
    expect(button).toHaveStyle(`color: ${COLORS.red50}`)
  })
})
