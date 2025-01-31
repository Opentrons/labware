import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockTemperatureModule,
  mockTemperatureModuleGen2,
} from '/app/redux/modules/__fixtures__'
import { TemperatureModuleSlideout } from '../TemperatureModuleSlideout'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof TemperatureModuleSlideout>) => {
  return renderWithProviders(<TemperatureModuleSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TemperatureModuleSlideout', () => {
  let props: ComponentProps<typeof TemperatureModuleSlideout>
  let mockCreateLiveCommand = vi.fn()

  beforeEach(() => {
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)

    props = {
      module: mockTemperatureModule,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct title and body for a gen1 temperature module', () => {
    render(props)

    screen.getByText('Set Temperature for Temperature Module GEN1')
    screen.getByText(
      'Pre heat or cool your Temperature Module GEN1. Enter a whole number between 4 °C and 96 °C.'
    )
    screen.getByText('Set temperature')
  })

  it('renders correct title and body for a gen2 temperature module', () => {
    props = {
      module: mockTemperatureModuleGen2,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
    render(props)

    screen.getByText('Set Temperature for Temperature Module GEN2')
    screen.getByText(
      'Pre heat or cool your Temperature Module GEN2. Enter a whole number between 4 °C and 96 °C.'
    )
    screen.getByText('Set temperature')
  })

  it('renders the button and it is not clickable until there is something in form field', () => {
    props = {
      module: mockTemperatureModuleGen2,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
    render(props)
    const button = screen.getByRole('button', { name: 'Confirm' })
    const input = screen.getByTestId('temperatureModuleV2')
    fireEvent.change(input, { target: { value: '20' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)

    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'temperatureModule/setTargetTemperature',
        params: {
          moduleId: mockTemperatureModule.id,
          celsius: 20,
        },
      },
    })
    expect(button).not.toBeEnabled()
  })
})
