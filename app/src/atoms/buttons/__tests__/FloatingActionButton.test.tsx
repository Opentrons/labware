import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@opentrons/components'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { FloatingActionButton } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof FloatingActionButton>) => {
  return renderWithProviders(<FloatingActionButton {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('FloatingActionButton', () => {
  let props: ComponentProps<typeof FloatingActionButton>

  beforeEach(() => {
    props = {
      buttonText: 'floating action',
      onClick: vi.fn(),
    }
  })

  it('renders floating action button with text - active', () => {
    render(props)
    const button = screen.getByRole('button')
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing24}`
    )
    expect(button).toHaveStyle(`background-color: ${COLORS.purple50}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle(`box-shadow: ${BORDERS.shadowBig}`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders unselected floating action button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })
})
