import { when } from 'vitest-when'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import {
  mockMagneticModule as mockMagneticModuleFixture,
  mockHeaterShaker,
} from '/app/redux/modules/__fixtures__/index'
import {
  mockMagneticModuleGen2,
  mockThermocycler,
} from '/app/redux/modules/__fixtures__'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import {
  useChainLiveCommands,
  useRunCalibrationStatus,
  useModuleRenderInfoForProtocolById,
  useUnmatchedModulesForProtocol,
} from '/app/resources/runs'
import { ModuleSetupModal } from '/app/organisms/ModuleCard/ModuleSetupModal'
import { ModuleWizardFlows } from '/app/organisms/ModuleWizardFlows'
import { OT2MultipleModulesHelp } from '../OT2MultipleModulesHelp'
import { UnMatchedModuleWarning } from '../UnMatchedModuleWarning'
import { SetupModulesList } from '../SetupModulesList'
import { LocationConflictModal } from '/app/organisms/LocationConflictModal'

import type { ComponentProps } from 'react'
import type { ModuleModel, ModuleType } from '@opentrons/shared-data'
import type { DiscoveredRobot } from '/app/redux/discovery/types'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/organisms/LocationConflictModal')
vi.mock('../UnMatchedModuleWarning')
vi.mock('/app/organisms/ModuleCard/ModuleSetupModal')
vi.mock('/app/organisms/ModuleWizardFlows')
vi.mock('../OT2MultipleModulesHelp')
vi.mock('/app/resources/runs')
vi.mock('/app/redux/config')

const ROBOT_NAME = 'otie'
const RUN_ID = '1'
const MOCK_MAGNETIC_MODULE_COORDS = [10, 20, 0]
const MOCK_TC_COORDS = [20, 30, 0]
const MOCK_SECOND_MAGNETIC_MODULE_COORDS = [100, 200, 0]

const mockMagneticModule = {
  moduleId: 'someMagneticModule',
  model: 'magneticModuleV2' as ModuleModel,
  type: 'magneticModuleType' as ModuleType,
  labwareOffset: { x: 5, y: 5, z: 5 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  calibrationPoint: { x: 0, y: 0 },
  displayName: 'Magnetic Module',
  dimensions: {},
  twoDimensionalRendering: { children: [] },
  quirks: [],
}

const mockTCModule = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'TCModuleId',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
  displayName: 'Thermocycler Module',
}

const mockCalibratedData = {
  offset: {
    x: 0.1640625,
    y: -1.2421875,
    z: -1.759999999999991,
  },
  slot: '7',
  last_modified: '2023-06-01T14:42:20.131798+00:00',
}

