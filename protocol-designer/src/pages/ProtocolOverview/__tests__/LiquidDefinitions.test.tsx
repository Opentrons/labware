import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { LiquidDefinitions } from '../LiquidDefinitions'

import type { ComponentProps } from 'react'
import type { LiquidEntities } from '@opentrons/step-generation'
import type { InfoScreen } from '@opentrons/components'

vi.mock('../../../feature-flags/selectors')

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof InfoScreen>()
  return {
    ...actual,
    InfoScreen: () => <div>mock InfoScreen</div>,
  }
})

const mockAllIngredientGroupFields: LiquidEntities = {
  '0': {
    displayName: 'EtOH',
    displayColor: '#b925ff',
    description: 'Immer fisch Hergestllter EtOH',
    liquidGroupId: '0',
    pythonName: 'liquid_1',
  },
  '1': {
    displayName: '10mM Tris pH8,5',
    displayColor: '#ffd600',
    description: null,
    liquidGroupId: '1',
    pythonName: 'liquid_2',
  },
  '2': {
    displayName: 'Amplicon PCR sample + AMPure XP beads',
    displayColor: '#9dffd8',
    description: '25µl Amplicon PCR + 20 µl AMPure XP beads',
    liquidClass: 'Water',
    liquidGroupId: '2',
    pythonName: 'liquid_3',
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
