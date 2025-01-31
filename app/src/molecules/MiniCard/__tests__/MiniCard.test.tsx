import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS, SPACING, BORDERS, CURSOR_POINTER } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { MiniCard } from '../'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof MiniCard>) => {
  return renderWithProviders(<MiniCard {...props} />)[0]
}

describe('MiniCard', () => {
  let props: ComponentProps<typeof MiniCard>

  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      isSelected: false,
      children: 'mock mini card',
      isError: false,
    }
  })

  it('renders the correct style unselectedOptionStyles', () => {
    render(props)
    const miniCard = screen.getByText('mock mini card')
    expect(miniCard).toHaveStyle(`background-color: ${COLORS.white}`)
    expect(miniCard).toHaveStyle(`border: 1px solid ${COLORS.grey30}`)
    expect(miniCard).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(miniCard).toHaveStyle(`padding: ${SPACING.spacing8}`)
    expect(miniCard).toHaveStyle(`width: 100%`)
    expect(miniCard).toHaveStyle(`cursor: ${CURSOR_POINTER}`)
  })

  it('renders the correct style selectedOptionStyles', () => {
    props.isSelected = true
    render(props)
    const miniCard = screen.getByText('mock mini card')
    expect(miniCard).toHaveStyle(`background-color: ${COLORS.blue10}`)
    expect(miniCard).toHaveStyle(`border: 1px solid ${COLORS.blue50}`)
    expect(miniCard).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(miniCard).toHaveStyle(`padding: ${SPACING.spacing8}`)
    expect(miniCard).toHaveStyle(`width: 100%`)
    expect(miniCard).toHaveStyle(`cursor: ${CURSOR_POINTER}`)
  })

  it('renders the correct style errorOptionStyles', () => {
    props.isError = true
    props.isSelected = true
    render(props)
    const miniCard = screen.getByText('mock mini card')
    expect(miniCard).toHaveStyle(`background-color: ${COLORS.red20}`)
    expect(miniCard).toHaveStyle(`border: 1px solid ${COLORS.red50}`)
    expect(miniCard).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
    expect(miniCard).toHaveStyle(`padding: ${SPACING.spacing8}`)
    expect(miniCard).toHaveStyle(`width: 100%`)
    expect(miniCard).toHaveStyle(`cursor: ${CURSOR_POINTER}`)
  })

  it('calls mock function when clicking mini card', () => {
    render(props)
    const miniCard = screen.getByText('mock mini card')
    fireEvent.click(miniCard)
    expect(props.onClick).toHaveBeenCalled()
  })
})