const render = (props: ComponentProps<typeof SetupModulesList>) => {
  return renderWithProviders(<SetupModulesList {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SetupModulesList', () => {
  let props: ComponentProps<typeof SetupModulesList>
  let mockChainLiveCommands = vi.fn()
  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
      runId: RUN_ID,
    }
    when(vi.mocked(useRobot))
      .calledWith(ROBOT_NAME)
      .thenReturn({ robotModel: FLEX_ROBOT_TYPE } as DiscoveredRobot)
    mockChainLiveCommands = vi.fn()
    mockChainLiveCommands.mockResolvedValue(null)
    vi.mocked(ModuleSetupModal).mockReturnValue(<div>mockModuleSetupModal</div>)
    vi.mocked(UnMatchedModuleWarning).mockReturnValue(
      <div>mock unmatched module Banner</div>
    )
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    when(useRunCalibrationStatus).calledWith(ROBOT_NAME, RUN_ID).thenReturn({
      complete: true,
    })
    vi.mocked(ModuleWizardFlows).mockReturnValue(
      <div>mock ModuleWizardFlows</div>
    )
    vi.mocked(useChainLiveCommands).mockReturnValue({
      chainLiveCommands: mockChainLiveCommands,
    } as any)
    vi.mocked(LocationConflictModal).mockReturnValue(
      <div>mock location conflict modal</div>
    )
  })

  it('should render a magnetic module that is connected', () => {
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockMagneticModule.moduleId]: {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '1',
        attachedModuleMatch: {
          ...mockMagneticModuleGen2,
          moduleOffset: mockCalibratedData,
        },
      },
    } as any)

    render(props)
    screen.getByText('Magnetic Module')
    screen.getByText('1')
    screen.getByText('Connected')
  })

  it('should render a magnetic module that is NOT connected', () => {
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockMagneticModule.moduleId]: {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '1',
        attachedModuleMatch: null,
      },
    } as any)

    render(props)
    screen.getByText('Magnetic Module')
    screen.getByText('1')
    screen.getByText('Not connected')
  })

  it('should render a thermocycler module that is connected, OT2', () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockTCModule.moduleId]: {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '7',
        attachedModuleMatch: {
          ...mockThermocycler,
          moduleOffset: mockCalibratedData,
        },
      },
    } as any)
    vi.mocked(useIsFlex).mockReturnValue(false)

    render(props)
    screen.getByText('Thermocycler Module')
    screen.getByText('7,8,10,11')
    screen.getByText('Connected')
  })

  it('should render a thermocycler module that is connected but not calibrated, OT3', async () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockTCModule.moduleId]: {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '7',
        attachedModuleMatch: mockThermocycler,
      },
    } as any)
    vi.mocked(useIsFlex).mockReturnValue(true)

    render(props)
    screen.getByText('Thermocycler Module')
    screen.getByText('A1+B1')
    fireEvent.click(screen.getByRole('button', { name: 'Calibrate now' }))
    await waitFor(() => {
      screen.getByText('mock ModuleWizardFlows')
    })
  })

  it('should render disabled button when pipette and module are not calibrated', () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    when(useRunCalibrationStatus).calledWith(ROBOT_NAME, RUN_ID).thenReturn({
      complete: false,
      reason: 'calibrate_pipette_failure_reason',
    })
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockTCModule.moduleId]: {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '7',
        attachedModuleMatch: mockThermocycler,
      },
    } as any)
    vi.mocked(useIsFlex).mockReturnValue(true)

    render(props)
    expect(screen.getByRole('button', { name: 'Calibrate now' })).toBeDisabled()
  })

  it('should render a thermocycler module that is connected, OT3', () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockTCModule.moduleId]: {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '7',
        attachedModuleMatch: {
          ...mockThermocycler,
          moduleOffset: mockCalibratedData,
        },
      },
    } as any)
    vi.mocked(useIsFlex).mockReturnValue(true)

    render(props)
    screen.getByText('Thermocycler Module')
    screen.getByText('A1+B1')
    screen.getByText('Connected')
  })

  it('should render the MoaM component when Moam is attached and robot is OT2', () => {
    when(vi.mocked(useRobot))
      .calledWith(ROBOT_NAME)
      .thenReturn({ robotModel: OT2_ROBOT_TYPE } as DiscoveredRobot)
    vi.mocked(OT2MultipleModulesHelp).mockReturnValue(
      <div>mock Moam modal</div>
    )
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    const dupModId = `${mockMagneticModule.moduleId}duplicate`
    const dupModPort = 10
    const dupModHub = 2
    when(useModuleRenderInfoForProtocolById)
      .calledWith(RUN_ID)
      .thenReturn({
        [mockMagneticModule.moduleId]: {
          moduleId: mockMagneticModule.moduleId,
          x: MOCK_MAGNETIC_MODULE_COORDS[0],
          y: MOCK_MAGNETIC_MODULE_COORDS[1],
          z: MOCK_MAGNETIC_MODULE_COORDS[2],
          moduleDef: mockMagneticModule as any,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          nestedLabwareDisplayName: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: {
            ...mockMagneticModuleFixture,
            model: mockMagneticModule.model,
          } as any,
          slotName: '1',
          conflictedFixture: null,
        },
        [dupModId]: {
          moduleId: dupModId,
          x: MOCK_SECOND_MAGNETIC_MODULE_COORDS[0],
          y: MOCK_SECOND_MAGNETIC_MODULE_COORDS[1],
          z: MOCK_SECOND_MAGNETIC_MODULE_COORDS[2],
          moduleDef: mockMagneticModule as any,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          nestedLabwareDisplayName: null,
          protocolLoadOrder: 0,
          attachedModuleMatch: {
            ...mockMagneticModuleFixture,
            model: mockMagneticModule.model,
            usbPort: {
              port: dupModPort,
              hub: dupModHub,
            },
          } as any,
          slotName: '3',
          conflictedFixture: null,
        },
      })
    render(props)
    screen.getByText('mock Moam modal')
  })
  it('should render the module unmatching banner', () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({
        missingModuleIds: ['moduleId'],
        remainingAttachedModules: [mockHeaterShaker],
      })
    render(props)
    screen.getByText('mock unmatched module Banner')
  })
  it('should render the heater shaker text when hs is attached', () => {
    vi.mocked(useModuleRenderInfoForProtocolById).mockReturnValue({
      [mockHeaterShaker.id]: {
        moduleId: mockHeaterShaker.id,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: {
          id: 'heatershaker_id',
          model: 'heaterShakerModuleV1',
          moduleType: 'heaterShakerModuleType',
          displayName: 'mockHeaterShakerName',
          serialNumber: 'jkl123',
          hardwareRevision: 'heatershaker_v4.0',
          firmwareVersion: 'v2.0.0',
          hasAvailableUpdate: true,
          data: {
            labwareLatchStatus: 'idle_unknown',
            speedStatus: 'idle',
            temperatureStatus: 'idle',
            currentSpeed: null,
            currentTemperature: null,
            targetSpeed: null,
            targetTemperature: null,
            errorDetails: null,
            status: 'idle',
          },
          usbPort: { path: '/dev/ot_module_heatershaker0', port: 1, hub: null },
        },
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        slotName: '1',
        attachedModuleMatch: null,
      },
    } as any)
    render(props)
    const moduleSetup = screen.getByText('View setup instructions')
    fireEvent.click(moduleSetup)
    screen.getByText('mockModuleSetupModal')
  })
})
