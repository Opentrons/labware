import { describe, it, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { BackgroundOverlay } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof BackgroundOverlay>) => {
  return renderWithProviders(<BackgroundOverlay {...props} />)[0]
}

describe('BackgroundOverlay', () => {
  let props: ComponentProps<typeof BackgroundOverlay>
  it('renders background overlay', () => {
    props = { onClick: vi.fn() }
    render(props)
    fireEvent.click(screen.getByLabelText('BackgroundOverlay'))
    expect(props.onClick).toHaveBeenCalled()
  })
})
