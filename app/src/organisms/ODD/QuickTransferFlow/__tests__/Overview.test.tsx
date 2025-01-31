import { screen } from '@testing-library/react'
import { describe, it, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { Overview } from '../Overview'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Overview>) => {
  return renderWithProviders(<Overview {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Overview', () => {
  let props: ComponentProps<typeof Overview>

  beforeEach(() => {
    props = {
      state: {
        pipette: {
          displayName: 'Pipette display name',
        } as any,
        tipRack: {
          metadata: {
            displayName: 'Tip rack display name',
          },
        } as any,
        source: {
          metadata: {
            displayName: 'Source labware name',
          },
        } as any,
        destination: {
          metadata: {
            displayName: 'Destination labware name',
          },
        } as any,
        transferType: 'transfer',
        volume: 25,
      } as any,
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the summary fields for a 1 to 1 transfer', () => {
    render(props)
    screen.getByText('Pipette')
    screen.getByText('Pipette display name')
    screen.getByText('Tip rack')
    screen.getByText('Tip rack display name')
    screen.getByText('Source labware')
    screen.getByText('Source labware name')
    screen.getByText('Destination labware')
    screen.getByText('Destination labware name')
    screen.getByText('Volume per well')
    screen.getByText('25µL')
  })
  it('renders the correct volume wording for n to 1 transfer', () => {
    props = {
      state: {
        pipette: {
          displayName: 'Pipette display name',
        } as any,
        tipRack: {
          metadata: {
            displayName: 'Tip rack display name',
          },
        } as any,
        source: {
          metadata: {
            displayName: 'Source labware name',
          },
        } as any,
        destination: {
          metadata: {
            displayName: 'Destination labware name',
          },
        } as any,
        transferType: 'consolidate',
        volume: 25,
      } as any,
    }
    render(props)
    screen.getByText('Aspirate volume per well')
  })
  it('renders the correct volume wording for 1 to n transfer', () => {
    props = {
      state: {
        pipette: {
          displayName: 'Pipette display name',
        } as any,
        tipRack: {
          metadata: {
            displayName: 'Tip rack display name',
          },
        } as any,
        source: {
          metadata: {
            displayName: 'Source labware name',
          },
        } as any,
        destination: {
          metadata: {
            displayName: 'Destination labware name',
          },
        } as any,
        transferType: 'distribute',
        volume: 25,
      } as any,
    }
    render(props)
    screen.getByText('Dispense volume per well')
  })
})
