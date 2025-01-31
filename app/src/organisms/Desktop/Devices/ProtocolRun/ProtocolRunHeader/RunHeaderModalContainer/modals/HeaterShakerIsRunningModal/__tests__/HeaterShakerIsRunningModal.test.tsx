import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'

import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'
import { HeaterShakerIsRunningModal } from '../HeaterShakerIsRunningModal'
import { HeaterShakerModuleCard } from '../HeaterShakerModuleCard'
import { useAttachedModules } from '/app/resources/modules'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type * as ReactApiClient from '@opentrons/react-api-client'

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ReactApiClient>()
  return {
    ...actual,
    useCreateLiveCommandMutation: vi.fn(),
  }
})
vi.mock('/app/resources/modules')
vi.mock('/app/resources/runs')
vi.mock('../HeaterShakerModuleCard')

const mockMovingHeaterShakerOne = {
  id: 'heatershaker_id_1',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const mockMovingHeaterShakerTwo = {
  id: 'heatershaker_id_2',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const render = (props: ComponentProps<typeof HeaterShakerIsRunningModal>) => {
  return renderWithProviders(<HeaterShakerIsRunningModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HeaterShakerIsRunningModal', () => {
  let props: ComponentProps<typeof HeaterShakerIsRunningModal>
  let mockCreateLiveCommand = vi.fn()
  beforeEach(() => {
    props = {
      closeModal: vi.fn(),
      module: mockHeaterShaker,
      startRun: vi.fn(),
    }
    vi.mocked(HeaterShakerModuleCard).mockReturnValue(
      <div>mock HeaterShakerModuleCard</div>
    )
    vi.mocked(useAttachedModules).mockReturnValue([mockMovingHeaterShakerOne])
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      pipettes: {},
      labware: {},
      modules: {
        heatershaker_id: {
          model: 'heaterShakerModuleV1',
        },
      },
      labwareDefinitions: {},
      commands: [
        {
          id: '1f949fc0-bafe-4e24-bc76-15fc4cd1686f',
          createdAt: '2022-07-27T22:26:33.846399+00:00',
          commandType: 'loadModule',
          key: '286d7201-bfdc-4c2c-ae67-544367dbbabe',
          status: 'succeeded',
          params: {
            model: 'heaterShakerModuleV1',
            location: {
              slotName: '1',
            },
            moduleId: 'heatershaker_id',
          },
          result: {
            moduleId: 'heatershaker_id',
            definition: {},
            model: 'heaterShakerModuleV1',
            serialNumber:
              'fake-serial-number-fc4994f5-9d8d-4c12-92ef-e82f7d64f0a4',
          },
          startedAt: '2022-07-27T22:26:33.875106+00:00',
          completedAt: '2022-07-27T22:26:33.878079+00:00',
        },
      ],
    } as any)
  })

  it('renders the correct modal icon and title', () => {
    render(props)

    screen.getByTestId('HeaterShakerIsRunning_warning_icon')
    screen.getByText('Heater-Shaker Module is currently shaking')
  })

  it('renders the heater shaker module card and prompt', () => {
    render(props)

    screen.getByText('mock HeaterShakerModuleCard')
    screen.getByText('Continue shaking while the protocol starts?')
  })

  it('renders the stop shaking and start run button and calls the stop run command', () => {
    render(props)
    const button = screen.getByRole('button', {
      name: /Stop shaking and start run/i,
    })
    fireEvent.click(button)
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/deactivateShaker',
        params: {
          moduleId: mockMovingHeaterShakerOne.id,
        },
      },
    })
    expect(props.startRun).toHaveBeenCalled()
    expect(props.closeModal).toHaveBeenCalled()
  })

  it('should call the stop shaker command twice for two heater shakers', () => {
    vi.mocked(useAttachedModules).mockReturnValue([
      mockMovingHeaterShakerOne,
      mockMovingHeaterShakerTwo,
    ])
    render(props)
    const button = screen.getByRole('button', {
      name: /Stop shaking and start run/i,
    })
    fireEvent.click(button)
    expect(mockCreateLiveCommand).toHaveBeenCalledTimes(2)
  })

  it('renders the keep shaking and start run button and calls startRun and closeModal', () => {
    render(props)
    const button = screen.getByRole('button', {
      name: /Keep shaking and start run/i,
    })
    fireEvent.click(button)
    expect(props.startRun).toHaveBeenCalled()
    expect(props.closeModal).toHaveBeenCalled()
  })
})
