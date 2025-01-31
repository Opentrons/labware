import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS, BORDERS } from '@opentrons/components'

import { SmallButton } from '../SmallButton'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof SmallButton>) => {
  return renderWithProviders(<SmallButton {...props} />)[0]
}

describe('SmallButton', () => {
  let props: ComponentProps<typeof SmallButton>

  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      buttonText: 'small button',
    }
  })

  it('renders the primary button and it works as expected', () => {
    render(props)
    fireEvent.click(screen.getByText('small button'))
    expect(props.onClick).toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.blue50}`
    )
    expect(screen.getByRole('button')).toHaveStyle(
      `border-radius: ${BORDERS.borderRadius16}`
    )
  })
  it('renders the alert button', () => {
    props = {
      ...props,
      buttonType: 'alert',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.red50}`
    )
  })

  it('renders the secondary button', () => {
    props = {
      ...props,
      buttonType: 'secondary',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.blue35}`
    )
  })

  it('renders the tertiary high light button', () => {
    props = {
      ...props,
      buttonType: 'tertiaryHighLight',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(`color: ${COLORS.black90}`)
  })

  it('renders the tertiary low light', () => {
    props = {
      ...props,
      buttonType: 'tertiaryLowLight',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('renders the button as disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders the rounded button category', () => {
    props = {
      ...props,
      buttonCategory: 'rounded',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `border-radius: ${BORDERS.borderRadius40}`
    )
  })

  it('renders an icon with start placement', () => {
    props = {
      ...props,
      iconName: 'alert',
      iconPlacement: 'startIcon',
    }
    render(props)
    screen.getByLabelText('alert')
  })
  it('renders an icon with end placement', () => {
    props = {
      ...props,
      iconName: 'alert',
      iconPlacement: 'endIcon',
    }
    render(props)
    screen.getByLabelText('alert')
  })

  it('should render disabled style when ariaDisabled is true', () => {
    props = {
      ...props,
      ariaDisabled: true,
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.grey35}`
    )
    expect(screen.getByRole('button')).toHaveStyle(`color: ${COLORS.grey50}`)
  })

  it('should not render disabled style when ariaDisabled is false and disabled is false', () => {
    props = {
      ...props,
      disabled: false,
      ariaDisabled: false,
    }
    render(props)
    expect(screen.getByRole('button')).not.toHaveStyle(
      `background-color: ${COLORS.grey35}`
    )
    expect(screen.getByRole('button')).not.toHaveStyle(
      `color: ${COLORS.grey50}`
    )
  })
})
