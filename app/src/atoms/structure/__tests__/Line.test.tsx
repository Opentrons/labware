import { describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { SPACING, COLORS } from '@opentrons/components'
import { Line } from '../index'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Line>) => {
  return renderWithProviders(<Line {...props} />)[0]
}

describe('Line', () => {
  let props: ComponentProps<typeof Line>

  beforeEach(() => {
    props = {
      width: '100%',
    }
  })

  it('renders line', () => {
    render(props)
    const line = screen.getByTestId('line')
    expect(line).toHaveStyle('width: 100%')
    expect(line).toHaveStyle(`borderBottom: 1px solid ${COLORS.grey30}`)
  })

  it('renders line with additional props', () => {
    props = {
      ...props,
      width: '80%',
      color: COLORS.blue50,
      marginY: 0,
      paddingX: SPACING.spacing4,
    }
    render(props)
    const line = screen.getByTestId('line')
    expect(line).toHaveStyle(`color: ${COLORS.blue50}`)
    expect(line).toHaveStyle('width: 80%')
    expect(line).toHaveStyle('margin-top: 0')
    expect(line).toHaveStyle('margin-bottom: 0')
    expect(line).toHaveStyle('padding-left: 0.25rem')
    expect(line).toHaveStyle('padding-right: 0.25rem')
  })
})
