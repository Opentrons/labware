import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { LiquidDefinitions } from '../LiquidDefinitions'

import type { ComponentProps } from 'react'
import type { InfoScreen } from '@opentrons/components'

vi.mock('../../../feature-flags/selectors')

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof InfoScreen>()
  return {
    ...actual,
    InfoScreen: () => <div>mock InfoScreen</div>,
  }
})

const mockAllIngredientGroupFields = {
  '0': {
    name: 'EtOH',
    displayColor: '#b925ff',
    description: 'Immer fisch Hergestllter EtOH',
    liquidClass: null,
    serialize: false,
    liquidGroupId: '0',
  },
  '1': {
    name: '10mM Tris pH8,5',
    displayColor: '#ffd600',
    description: null,
    liquidClass: null,
    serialize: false,
    liquidGroupId: '1',
  },
  '2': {
    name: 'Amplicon PCR sample + AMPure XP beads',
    displayColor: '#9dffd8',
    description: '25µl Amplicon PCR + 20 µl AMPure XP beads',
    liquidClass: 'Water',
    serialize: false,
    liquidGroupId: '2',
  },
}

const render = (props: ComponentProps<typeof LiquidDefinitions>) => {
  return renderWithProviders(<LiquidDefinitions {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LiquidDefinitions', () => {
  let props: ComponentProps<typeof LiquidDefinitions>

  beforeEach(() => {
    props = {
      allIngredientGroupFields: {},
    }
  })

  it('should render text and InfoScreen if no liquid', () => {
    render(props)
    screen.getByText('Liquid Definitions')
    screen.getByText('mock InfoScreen')
  })

  it('should render liquid information if there are liquids', () => {
    props = {
      allIngredientGroupFields: mockAllIngredientGroupFields,
    }
    render(props)
    screen.getByText('EtOH')
    screen.getByText('Immer fisch Hergestllter EtOH')

    screen.getByText('10mM Tris pH8,5')
    screen.getByText('N/A')

    screen.getByText('Amplicon PCR sample + AMPure XP beads')
    screen.getByText('25µl Amplicon PCR + 20 µl AMPure XP beads')
  })
})
