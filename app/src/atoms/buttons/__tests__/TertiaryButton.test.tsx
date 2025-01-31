import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import '@testing-library/jest-dom/vitest'
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@opentrons/components'

import { TertiaryButton } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof TertiaryButton>) => {
  return renderWithProviders(<TertiaryButton {...props} />)[0]
}

describe('TertiaryButton', () => {
  let props: ComponentProps<typeof TertiaryButton>

  beforeEach(() => {
    props = {
      children: 'tertiary button',
    }
  })
  it('renders tertiary button with text', () => {
    render(props)
    const button = screen.getByText('tertiary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16} ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeLabel}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight12}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle('box-shadow: none')
    expect(button).toHaveStyle('overflow: no-wrap')
    expect(button).toHaveStyle('white-space: nowrap')
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders tertiary button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByText('tertiary button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('renders tertiary button with text and different background color', () => {
    props.backgroundColor = COLORS.red50
    render(props)
    const button = screen.getByText('tertiary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.red50}`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })
})
