import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { DeckLabel } from '../../../molecules/DeckLabel'
import { DeckLabelSet } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../molecules/DeckLabel')

const mockDeckLabels = [
  {
    text: 'Label',
    isSelected: false,
    labelBorderRadius: BORDERS.borderRadius4,
    isZoomed: true,
  },
  {
    text: 'Label',
    isSelected: false,
    labelBorderRadius: BORDERS.borderRadius4,
    isZoomed: true,
  },
]

const render = (props: ComponentProps<typeof DeckLabelSet>) => {
  return renderWithProviders(<DeckLabelSet {...props} />)
}
describe('DeckLabelSet', () => {
  let props: ComponentProps<typeof DeckLabelSet>

  beforeEach(() => {
    props = {
      x: 1,
      y: 1,
      width: 50,
      height: 50,
      deckLabels: mockDeckLabels,
    }
    vi.mocked(DeckLabel).mockReturnValue(<div>mock DeckLabels</div>)
  })

  it('should render blue border and DeckLabel', () => {
    render(props)
    expect(screen.getAllByText('mock DeckLabels').length).toBe(2)
    const deckLabelSet = screen.getByTestId('DeckLabeSet')
    expect(deckLabelSet).toHaveStyle(`border: 1.5px solid ${COLORS.blue50}`)
    expect(deckLabelSet).toHaveStyle(`border-radius: ${BORDERS.borderRadius4}`)
  })
})
