import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'

import {
  useModulesQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'
import {
  getFixtureDisplayName,
  WASTE_CHUTE_FIXTURES,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { AddFixtureModal } from '../AddFixtureModal'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'
import type { UseQueryResult } from 'react-query'
import type { DeckConfiguration } from '@opentrons/shared-data'
import type { Modules } from '@opentrons/api-client'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/deck_configuration')

const mockCloseModal = vi.fn()
const mockUpdateDeckConfiguration = vi.fn()

const render = (props: ComponentProps<typeof AddFixtureModal>) => {
  return renderWithProviders(<AddFixtureModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Touchscreen AddFixtureModal', () => {
  let props: ComponentProps<typeof AddFixtureModal>

  beforeEach(() => {
    props = {
      cutoutId: 'cutoutD3',
      closeModal: mockCloseModal,
      isOnDevice: true,
    }
    vi.mocked(useUpdateDeckConfigurationMutation).mockReturnValue({
      updateDeckConfiguration: mockUpdateDeckConfiguration,
    } as any)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue(({
      data: [],
    } as unknown) as UseQueryResult<DeckConfiguration>)
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: { data: [] },
    } as unknown) as UseQueryResult<Modules>)
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Add to slot D3')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )
    screen.getByText('Fixtures')
    screen.getByText('Modules')
    expect(screen.getAllByText('Select options').length).toBe(2)
  })

  it('should set deck config when tapping add button', () => {
    render(props)
    fireEvent.click(screen.getAllByText('Select options')[1])
    fireEvent.click(screen.getAllByText('Add')[0])
  })

  it('when fixture options are provided, should only render those options', () => {
    props = {
      ...props,
      providedFixtureOptions: ['trashBinAdapter'],
    }
    render(props)
    screen.getByText('Add to slot D3')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )
    expect(screen.queryByText('Staging area slot')).toBeNull()
    screen.getByText('Trash bin')
    expect(screen.queryByText('Waste chute')).toBeNull()
    expect(screen.getAllByText('Add').length).toBe(1)
    expect(screen.queryByText('Select options')).toBeNull()
  })
})

describe('Desktop AddFixtureModal', () => {
  let props: ComponentProps<typeof AddFixtureModal>

  beforeEach(() => {
    props = {
      cutoutId: 'cutoutD3',
      closeModal: mockCloseModal,
    }
    vi.mocked(useUpdateDeckConfigurationMutation).mockReturnValue({
      updateDeckConfiguration: mockUpdateDeckConfiguration,
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render text and buttons slot D3', () => {
    render(props)
    screen.getByText('Add to slot D3')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )

    screen.getByText('Fixtures')
    screen.getByText('Modules')
    fireEvent.click(screen.getAllByText('Select options')[0])
    screen.getByText('Staging area slot')
    screen.getByText('Trash bin')
    screen.getByText('Waste chute')
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBe(2)
    expect(
      screen.getAllByRole('button', { name: 'Select options' }).length
    ).toBe(1)
  })

  it('should render text and buttons slot A1', () => {
    props = { ...props, cutoutId: 'cutoutA1' }
    render(props)
    screen.getByText('Add to slot A1')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )
    screen.getByText('Fixtures')
    screen.getByText('Modules')
    fireEvent.click(screen.getAllByText('Select options')[0])
    screen.getByText('Trash bin')
    screen.getByRole('button', { name: 'Add' })
  })

  it('should render text and buttons slot B3', () => {
    props = { ...props, cutoutId: 'cutoutB3' }
    render(props)
    screen.getByText('Add to slot B3')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )
    screen.getByText('Fixtures')
    screen.getByText('Modules')
    fireEvent.click(screen.getAllByText('Select options')[0])
    screen.getByText('Staging area slot')
    screen.getByText('Trash bin')
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBe(2)
  })

  it('should only render module options in column 2', () => {
    props = { ...props, cutoutId: 'cutoutB2' }
    render(props)
    screen.getByText('Add to slot B2')
    screen.getByText(
      'Add this hardware to your deck configuration. It will be referenced during protocol analysis.'
    )
    screen.getByText('Magnetic Block GEN1')
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('should call update deck config when add button is clicked', () => {
    props = { ...props, cutoutId: 'cutoutA1' }
    render(props)
    fireEvent.click(screen.getAllByText('Select options')[1])
    fireEvent.click(screen.getByText('Add'))
    expect(mockUpdateDeckConfiguration).toHaveBeenCalled()
  })

  it('should display appropriate Waste Chute options when the generic Waste Chute button is clicked', () => {
    render(props)
    fireEvent.click(screen.getAllByText('Select options')[0]) // click fixtures
    fireEvent.click(screen.getByRole('button', { name: 'Select options' })) // click waste chute options
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBe(
      WASTE_CHUTE_FIXTURES.length
    )

    WASTE_CHUTE_FIXTURES.forEach(cutoutId => {
      const displayText = getFixtureDisplayName(cutoutId)
      screen.getByText(displayText)
    })
  })

  it('should allow a user to exit the Waste Chute submenu by clicking "go back"', () => {
    render(props)
    fireEvent.click(screen.getAllByText('Select options')[0]) // click fixtures
    fireEvent.click(screen.getByRole('button', { name: 'Select options' }))

    fireEvent.click(screen.getByText('Go back'))
    screen.getByText('Staging area slot')
    screen.getByText('Trash bin')
    screen.getByText('Waste chute')
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBe(2)
    expect(
      screen.getAllByRole('button', { name: 'Select options' }).length
    ).toBe(1)
  })
})
