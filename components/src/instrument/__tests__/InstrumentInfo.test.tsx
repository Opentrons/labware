import { screen } from '@testing-library/react'
import { describe, beforeEach, it, vi } from 'vitest'
import { LEFT, RIGHT, fixtureP1000SingleV2Specs } from '@opentrons/shared-data'
import { renderWithProviders } from '../../testing/utils'
import { InstrumentInfo } from '../InstrumentInfo'
import { InstrumentDiagram } from '../InstrumentDiagram'

import type { ComponentProps } from 'react'

vi.mock('../InstrumentDiagram')

const render = (props: ComponentProps<typeof InstrumentInfo>) => {
  return renderWithProviders(<InstrumentInfo {...props} />)[0]
}

describe('InstrumentInfo', () => {
  let props: ComponentProps<typeof InstrumentInfo>

  beforeEach(() => {
    props = {
      mount: LEFT,
      description: 'mock description',
      pipetteSpecs: fixtureP1000SingleV2Specs,
      tiprackModels: ['mock1', 'mock2'],
      showMountLabel: true,
    }
    vi.mocked(InstrumentDiagram).mockReturnValue(
      <div>mock instrumentDiagram</div>
    )
  })
  it('renders a p1000 pipette with 2 tiprack models for left mount', () => {
    render(props)
    screen.getByText('mock instrumentDiagram')
    screen.getByText('left pipette')
    screen.getByText('mock description')
    screen.getByText('Tip rack')
    screen.getByText('mock1')
    screen.getByText('mock2')
  })
  it('renders a p1000 pipette with 1 tiprack model for right mount', () => {
    props.mount = RIGHT
    props.tiprackModels = ['mock1']
    render(props)
    screen.getByText('mock instrumentDiagram')
    screen.getByText('right pipette')
    screen.getByText('mock description')
    screen.getByText('Tip rack')
    screen.getByText('mock1')
  })
  it('renders none for pip and tiprack if none are selected', () => {
    props.pipetteSpecs = undefined
    props.tiprackModels = undefined
    render(props)
    screen.getByText('None')
  })
})
