import { describe, it, beforeEach, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'

import { SlotInformation } from '..'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockLiquids = ['Mastermix', 'Ethanol', 'Water']
const mockLabwares = ['96 Well Plate']
const mockAdapters = ['Adapter']
const mockModules = ['Thermocycler Module Gen2', 'Heater-Shaker Module']

const mockLocation = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useLocation: () => mockLocation,
  }
})

const render = (props: ComponentProps<typeof SlotInformation>) => {
  return renderWithProviders(<SlotInformation {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SlotInformation', () => {
  let props: ComponentProps<typeof SlotInformation>

  beforeEach(() => {
    props = {
      robotType: FLEX_ROBOT_TYPE,
      location: 'A1',
      liquids: [],
      labwares: [],
      adapters: [],
      modules: [],
      fixtures: [],
    }
  })

  it('should render DeckInfoLabel and title', () => {
    render(props)
    screen.getByText('A1')
    screen.getByText('Slot Detail')
  })

  it('should render liquid, labware, and module', () => {
    render(props)
    screen.getByText('Liquid')
    screen.getByText('Labware')
    screen.getByText('Module')
    screen.getByText('Fixtures')
    expect(screen.getAllByText('None').length).toBe(4)
  })

  it('should render info of liquid, labware, and module', () => {
    props = {
      ...props,
      liquids: mockLiquids,
      labwares: mockLabwares,
      adapters: mockAdapters,
      modules: mockModules,
    }
    render(props)
    screen.debug()

    expect(screen.getAllByText('Liquid').length).toBe(1)
    expect(screen.getAllByText('Labware').length).toBe(
      mockLabwares.length + mockAdapters.length
    )
    expect(screen.getAllByText('Module').length).toBe(mockModules.length)
    screen.getByText('Mastermix, Ethanol, Water')
    screen.getByText('96 Well Plate')
    screen.getByText('Adapter')
    screen.getByText('Thermocycler Module Gen2')
    screen.getByText('Heater-Shaker Module')
  })
})
