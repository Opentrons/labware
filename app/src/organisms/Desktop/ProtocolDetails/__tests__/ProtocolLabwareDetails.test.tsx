import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ProtocolLabwareDetails } from '../ProtocolLabwareDetails'

import type { ComponentProps } from 'react'
import type { LoadLabwareRunTimeCommand } from '@opentrons/shared-data'
import type { InfoScreen } from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof InfoScreen>()
  return {
    ...actual,
    InfoScreen: () => <div>mock InfoScreen</div>,
  }
})

const mockRequiredLabwareDetails = [
  {
    id: '568fd127-5554-4e19-b303-a8aeb6d8547d',
    createdAt: '2022-04-18T19:16:57.398480+00:00',
    commandType: 'loadLabware',
    key: '568fd127-5554-4e19-b303-a8aeb6d8547d',
    status: 'succeeded',
    params: {
      location: {
        moduleId: '3e012450-3412-11eb-ad93-ed232a2337cf:magneticModuleType',
      },
      loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
      namespace: 'opentrons',
      version: 1,
      labwareId:
        'aac5d680-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
    },
    result: {
      labwareId:
        'aac5d680-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      definition: {
        version: 1,
        schemaVersion: 2,
        namespace: 'opentrons',
        metadata: {
          displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
          displayCategory: 'wellPlate',
          displayVolumeUnits: 'mL',
        },
        dimensions: { xDimension: 0, yDimension: 0, zDimension: 0 },
        cornerOffsetFromSlot: { x: 0, y: 0, z: 0 },
        parameters: {
          loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
          format: 'mock',
          isTiprack: false,
          isMagneticModuleCompatible: false,
        },
        brand: { brand: 'Opentrons' },
        ordering: [],
        wells: {},
        groups: [],
      },
      offset: { x: 0, y: 0, z: 0 },
    },
    error: null,
    startedAt: '2022-04-18T19:16:57.403135+00:00',
    completedAt: '2022-04-18T19:16:57.403198+00:00',
  } as LoadLabwareRunTimeCommand,
]

const render = (props: ComponentProps<typeof ProtocolLabwareDetails>) => {
  return renderWithProviders(<ProtocolLabwareDetails {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolLabwareDetails', () => {
  let props: ComponentProps<typeof ProtocolLabwareDetails>
  beforeEach(() => {
    props = {
      requiredLabwareDetails: mockRequiredLabwareDetails,
    }
  })

  it('should render an opentrons labware', () => {
    render(props)
    screen.getByText('Labware name')
    screen.getByText('NEST 96 Well Plate 100 µL PCR Full Skirt')
    screen.getByText('Quantity')
    screen.getByText('1')
  })

  it('should render two quantites of the same opentrons labware', () => {
    mockRequiredLabwareDetails.push({
      id: '568fd127-5554-4e19-b303-a8aeb6d8547d',
      createdAt: '2022-04-18T19:16:57.398480+00:00',
      commandType: 'loadLabware',
      key: '568fd127-5554-4e19-b303-a8aeb6d8547d',
      status: 'succeeded',
      params: {
        location: {
          moduleId: '3e012450-3412-11eb-ad93-ed232a2337cf:magneticModuleType',
        },
        loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
        namespace: 'opentrons',
        version: 1,
        labwareId:
          'aac5d680-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
        displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
      },
      result: {
        labwareId:
          'aac5d680-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
        definition: {
          version: 1,
          schemaVersion: 2,
          namespace: 'opentrons',
          metadata: {
            displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
            displayCategory: 'wellPlate',
            displayVolumeUnits: 'mL',
          },
          dimensions: { xDimension: 0, yDimension: 0, zDimension: 0 },
          cornerOffsetFromSlot: { x: 0, y: 0, z: 0 },
          parameters: {
            loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
            format: 'mock',
            isTiprack: false,
            isMagneticModuleCompatible: false,
          },
          brand: { brand: 'Opentrons' },
          ordering: [],
          wells: {},
          groups: [],
        },
        offset: { x: 0, y: 0, z: 0 },
      },
      error: null,
      startedAt: '2022-04-18T19:16:57.403135+00:00',
      completedAt: '2022-04-18T19:16:57.403198+00:00',
    } as LoadLabwareRunTimeCommand)

    render(props)
    screen.getByText('Labware name')
    screen.getByText('NEST 96 Well Plate 100 µL PCR Full Skirt')
    screen.getByText('Quantity')
    screen.getByText('2')
  })

  it('should render mock infoscreen when no labware', () => {
    props = {
      requiredLabwareDetails: [],
    }
    render(props)
    screen.getByText('mock InfoScreen')
  })
})
