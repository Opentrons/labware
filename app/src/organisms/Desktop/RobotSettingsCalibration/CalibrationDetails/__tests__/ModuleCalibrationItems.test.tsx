import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ABSORBANCE_READER_TYPE } from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockFetchModulesSuccessActionPayloadModules } from '/app/redux/modules/__fixtures__'
import { ModuleCalibrationOverflowMenu } from '../ModuleCalibrationOverflowMenu'
import { formatLastCalibrated } from '../utils'
import { ModuleCalibrationItems } from '../ModuleCalibrationItems'

import type { ComponentProps } from 'react'
import type { AttachedModule } from '@opentrons/api-client'

vi.mock('../ModuleCalibrationOverflowMenu')

const mockCalibratedModule = {
  id: '1436cd6085f18e5c315d65bd835d899a631cc2ba',
  serialNumber: 'TC2PVT2023040702',
  firmwareVersion: 'v1.0.4',
  hardwareRevision: 'Opentrons-thermocycler-gen2',
  hasAvailableUpdate: false,
  moduleType: 'thermocyclerModuleType',
  moduleModel: 'thermocyclerModuleV2',
  moduleOffset: {
    offset: {
      x: 0.1640625,
      y: -1.2421875,
      z: -1.759999999999991,
    },
    slot: '7',
    last_modified: '2023-06-01T14:42:20.131798+00:00',
  },
  data: {
    status: 'holding at target',
    currentTemperature: 10,
    targetTemperature: 10,
    lidStatus: 'open',
    lidTemperatureStatus: 'holding at target',
    lidTemperature: 100,
    lidTargetTemperature: 100,
    holdTime: 0,
    currentCycleIndex: 1,
    totalCycleCount: 1,
    currentStepIndex: 1,
    totalStepCount: 1,
  } as any,
  usbPort: {
    port: 3,
    portGroup: 'left',
    hub: false,
    path: '1.0/tty/ttyACM3/dev',
  },
}

const ROBOT_NAME = 'mockRobot'

const render = (
  props: ComponentProps<typeof ModuleCalibrationItems>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<ModuleCalibrationItems {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ModuleCalibrationItems', () => {
  let props: ComponentProps<typeof ModuleCalibrationItems>

  beforeEach(() => {
    props = {
      attachedModules: mockFetchModulesSuccessActionPayloadModules,
      updateRobotStatus: vi.fn(),
      formattedPipetteOffsetCalibrations: [],
      robotName: ROBOT_NAME,
    }
    vi.mocked(ModuleCalibrationOverflowMenu).mockReturnValue(
      <div>mock ModuleCalibrationOverflowMenu</div>
    )
  })

  it('should render module information and overflow menu', () => {
    render(props)
    screen.getByText('Module')
    screen.getByText('Serial')
    screen.getByText('Last Calibrated')
    screen.getByText('Magnetic Module GEN1')
    screen.getByText('def456')
    screen.getByText('Temperature Module GEN1')
    screen.getByText('abc123')
    screen.getByText('Thermocycler Module GEN1')
    screen.getByText('ghi789')
    expect(screen.getAllByText('Not calibrated').length).toBe(3)
    expect(
      screen.getAllByText('mock ModuleCalibrationOverflowMenu').length
    ).toBe(3)
  })

  it('should display last calibrated time if a module is calibrated', () => {
    props = {
      ...props,
      attachedModules: [mockCalibratedModule] as AttachedModule[],
    }
    render(props)
    screen.getByText(formatLastCalibrated('2023-06-01T14:42:20.131798+00:00'))
  })

  it('should say no calibration required if module is absorbance reader', () => {
    const absorbanceReaderAttachedModule = {
      ...mockCalibratedModule,
      moduleType: ABSORBANCE_READER_TYPE,
      moduleOffset: undefined,
    }
    props = {
      ...props,
      attachedModules: [
        absorbanceReaderAttachedModule as AttachedModule,
      ] as AttachedModule[],
    }
    render(props)
    expect(
      screen.queryByText('mock ModuleCalibrationOverflowMenu')
    ).not.toBeInTheDocument()
    screen.getByText('No calibration required')
  })
})
