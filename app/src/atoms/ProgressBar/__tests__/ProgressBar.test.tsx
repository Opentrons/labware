import { describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { css } from 'styled-components'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { ProgressBar } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ProgressBar>) => {
  return renderWithProviders(<ProgressBar {...props} />)
}

describe('ProgressBar', () => {
  let props: ComponentProps<typeof ProgressBar>

  beforeEach(() => {
    props = {
      percentComplete: 0,
    }
  })

  it('renders LinerProgress Bar at 0% width', () => {
    render(props)
    const container = screen.getByTestId('ProgressBar_Container')
    const bar = screen.getByTestId('ProgressBar_Bar')
    expect(container).toHaveStyle(`background: ${COLORS.white}`)
    expect(bar).toHaveStyle('width: 0%')
  })

  it('renders LinerProgress Bar at 50% width', () => {
    props.percentComplete = 50
    render(props)
    const bar = screen.getByTestId('ProgressBar_Bar')
    expect(bar).toHaveStyle(`background: ${COLORS.blue50}`)
    expect(bar).toHaveStyle('width: 50%')
  })

  it('renders LinerProgress Bar at 100% width', () => {
    props.percentComplete = 100
    render(props)
    const bar = screen.getByTestId('ProgressBar_Bar')
    expect(bar).toHaveStyle(`background: ${COLORS.blue50}`)
    expect(bar).toHaveStyle('width: 100%')
  })

  it('renders LinerProgress Bar at 50% + red width', () => {
    props.percentComplete = 50
    props.innerStyles = css`
      background: ${COLORS.red50};
    `
    render(props)
    const bar = screen.getByTestId('ProgressBar_Bar')
    expect(bar).not.toHaveStyle(`background: ${COLORS.blue50}`)
    expect(bar).toHaveStyle(`background: ${COLORS.red50}`)
    expect(bar).toHaveStyle('width: 50%')
  })
})
