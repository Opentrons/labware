import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { RunningProtocolSkeleton } from '../RunningProtocolSkeleton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof RunningProtocolSkeleton>) => {
  return renderWithProviders(<RunningProtocolSkeleton {...props} />)
}

describe('RunningProtocolSkeleton', () => {
  let props: ComponentProps<typeof RunningProtocolSkeleton>

  beforeEach(() => {
    props = {
      currentOption: 'CurrentRunningProtocolCommand',
    }
  })

  it('renders Skeletons when current option is CurrentRunningProtocolCommand', () => {
    render(props)
    const skeletons = screen.getAllByTestId('Skeleton')
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
    // Note Skeleton component checks width and height so here just check the number of skeletons and background-size
    expect(skeletons.length).toBe(4)
    expect(skeletons[0]).toHaveStyle('animation: shimmer 2s infinite linear')
    expect(skeletons[0]).toHaveStyle(`background-size: 99rem`)
  })

  it('renders Skeletons when current option is RunningProtocolCommandList', () => {
    props = { currentOption: 'RunningProtocolCommandList' }
    render(props)
    const skeletons = screen.getAllByTestId('Skeleton')
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2)
    expect(skeletons.length).toBe(8)
    expect(skeletons[0]).toHaveStyle('animation: shimmer 2s infinite linear')
    expect(skeletons[0]).toHaveStyle(`background-size: 389rem`)
  })
})
