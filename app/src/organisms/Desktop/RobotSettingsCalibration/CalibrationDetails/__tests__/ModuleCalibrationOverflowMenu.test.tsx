import { fireEvent, screen, waitFor } from '@testing-library/react'
import { when } from 'vitest-when'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { ModuleWizardFlows } from '/app/organisms/ModuleWizardFlows'
import { useChainLiveCommands, useRunStatuses } from '/app/resources/runs'
import { mockThermocyclerGen2 } from '/app/redux/modules/__fixtures__'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'

import { ModuleCalibrationOverflowMenu } from '../ModuleCalibrationOverflowMenu'

import type { ComponentProps } from 'react'
import type { Mount } from '@opentrons/components'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/ModuleWizardFlows')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/devices/hooks/useIsEstopNotDisengaged')

const mockPipetteOffsetCalibrations = [
  {
    modelName: 'mockPipetteModelLeft',
    serialNumber: '1234567',
    mount: 'left' as Mount,
    tiprack: 'mockTiprackLeft',
    lastCalibrated: '2022-11-10T18:14:01',
    markedBad: false,
  },
  {
    modelName: 'mockPipetteModelRight',
    serialNumber: '01234567',
    mount: 'right' as Mount,
    tiprack: 'mockTiprackRight',
    lastCalibrated: '2022-11-10T18:15:02',
    markedBad: false,
  },
]

const mockHotHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    currentTemperature: 80,
  },
} as any

const mockMovingHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    currentSpeed: 200,
  },
} as any

const mockTemperatureModuleHeating = {
  id: 'tempdeck_id',
  moduleModel: 'temperatureModuleV2',
  moduleType: 'temperatureModuleType',
  hasAvailableUpdate: true,
  data: {
    currentTemp: 25,
    targetTemp: null,
    status: 'heating',
  },
} as any

const mockTCHeating = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  hasAvailableUpdate: true,
  data: {
    lid: 'closed',
    lidTargetTemperature: 50,
    lidTemperature: 40,
    targetTemperature: 45,
    status: 'heating',
  },
} as any

const render = (
  props: ComponentProps<typeof ModuleCalibrationOverflowMenu>
) => {
  return renderWithProviders(<ModuleCalibrationOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })
}

const ROBOT_NAME = 'mockRobot'

describe('ModuleCalibrationOverflowMenu', () => {
  let props: ComponentProps<typeof ModuleCalibrationOverflowMenu>
  let mockChainLiveCommands = vi.fn()

  beforeEach(() => {
    props = {
      isCalibrated: false,
      attachedModule: mockThermocyclerGen2,
      updateRobotStatus: vi.fn(),
      formattedPipetteOffsetCalibrations: mockPipetteOffsetCalibrations,
      robotName: ROBOT_NAME,
    }
    mockChainLiveCommands = vi.fn()
    mockChainLiveCommands.mockResolvedValue(null)
    vi.mocked(ModuleWizardFlows).mockReturnValue(<div>module wizard flows</div>)
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: false,
      isRunIdle: false,
      isRunTerminal: false,
    })
    vi.mocked(useChainLiveCommands).mockReturnValue({
      chainLiveCommands: mockChainLiveCommands,
    } as any)
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(false)
  })

  it('should render overflow menu buttons - not calibrated', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    screen.getByText('Calibrate module')
  })

  it('should render overflow menu buttons - calibrated', () => {
    props = { ...props, isCalibrated: true }
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    screen.getByText('Recalibrate module')
  })

  it('should call a mock function when clicking calibrate button', async () => {
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    fireEvent.click(screen.getByText('Calibrate module'))
    await waitFor(() => {
      screen.getByText('module wizard flows')
    })
  })

  it('should have a disabled button when heater shaker is hot', () => {
    props = {
      ...props,
      attachedModule: mockHotHeaterShaker,
    }
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    expect(screen.getByText('Calibrate module')).toBeDisabled()
  })

  it('should call a mock function when clicking calibrate button for moving heater-shaker calling stop shaking and open latch command', async () => {
    props = {
      ...props,
      attachedModule: mockMovingHeaterShaker,
    }
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    fireEvent.click(screen.getByText('Calibrate module'))
    await waitFor(() => {
      expect(mockChainLiveCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'heaterShaker/closeLabwareLatch',
            params: {
              moduleId: mockMovingHeaterShaker.id,
            },
          },
          {
            commandType: 'heaterShaker/deactivateHeater',
            params: {
              moduleId: mockMovingHeaterShaker.id,
            },
          },
          {
            commandType: 'heaterShaker/deactivateShaker',
            params: {
              moduleId: mockMovingHeaterShaker.id,
            },
          },
          {
            commandType: 'heaterShaker/openLabwareLatch',
            params: {
              moduleId: mockMovingHeaterShaker.id,
            },
          },
        ],
        false
      )
    })
    screen.getByText('module wizard flows')
  })

  it('should call a mock function when clicking calibrate button for heated temp module', async () => {
    props = {
      ...props,
      attachedModule: mockTemperatureModuleHeating,
    }
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    fireEvent.click(screen.getByText('Calibrate module'))
    await waitFor(() => {
      expect(mockChainLiveCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'temperatureModule/deactivate',
            params: {
              moduleId: mockTemperatureModuleHeating.id,
            },
          },
        ],
        false
      )
    })
    screen.getByText('module wizard flows')
  })

  it('should call a mock function when clicking calibrate button for heated TC module with lid closed', async () => {
    props = {
      ...props,
      attachedModule: mockTCHeating,
    }
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    fireEvent.click(screen.getByText('Calibrate module'))
    await waitFor(() => {
      expect(mockChainLiveCommands).toHaveBeenCalledWith(
        [
          {
            commandType: 'thermocycler/deactivateLid',
            params: {
              moduleId: mockTCHeating.id,
            },
          },
          {
            commandType: 'thermocycler/deactivateBlock',
            params: {
              moduleId: mockTCHeating.id,
            },
          },
          {
            commandType: 'thermocycler/openLid',
            params: {
              moduleId: mockTCHeating.id,
            },
          },
        ],
        false
      )
    })
    screen.getByText('module wizard flows')
  })

  it('should be disabled when not calibrated module and pipette is not attached', () => {
    props.formattedPipetteOffsetCalibrations = [] as any
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    expect(screen.getByText('Calibrate module')).toBeDisabled()
  })

  it('should be disabled when not calibrated module and pipette is not calibrated', () => {
    props.formattedPipetteOffsetCalibrations[0].lastCalibrated = undefined
    props.formattedPipetteOffsetCalibrations[1].lastCalibrated = undefined
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    expect(screen.getByText('Calibrate module')).toBeDisabled()
  })

  it('should be disabled when running', () => {
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: true,
      isRunStill: false,
      isRunIdle: false,
      isRunTerminal: false,
    })
    render(props)
    fireEvent.click(screen.getByLabelText('ModuleCalibrationOverflowMenu'))
    expect(screen.getByText('Calibrate module')).toBeDisabled()
  })

  it('should be disabled when e-stop button is pressed', () => {
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(true)
    render(props)
    expect(
      screen.getByLabelText('ModuleCalibrationOverflowMenu')
    ).toBeDisabled()
  })
})
