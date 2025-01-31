import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { COLORS, SIZE_2 } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'

import { ToggleButton } from '..'

import type { ComponentProps } from 'react'

const mockOnClick = vi.fn()

const render = (props: ComponentProps<typeof ToggleButton>) => {
  return renderWithProviders(<ToggleButton {...props} />)[0]
}

describe('ToggleButton', () => {
  let props: ComponentProps<typeof ToggleButton>

  beforeEach(() => {
    props = {
      label: 'toggle button',
      id: 'mock-toggle-button',
      toggledOn: true,
      disabled: false,
      onClick: mockOnClick,
    }
  })

  it('renders toggle button - on', () => {
    render(props)
    const button = screen.getByLabelText('toggle button')
    expect(button).toHaveStyle(`color: ${COLORS.blue50}`)
    expect(button).toHaveStyle(`height: ${SIZE_2}`)
    expect(button).toHaveStyle(`width: ${SIZE_2}`)
    expect(button).toHaveAttribute('aria-checked', 'true')
  })

  it('applies the correct states to the toggle on- disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByLabelText('toggle button')
    expect(button).toHaveStyle(`color: ${COLORS.grey30}`)
  })

  it('calls mock function when clicking the toggle button - on', () => {
    render(props)
    const button = screen.getByLabelText('toggle button')
    fireEvent.click(button)
    expect(props.onClick).toHaveBeenCalled()
  })

  it('renders toggle button - off', () => {
    props.toggledOn = false
    render(props)
    const button = screen.getByLabelText('toggle button')
    expect(button).toHaveStyle(`color: ${COLORS.grey50}`)
    expect(button).toHaveStyle(`height: ${SIZE_2}`)
    expect(button).toHaveStyle(`width: ${SIZE_2}`)
    expect(button).toHaveAttribute('aria-checked', 'false')
  })

  it('applies the correct states to the toggle off- disabled', () => {
    props.toggledOn = false
    props.disabled = true
    render(props)
    const button = screen.getByLabelText('toggle button')
    expect(button).toHaveStyle(`color: ${COLORS.grey30}`)
  })

  it('calls mock function when clicking the toggle button - off', () => {
    props.toggledOn = false
    render(props)
    const button = screen.getByLabelText('toggle button')
    fireEvent.click(button)
    expect(props.onClick).toHaveBeenCalled()
  })
})
