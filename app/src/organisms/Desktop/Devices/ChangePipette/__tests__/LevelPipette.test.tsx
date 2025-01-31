import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { LEFT } from '@opentrons/shared-data'
import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LevelPipette } from '../LevelPipette'

import type { ComponentProps } from 'react'
import type { PipetteNameSpecs } from '@opentrons/shared-data'

const render = (props: ComponentProps<typeof LevelPipette>) => {
  return renderWithProviders(<LevelPipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_WANTED_PIPETTE = {
  displayName: 'P300 8-Channel GEN2',
  displayCategory: 'GEN2',
  defaultAspirateFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  defaultDispenseFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  defaultBlowOutFlowRate: {
    value: 94,
    min: 1,
    max: 275,
    valuesByApiLevel: {
      '2.0': 94,
    },
  },
  channels: 8,
  minVolume: 20,
  maxVolume: 300,
  smoothieConfigs: {
    stepsPerMM: 3200,
    homePosition: 155.75,
    travelDistance: 60,
  },
  defaultTipracks: [
    'opentrons/opentrons_96_tiprack_300ul/1',
    'opentrons/opentrons_96_filtertiprack_200ul/1',
  ],
  name: 'p300_multi_gen2',
} as PipetteNameSpecs

describe('LevelPipette', () => {
  let props: ComponentProps<typeof LevelPipette>

  beforeEach(() => {
    props = {
      mount: LEFT,
      pipetteModelName: MOCK_WANTED_PIPETTE.name,
      confirm: vi.fn(),
    }
  })

  it('renders title and description', () => {
    render(props)
    screen.getByText(nestedTextMatcher('Level the pipette'))
    screen.getByText(
      nestedTextMatcher(
        'Using your hand, gently and slowly push the pipette up.'
      )
    )
    screen.getByText(
      nestedTextMatcher(
        'Place the calibration block in slot 3 with the tall surface on the left side.'
      )
    )
    screen.getByText(
      nestedTextMatcher(
        'Pull the pipette down so all 8 nozzles touch the surface of the block.'
      )
    )
    screen.getByText(
      nestedTextMatcher(
        'While holding the pipette down, tighten the three screws.'
      )
    )
    screen.getByText(
      nestedTextMatcher('Gently and slowly push the pipette back up.')
    )
  })

  it('the CTA should be clickable', () => {
    render(props)
    const cont = screen.getByRole('button', { name: 'Confirm level' })
    fireEvent.click(cont)
    expect(props.confirm).toHaveBeenCalled()
  })
})
