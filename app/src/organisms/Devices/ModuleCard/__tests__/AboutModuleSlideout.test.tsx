import * as React from 'react'
import { renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/react'
import { i18n } from '../../../../i18n'
import { getConnectedRobotName } from '../../../../redux/robot/selectors'
import {
  mockMagneticModule,
  mockMagneticModuleGen2,
  mockTemperatureModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
} from '../../../../redux/modules/__fixtures__'
import { AboutModuleSlideout } from '../AboutModuleSlideout'

jest.mock('../../../../redux/robot/selectors')

const mockGetConnectedRobotName = getConnectedRobotName as jest.MockedFunction<
  typeof getConnectedRobotName
>

const render = (props: React.ComponentProps<typeof AboutModuleSlideout>) => {
  return renderWithProviders(<AboutModuleSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AboutModuleSlideout', () => {
  let props: React.ComponentProps<typeof AboutModuleSlideout>
  beforeEach(() => {
    props = {
      module: mockMagneticModule,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    mockGetConnectedRobotName.mockReturnValue('Mock Robot Name')
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders correct info when module is a magnetic module  GEN1 and exit button works correctly', () => {
    const { getByText, getByRole } = render(props)

    getByText('About Magnetic Module GEN1')
    getByText('def456')
    getByText('Serial Number')
    getByText('Current Version')
    getByText('Version v2.0.0')
    const button = getByRole('button', { name: /exit/i })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders correct info when module is a magnetic module GEN2', () => {
    props = {
      module: mockMagneticModuleGen2,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    const { getByText } = render(props)

    getByText('About Magnetic Module GEN2')
    getByText('def456')
    getByText('Serial Number')
    getByText('Current Version')
    getByText('Version v2.0.0')
  })

  it('renders correct info when module is a temperature module GEN2', () => {
    props = {
      module: mockTemperatureModuleGen2,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    const { getByText } = render(props)

    getByText('About Temperature Module GEN2')
    getByText('abc123')
    getByText('Serial Number')
    getByText('Current Version')
    getByText('Version v2.0.0')
  })

  it('renders correct info when module is a temperature module GEN1', () => {
    props = {
      module: mockTemperatureModule,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    const { getByText } = render(props)

    getByText('About Temperature Module GEN1')
    getByText('abc123')
    getByText('Serial Number')
    getByText('Current Version')
    getByText('Version v2.0.0')
  })

  it('renders correct info when module is a thermocycler module with an update available', () => {
    props = {
      module: mockThermocycler,
      isExpanded: true,
      onCloseClick: jest.fn(),
    }
    const { getByText, getByRole } = render(props)

    getByText('About Thermocycler Module')
    getByText('ghi789')
    getByText('Serial Number')
    getByText('Current Version')
    getByText('Version v2.0.0')
    getByText('Firmware update available.')
    const button = getByRole('button', { name: 'Link firmware update' })
    fireEvent.click(button)
    expect(button).toBeEnabled()
    const viewUpdate = getByRole('button', { name: 'View Update' })
    fireEvent.click(viewUpdate)
    expect(viewUpdate).toBeEnabled()
    //  TODO(jr, 2/23/22): expect button to open a modal when this is properly wired up
  })
})
