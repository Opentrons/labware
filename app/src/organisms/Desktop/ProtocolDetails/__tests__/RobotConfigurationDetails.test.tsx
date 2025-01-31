import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { OT2_STANDARD_MODEL, FLEX_STANDARD_MODEL } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RobotConfigurationDetails } from '../RobotConfigurationDetails'

import type { ComponentProps } from 'react'
import type { LoadModuleRunTimeCommand } from '@opentrons/shared-data'

const mockRequiredModuleDetails = [
  {
    id: 'someId',
    createdAt: '2022-04-18T19:16:57.398363+00:00',
    commandType: 'loadModule',
    key: 'someKey',
    status: 'succeeded',
    params: {
      model: 'magneticModuleV2',
      location: {
        slotName: '1',
      },
      moduleId: 'magneticModuleType',
    },
    result: {
      moduleId: 'magneticModuleType',
      definition: {
        otSharedSchema: 'module/schemas/2',
        moduleType: 'magneticModuleType',
        model: 'magneticModuleV2',
        labwareOffset: {
          x: -1.175,
          y: -0.125,
          z: 82.25,
        },
        dimensions: {
          bareOverallHeight: 110.152,
          overLabwareHeight: 4.052,
          lidHeight: null,
        },
        calibrationPoint: {
          x: 124.875,
          y: 2.75,
        },
        displayName: 'Magnetic Module GEN2',
        quirks: [],
        slotTransforms: {},
        compatibleWith: [],
      },
      model: 'magneticModuleV2',
      serialNumber: 'fake-serial-number',
    },
    error: null,
    startedAt: '2022-04-18T19:16:57.401628+00:00',
    completedAt: '2022-04-18T19:16:57.402112+00:00',
  } as LoadModuleRunTimeCommand,
]

const render = (props: ComponentProps<typeof RobotConfigurationDetails>) => {
  return renderWithProviders(<RobotConfigurationDetails {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RobotConfigurationDetails', () => {
  let props: ComponentProps<typeof RobotConfigurationDetails>

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders a robot section showing the intended robot model for an OT-2 protocol', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: OT2_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('robot')
    screen.getByText('OT-2')
  })

  it('renders a robot section showing the intended robot model for a Flex protocol', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: FLEX_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('robot')
    screen.getByText('Opentrons Flex')
  })

  it('renders left mount pipette when there is a pipette only in the left mount', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: OT2_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('left mount')
    screen.getByText('P10 Single-Channel GEN1')
    screen.getByText('right mount')
    screen.getByText('empty')
  })

  it('renders right mount pipette when there is a pipette only in the right mount', () => {
    props = {
      leftMountPipetteName: null,
      rightMountPipetteName: 'p10_single',
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: OT2_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('left mount')
    screen.getByText('P10 Single-Channel GEN1')
    screen.getByText('right mount')
    screen.getByText('empty')
  })

  it('renders extension mount section when extended hardware feature flag is on', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: FLEX_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('extension mount')
  })

  it('should not render extension mount section when robotType is OT-2', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: false,
      robotType: OT2_STANDARD_MODEL,
    }
    render(props)
    expect(screen.queryByText('extension mount')).not.toBeInTheDocument()
  })

  it('renders the magnetic module when the protocol contains a magnetic module', () => {
    props = {
      leftMountPipetteName: null,
      rightMountPipetteName: 'p10_single',
      extensionInstrumentName: null,
      requiredModuleDetails: mockRequiredModuleDetails,
      requiredFixtureDetails: [],
      isLoading: false,
      robotType: OT2_STANDARD_MODEL,
    }

    render(props)
    screen.getByText('Slot 1')
    screen.getByText('Magnetic Module GEN2')
  })

  it('renders loading for both pipettes when it is in a loading state', () => {
    props = {
      leftMountPipetteName: 'p10_single',
      rightMountPipetteName: null,
      requiredModuleDetails: [],
      requiredFixtureDetails: [],
      extensionInstrumentName: null,
      isLoading: true,
      robotType: OT2_STANDARD_MODEL,
    }
    render(props)
    screen.getByText('right mount')
    screen.getAllByText('Loading...')
  })
})
