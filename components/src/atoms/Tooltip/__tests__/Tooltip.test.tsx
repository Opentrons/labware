import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'

import { COLORS } from '../../../helix-design-system'
import { TOOLTIP_TOP } from '../../../tooltips'
import { SPACING } from '../../../ui-style-constants'
import { POSITION_ABSOLUTE } from '../../../styles'

import { renderWithProviders } from '../../../testing/utils'
import { Tooltip } from '..'

import type { ComponentProps, ReactNode } from 'react'

const render = (props: ComponentProps<typeof Tooltip>) => {
  return renderWithProviders(<Tooltip {...props} />)[0]
}

const placement = TOOLTIP_TOP
const id = 'Tooltip_123'
const tooltipRef = vi.fn()
const tooltipStyle = {
  position: POSITION_ABSOLUTE,
  left: SPACING.spacing4,
} as const
const arrowRef = vi.fn()
const arrowStyle = {
  position: POSITION_ABSOLUTE,
  left: SPACING.spacing8,
} as const

const MockTooltipProps = {
  id: id,
  placement: placement,
  arrowStyle: arrowStyle,
  arrowRef: arrowRef,
  visible: true,
  ref: tooltipRef,
  style: tooltipStyle,
}

describe('Tooltip', () => {
  let props: ComponentProps<typeof Tooltip>

  beforeEach(() => {
    props = {
      children: 'mock children' as ReactNode,
      tooltipProps: MockTooltipProps,
      key: 'mock key',
    }
  })

  it('renders correct children when the tooltip is visible', () => {
    render(props)
    const tooltip = screen.getByText('mock children')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveStyle('position: absolute')
    expect(tooltip).toHaveStyle('left: 0.25rem')
    expect(tooltip).toHaveStyle(`background: ${COLORS.black90}`)
    expect(tooltip).toHaveStyle(`color: ${COLORS.white}`)
    expect(tooltip).toHaveStyle('max-width: 8.75rem')
    expect(tooltip).toHaveStyle('font-size: 0.625rem')
    expect(tooltip).toHaveAttribute('role', 'tooltip')
  })

  it('renders correct children when the tooltip is visible with a specific with', () => {
    props = { ...props, width: '3rem' }
    render(props)
    const tooltip = screen.getByText('mock children')
    expect(tooltip).toHaveStyle('width: 3rem')
  })

  it('does not render children when the tooltip is invisible', () => {
    MockTooltipProps.visible = false
    render(props)
    const tooltip = screen.queryByText('mock children')
    expect(tooltip).not.toBeInTheDocument()
  })
})
