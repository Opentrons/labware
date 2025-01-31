import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COLORS } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import { MagneticModuleSlideout } from '../MagneticModuleSlideout'

import {
  mockMagneticModule,
  mockMagneticModuleGen2,
} from '/app/redux/modules/__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof MagneticModuleSlideout>) => {
  return renderWithProviders(<MagneticModuleSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('MagneticModuleSlideout', () => {
  let props: ComponentProps<typeof MagneticModuleSlideout>
  let mockCreateLiveCommand = vi.fn()
  beforeEach(() => {
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    props = {
      module: mockMagneticModule,
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

  it('renders correct title and body for a gen1 magnetic module', () => {
    render(props)

    screen.getByText('Set Engage Height for Magnetic Module GEN1')
    screen.getByText(
      'Set the engage height for this Magnetic Module. Enter an integer between -2.5 and 20.'
    )
    screen.getByText('GEN 1 Height Ranges')
    screen.getByText('Max Engage Height')
    screen.getByText('Labware Bottom')
    screen.getByText('Disengaged')
    screen.getByText('20 mm')
    screen.getByText('0 mm')
    screen.getByText('-2.5 mm')
    screen.getByText('Set Engage Height')
    screen.getByText('Confirm')
  })

  it('renders correct title and body for a gen2 magnetic module', () => {
    props = {
      module: mockMagneticModuleGen2,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
    render(props)

    screen.getByText('Set Engage Height for Magnetic Module GEN2')
    screen.getByText(
      'Set the engage height for this Magnetic Module. Enter an integer between -2.5 and 20.'
    )
    screen.getByText('GEN 2 Height Ranges')
    screen.getByText('Max Engage Height')
    screen.getByText('Labware Bottom')
    screen.getByText('Disengaged')
    screen.getByText('20 mm')
    screen.getByText('0 mm')
    screen.getByText('-2.5 mm') // TODO(jr, 6/14/22): change this to -4 when ticket #9585 merges
    screen.getByText('Set Engage Height')
    screen.getByText('Confirm')
  })

  it('renders the button and it is not clickable until there is something in form field', () => {
    render(props)
    const button = screen.getByRole('button', { name: 'Confirm' })
    const input = screen.getByTestId('magneticModuleV1')
    fireEvent.change(input, { target: { value: '10' } })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'magneticModule/engage',
        params: {
          moduleId: 'magdeck_id',
          height: 10,
        },
      },
    })
    expect(button).not.toBeEnabled()
  })

  it('renders the correct background color in magnetic module data', () => {
    render(props)
    const magneticModuleInfo = screen.getByTestId(
      'MagneticModuleSlideout_body_data_def456'
    )
    expect(magneticModuleInfo).toHaveStyle(`background-color: ${COLORS.grey20}`)
  })
})
