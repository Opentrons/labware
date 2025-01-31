import { screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach } from 'vitest'
import { SPACING, TYPOGRAPHY } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'

import { OffsetVector } from '../'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof OffsetVector>) => {
  return renderWithProviders(<OffsetVector {...props} />)[0]
}

describe('OffsetVector', () => {
  let props: ComponentProps<typeof OffsetVector>

  beforeEach(() => {
    props = {
      x: 10,
      y: 20,
      z: 30,
    }
  })

  it('renders text with correct styles', () => {
    render(props)
    expect(screen.getAllByRole('heading', { level: 6 })).toHaveLength(6)

    expect(screen.getByText('X')).toHaveStyle(
      `margin-right: ${SPACING.spacing4}`
    )
    expect(screen.getByText('X')).toHaveStyle(
      `font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`
    )
    const x = screen.getByText('10.00')
    expect(x).toHaveStyle(`margin-right: ${SPACING.spacing8}`)

    expect(screen.getByText('Y')).toHaveStyle(
      `margin-right: ${SPACING.spacing4}`
    )
    expect(screen.getByText('Y')).toHaveStyle(
      `font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`
    )
    const y = screen.getByText('20.00')
    expect(y).toHaveStyle(`margin-right: ${SPACING.spacing8}`)

    expect(screen.getByText('Z')).toHaveStyle(
      `margin-right: ${SPACING.spacing4}`
    )
    expect(screen.getByText('Z')).toHaveStyle(
      `font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`
    )
    const z = screen.getByText('30.00')
    expect(z).toHaveStyle(`margin-right: ${SPACING.spacing8}`)
  })

  it('renders numbers using fixed-point notation', () => {
    props.x = 1.0000001
    props.y = 111.11111111
    props.z = 99999.99888
    render(props)
    screen.getByText('1.00')
    screen.getByText('111.11')
    screen.getByText('100000.00')
  })

  it('renders text with a specific heading level', () => {
    props.as = 'h1'
    render(props)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(6)
  })
})
