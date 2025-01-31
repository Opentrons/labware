import { screen } from '@testing-library/react'
import { describe, it, beforeEach, expect } from 'vitest'

import { COLORS } from '../../../helix-design-system'
import { SPACING } from '../../../ui-style-constants'
import { FLEX_MAX_CONTENT } from '../../../styles'
import { renderWithProviders } from '../../../testing/utils'
import { DeckLabel } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof DeckLabel>) => {
  return renderWithProviders(<DeckLabel {...props} />)
}

describe('DeckLabel', () => {
  let props: ComponentProps<typeof DeckLabel>

  beforeEach(() => {
    props = {
      text: 'mock DeckLabel text',
      isSelected: false,
      isLast: true,
      isZoomed: true,
    }
  })

  it('should render text and styles isSelected - false', () => {
    render(props)
    screen.getByText('mock DeckLabel text')
    const deckLabel = screen.getByTestId('DeckLabel_UnSelected')
    expect(deckLabel).toHaveStyle(`padding: ${SPACING.spacing2}`)
    expect(deckLabel).toHaveStyle(`width: ${FLEX_MAX_CONTENT}`)
    expect(deckLabel).toHaveStyle(`color: ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`border-right: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`border-bottom: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`border-left: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`background-color: ${COLORS.white}`)
  })

  it('should render text and styles isSelected - false not last', () => {
    props = {
      ...props,
      isLast: false,
    }
    render(props)
    screen.getByText('mock DeckLabel text')
    const deckLabel = screen.getByTestId('DeckLabel_UnSelected')
    expect(deckLabel).toHaveStyle(`padding: ${SPACING.spacing2}`)
    expect(deckLabel).toHaveStyle(`width: ${FLEX_MAX_CONTENT}`)
    expect(deckLabel).toHaveStyle(`color: ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`border-right: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`border-left: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`background-color: ${COLORS.white}`)
  })

  it('should render text and styles isSelected - true', () => {
    props = {
      ...props,
      isSelected: true,
    }
    render(props)
    screen.getByText('mock DeckLabel text')
    const deckLabel = screen.getByTestId('DeckLabel_Selected')
    expect(deckLabel).toHaveStyle(`padding: ${SPACING.spacing2}`)
    expect(deckLabel).toHaveStyle(`width: ${FLEX_MAX_CONTENT}`)
    expect(deckLabel).toHaveStyle(`color: ${COLORS.white}`)
    expect(deckLabel).toHaveStyle(`border: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabel).toHaveStyle(`background-color: ${COLORS.blue50}`)
  })
})
