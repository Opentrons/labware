import { vi, it, expect, describe } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { COLORS } from '../../../helix-design-system'
import { renderWithProviders } from '../../../testing/utils'
import { OverflowBtn } from '../OverflowBtn'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof OverflowBtn>) => {
  return renderWithProviders(<OverflowBtn {...props} />)[0]
}

describe('OverflowBtn', () => {
  it('renders a clickable button', () => {
    const handleClick = vi.fn()
    render({
      onClick: handleClick,
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders a hover state', () => {
    render({
      onClick: vi.fn(),
    })
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.transparent}`
    )
  })
})
