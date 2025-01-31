import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'

import { SubmitPrimaryButton } from '..'
import type { ComponentProps } from 'react'

const mockOnClick = vi.fn()

const render = (props: ComponentProps<typeof SubmitPrimaryButton>) => {
  return renderWithProviders(<SubmitPrimaryButton {...props} />)[0]
}

describe('SubmitPrimaryButton', () => {
  let props: ComponentProps<typeof SubmitPrimaryButton>

  beforeEach(() => {
    props = {
      form: 'mockForm',
      value: 'submit primary button',
      onClick: mockOnClick,
      disabled: false,
    }
  })

  it('renders submit primary button with text - active', () => {
    render(props)
    const button = screen.getByText('submit primary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight20}`)
    expect(button).toHaveStyle('width: 100%')
    expect(button).toHaveStyle('border: none')
    expect(button).toHaveAttribute('form', 'mockForm')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('renders secondary tertiary button with text and disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    const button = screen.getByText('submit primary button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('calls mock function when clicking the button', () => {
    render(props)
    const button = screen.getByText('submit primary button')
    fireEvent.click(button)
    expect(props.onClick).toHaveBeenCalled()
  })
})
