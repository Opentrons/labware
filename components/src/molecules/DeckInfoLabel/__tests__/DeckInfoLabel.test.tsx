import { describe, it, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '../../../testing/utils'
import { screen } from '@testing-library/react'
import { SPACING } from '../../../ui-style-constants'
import { BORDERS, COLORS } from '../../../helix-design-system'

import { DeckInfoLabel } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof DeckInfoLabel>) => {
  return renderWithProviders(<DeckInfoLabel {...props} />)
}

describe('DeckInfoLabel', () => {
  let props: ComponentProps<typeof DeckInfoLabel>

  beforeEach(() => {
    props = {
      deckLabel: 'A1',
    }
  })

  it('should render the proper styles - web style', () => {
    render(props)
    const deckInfoLabel = screen.getByTestId('DeckInfoLabel_A1')
    expect(deckInfoLabel).toHaveStyle(
      `padding: ${SPACING.spacing2} ${SPACING.spacing4}`
    )
    expect(deckInfoLabel).toHaveStyle(`height: ${SPACING.spacing20}`)
    expect(deckInfoLabel).toHaveStyle('width: max-content')
    expect(deckInfoLabel).toHaveStyle(`border: 1px solid ${COLORS.black90}`)
    expect(deckInfoLabel).toHaveStyle(`border-radius: ${BORDERS.borderRadius8}`)
  })

  it.todo('should render the proper styles - odd style')

  it('should render deck label', () => {
    render(props)
    screen.getByText('A1')
  })

  it('should render an icon', () => {
    props = {
      iconName: 'ot-temperature-v2',
    }
    render(props)
    screen.getByLabelText(props.iconName)
  })
})
