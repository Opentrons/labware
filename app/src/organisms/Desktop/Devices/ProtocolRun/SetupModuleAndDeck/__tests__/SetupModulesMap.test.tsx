/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { when } from 'vitest-when'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockThermocycler as mockThermocyclerFixture,
  mockMagneticModule as mockMagneticModuleFixture,
} from '/app/redux/modules/__fixtures__/index'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { ModuleInfo } from '/app/molecules/ModuleInfo'
import { SetupModulesMap } from '../SetupModulesMap'
import { getAttachedProtocolModuleMatches } from '/app/transformations/analysis'

import type { ComponentProps } from 'react'
import type {
  CompletedProtocolAnalysis,
  ModuleModel,
  ModuleType,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actualComponents,
    RobotWorkSpace: vi.fn(() => <div>mock RobotWorkSpace</div>),
  }
})
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<
    typeof inferModuleOrientationFromXCoordinate
  >()
  return {
    ...actualSharedData,
    inferModuleOrientationFromXCoordinate: vi.fn(),
  }
})
vi.mock('/app/resources/runs/useMostRecentCompletedAnalysis')
vi.mock('/app/transformations/analysis')
vi.mock('/app/molecules/ModuleInfo')
vi.mock('/app/resources/modules')

const render = (props: ComponentProps<typeof SetupModulesMap>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SetupModulesMap {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

const MOCK_MAGNETIC_MODULE_COORDS = [10, 20, 0]
const MOCK_SECOND_MAGNETIC_MODULE_COORDS = [100, 200, 0]
const MOCK_TC_COORDS = [20, 30, 0]
const MOCK_RUN_ID = '1'

const mockMagneticModule = {
  moduleId: 'someMagneticModule',
  model: 'magneticModuleV2' as ModuleModel,
  type: 'magneticModuleType' as ModuleType,
  labwareOffset: { x: 5, y: 5, z: 5 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  dimensions: {
    xDimension: 100,
    yDimension: 100,
    footprintXDimension: 50,
    footprintYDimension: 50,
    labwareInterfaceXDimension: 80,
    labwareInterfaceYDimension: 120,
  },
  twoDimensionalRendering: { children: [] },
}

const mockTCModule = {
  moduleId: 'TCModuleId',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
  labwareOffset: { x: 3, y: 3, z: 3 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  dimensions: {
    xDimension: 100,
    yDimension: 100,
    footprintXDimension: 50,
    footprintYDimension: 50,
    labwareInterfaceXDimension: 80,
    labwareInterfaceYDimension: 120,
  },
  twoDimensionalRendering: { children: [] },
}

describe('SetupModulesMap', () => {
  let props: ComponentProps<typeof SetupModulesMap>
  beforeEach(() => {
    props = {
      runId: MOCK_RUN_ID,
    }
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(MOCK_RUN_ID)
      .thenReturn(({
        commands: [],
        labware: [],
        robotType: OT2_ROBOT_TYPE,
      } as unknown) as CompletedProtocolAnalysis)
    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([])
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render a deck WITHOUT modules if none passed (component will never be rendered in this circumstance)', () => {
    render(props)
    expect(vi.mocked(ModuleInfo)).not.toHaveBeenCalled()
  })
  it('should render a deck WITH MoaM', () => {
    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([
      {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareDisplayName: null,
        nestedLabwareId: null,
        slotName: '1',
        protocolLoadOrder: 1,
        attachedModuleMatch: null,
      },
      {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_SECOND_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_SECOND_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_SECOND_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareDisplayName: null,
        nestedLabwareId: null,
        slotName: '2',
        protocolLoadOrder: 0,
        attachedModuleMatch: null,
      },
    ])

    when(vi.mocked(ModuleInfo))
      .calledWith(
        expect.objectContaining({
          moduleModel: mockMagneticModule.model,
          isAttached: false,
          physicalPort: null,
          runId: MOCK_RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock module info {mockMagneticModule.model}</div>)

    render(props)
    expect(
      screen.getAllByText('mock module info magneticModuleV2')
    ).toHaveLength(2)
  })

  it('should render a deck WITH modules', () => {
    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([
      {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareDisplayName: null,
        nestedLabwareId: null,
        slotName: '1',
        protocolLoadOrder: 1,
        attachedModuleMatch: {
          ...mockMagneticModuleFixture,
          model: mockMagneticModule.model,
        } as any,
      },
      {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        nestedLabwareDisplayName: null,
        protocolLoadOrder: 0,
        attachedModuleMatch: {
          ...mockThermocyclerFixture,
          model: mockTCModule.model,
        } as any,
        slotName: '7',
      },
    ])

    when(vi.mocked(ModuleInfo))
      .calledWith(
        expect.objectContaining({
          moduleModel: mockMagneticModule.model,
          isAttached: true,
          physicalPort: mockMagneticModuleFixture.usbPort,
          runId: MOCK_RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock module info {mockMagneticModule.model} </div>)

    when(vi.mocked(ModuleInfo))
      .calledWith(
        expect.objectContaining({
          moduleModel: mockTCModule.model,
          isAttached: true,
          physicalPort: mockThermocyclerFixture.usbPort,
          runId: MOCK_RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock module info {mockTCModule.model} </div>)

    render(props)
    screen.getByText('mock module info magneticModuleV2')
    screen.getByText('mock module info thermocyclerModuleV1')
  })

  it('renders Moam with the correct module in the correct slot', () => {
    const dupModId = `${mockMagneticModule.moduleId}duplicate`
    const dupModPort = 10

    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([
      {
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
      },
      {
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
            hub: false,
            portGroup: 'unknown',
            path: '',
          },
        } as any,
        slotName: '3',
      },
    ])

    when(vi.mocked(ModuleInfo))
      .calledWith(
        expect.objectContaining({
          moduleModel: mockMagneticModule.model,
          isAttached: true,
          physicalPort: mockMagneticModuleFixture.usbPort,
          runId: MOCK_RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock module info {mockMagneticModule.model} </div>)

    when(vi.mocked(ModuleInfo))
      .calledWith(
        expect.objectContaining({
          moduleModel: mockMagneticModule.model,
          isAttached: true,
          physicalPort: {
            port: dupModPort,
            hub: false,
            portGroup: 'unknown',
            path: '',
          },
          runId: MOCK_RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock module info {mockTCModule.model} </div>)

    render(props)
    screen.getByText('mock module info magneticModuleV2')
  })
})
