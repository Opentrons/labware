import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { SPACING, COLORS } from '@opentrons/components'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_HIGHLIGHT_LIQUID_IN_DETAIL_MODAL,
} from '/app/redux/analytics'
import { getIsOnDevice } from '/app/redux/config'
import { LiquidDetailCard } from '../LiquidDetailCard'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof LiquidDetailCard>) => {
  return renderWithProviders(<LiquidDetailCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}
let mockTrackEvent: Mock

describe('LiquidDetailCard', () => {
  let props: ComponentProps<typeof LiquidDetailCard>

  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    props = {
      liquidId: '0',
      displayName: 'Mock Liquid',
      description: 'Mock Description',
      displayColor: '#FFF',
      volumeByWell: { A1: 50, B1: 50 },
      labwareWellOrdering: [
        ['A1', 'B1', 'C1', 'D1'],
        ['A2', 'B2', 'C2', 'D2'],
        ['A3', 'B3', 'C3', 'D3'],
      ],
      setSelectedValue: vi.fn(),
      selectedValue: '2',
    }
  })

  it('renders liquid name, description, total volume', () => {
    render(props)
    screen.getByText('Mock Liquid')
    screen.getByText('Mock Description')
    screen.getAllByText(nestedTextMatcher('100.0 µL'))
  })

  it('renders clickable box, clicking on it calls track event', () => {
    render(props)
    fireEvent.click(screen.getByTestId('LiquidDetailCard_box'))
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_HIGHLIGHT_LIQUID_IN_DETAIL_MODAL,
      properties: {},
    })
  })

  it('renders well volume information if selected', () => {
    render({
      ...props,
      selectedValue: '0',
    })
    screen.getByText('A1')
    screen.getByText('B1')
    screen.getAllByText(nestedTextMatcher('50.0 µL'))
  })
  it('renders well range for volume info if selected', () => {
    render({
      ...props,
      selectedValue: '0',
      volumeByWell: { A1: 50, B1: 50, C1: 50, D1: 50 },
    })
    screen.getByText('A1: D1')
    screen.getByText(nestedTextMatcher('50.0 µL'))
  })
  it('renders liquid name, description, total volume for odd, and clicking item selects the box', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByText('Mock Liquid')
    screen.getByText('Mock Description')
    screen.getAllByText(nestedTextMatcher('100.0 µL'))
    expect(screen.getByLabelText('liquidBox_odd')).toHaveStyle(
      `border: ${SPACING.spacing4} solid ${COLORS.grey30}`
    )
  })
})
