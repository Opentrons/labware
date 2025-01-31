import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { COLORS } from '../../../helix-design-system'
import { LargeButton } from '../LargeButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof LargeButton>) => {
  return renderWithProviders(<LargeButton {...props} />)[0]
}

describe('LargeButton', () => {
  let props: ComponentProps<typeof LargeButton>
  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      buttonText: 'large button',
      iconName: 'play-round-corners',
    }
  })
  it('renders the default button and it works as expected', () => {
    render(props)
    fireEvent.click(screen.getByText('large button'))
    expect(props.onClick).toHaveBeenCalled()
  })
  it('renders the alert button', () => {
    props = {
      ...props,
      buttonType: 'alert',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.red35}`
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

  it('renders the alertStroke button', () => {
    props = {
      ...props,
      buttonType: 'alertStroke',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.transparent}`
    )
  })

  it('renders the alertAlt button', () => {
    props = {
      ...props,
      buttonType: 'alertAlt',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.white}`
    )
  })

  it('renders the stroke button', () => {
    props = {
      ...props,
      buttonType: 'stroke',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.white}`
    )
    expect(screen.getByRole('button')).toHaveStyle(`color: ${COLORS.blue50}`)
  })

  it('renders the button as disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
