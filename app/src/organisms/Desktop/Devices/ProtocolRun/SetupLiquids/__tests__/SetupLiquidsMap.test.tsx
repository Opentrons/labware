import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'

import { BaseDeck, LabwareRender } from '@opentrons/components'
import {
  fixtureTiprack300ul,
  FLEX_ROBOT_TYPE,
  FLEX_SIMPLEST_DECK_CONFIG_PROTOCOL_SPEC,
  getDeckDefFromRobotType,
  getSimplestDeckConfigForProtocol,
  OT2_ROBOT_TYPE,
  ot2StandardDeckV4 as ot2StandardDeckDef,
  ot3StandardDeckV4 as ot3StandardDeckDef,
  parseInitialLoadedLabwareByAdapter,
  parseLabwareInfoByLiquidId,
  parseLiquidsInLoadOrder,
  simpleAnalysisFileFixture,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useAttachedModules } from '/app/resources/modules'
import { LabwareInfoOverlay } from '../../LabwareInfoOverlay'
import { getStandardDeckViewLayerBlockList } from '/app/local-resources/deck_configuration'
import {
  getAttachedProtocolModuleMatches,
  getProtocolModulesInfo,
  getLabwareRenderInfo,
} from '/app/transformations/analysis'
/* eslint-disable-next-line opentrons/no-imports-across-applications  */
import { mockProtocolModuleInfo } from '/app/organisms/ODD/ProtocolSetup/ProtocolSetupLabware/__fixtures__'
import { mockFetchModulesSuccessActionPayloadModules } from '/app/redux/modules/__fixtures__'

import { SetupLiquidsMap } from '../SetupLiquidsMap'

import type { ComponentProps } from 'react'
import type {
  ModuleModel,
  ModuleType,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type * as Components from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof Components>()
  return {
    ...actualComponents,
    LabwareRender: vi.fn(() => <div>mock LabwareRender</div>),
  }
})

vi.mock('@opentrons/components/src/hardware-sim/BaseDeck')
vi.mock('../../LabwareInfoOverlay')
vi.mock('/app/resources/modules')
vi.mock('/app/transformations/analysis')
vi.mock('/app/transformations/analysis')
vi.mock('/app/resources/deck_configuration/utils')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getSimplestDeckConfigForProtocol>()
  return {
    ...actual,
    getSimplestDeckConfigForProtocol: vi.fn(),
    getDeckDefFromRobotType: vi.fn(),
    parseInitialLoadedLabwareByAdapter: vi.fn(),
    parseLabwareInfoByLiquidId: vi.fn(),
    parseLiquidsInLoadOrder: vi.fn(),
  }
})
vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof BaseDeck>()
  return {
    ...actual,
    BaseDeck: vi.fn(),
    LabwareRender: vi.fn(),
  }
})

const RUN_ID = '1'
const MOCK_300_UL_TIPRACK_ID = '300_ul_tiprack_id'
const MOCK_MAGNETIC_MODULE_COORDS = [10, 20, 0]
const MOCK_SECOND_MAGNETIC_MODULE_COORDS = [100, 200, 0]
const MOCK_300_UL_TIPRACK_COORDS = [30, 40, 0]

const mockMagneticModule = {
  moduleId: 'someMagneticModule',
  model: 'magneticModuleV2' as ModuleModel,
  type: 'magneticModuleType' as ModuleType,
  labwareOffset: { x: 5, y: 5, z: 5 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  calibrationPoint: { x: 0, y: 0 },
  displayName: 'Magnetic Module',
  dimensions: {
    xDimension: 100,
    yDimension: 100,
    footprintXDimension: 50,
    footprintYDimension: 50,
    labwareInterfaceXDimension: 80,
    labwareInterfaceYDimension: 120,
  },
  twoDimensionalRendering: { children: [] },
  quirks: [],
}

const render = (props: ComponentProps<typeof SetupLiquidsMap>) => {
  return renderWithProviders(<SetupLiquidsMap {...props} />, {
    i18nInstance: i18n,
  })
}
const mockProtocolAnalysis = {
  ...simpleAnalysisFileFixture,
  robotType: OT2_ROBOT_TYPE,
} as any

describe('SetupLiquidsMap', () => {
  let props: ComponentProps<typeof SetupLiquidsMap>
  beforeEach(() => {
    props = {
      runId: RUN_ID,
      protocolAnalysis: mockProtocolAnalysis,
    }

    when(vi.mocked(LabwareRender))
      .calledWith(
        expect.objectContaining({
          definition: fixtureTiprack300ul,
          wellFill: undefined,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(
        <div>
          mock labware render of {fixtureTiprack300ul.metadata.displayName}
        </div>
      )
    when(vi.mocked(LabwareRender))
      .calledWith(
        expect.objectContaining({
          wellFill: { C1: '#ff4888', C2: '#ff4888' },
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock labware render with well fill</div>)
    when(vi.mocked(useAttachedModules)).calledWith().thenReturn([])
    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([])
    when(vi.mocked(getLabwareRenderInfo))
      .calledWith(mockProtocolAnalysis, ot2StandardDeckDef as any)
      .thenReturn({})
    when(vi.mocked(getSimplestDeckConfigForProtocol))
      .calledWith(mockProtocolAnalysis)
      .thenReturn(FLEX_SIMPLEST_DECK_CONFIG_PROTOCOL_SPEC)
    when(vi.mocked(parseLiquidsInLoadOrder))
      .calledWith(
        mockProtocolAnalysis.liquids as any,
        mockProtocolAnalysis.commands as any
      )
      .thenReturn([])
    when(vi.mocked(parseInitialLoadedLabwareByAdapter))
      .calledWith(mockProtocolAnalysis.commands as any)
      .thenReturn({})
    when(vi.mocked(LabwareInfoOverlay))
      .calledWith(
        expect.objectContaining({ definition: fixtureTiprack300ul }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(
        <div>
          mock labware info overlay of{' '}
          {fixtureTiprack300ul.metadata.displayName}
        </div>
      )
    when(vi.mocked(LabwareInfoOverlay))
      .calledWith(
        expect.not.objectContaining({ definition: fixtureTiprack300ul }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div></div>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render a deck WITHOUT labware and WITHOUT modules', () => {
    props = {
      ...props,
      protocolAnalysis: null,
    }
    render(props)
    expect(vi.mocked(LabwareRender)).not.toHaveBeenCalled()
    expect(vi.mocked(LabwareInfoOverlay)).not.toHaveBeenCalled()
  })

  it('should render base deck - robot type is OT-2', () => {
    when(vi.mocked(getDeckDefFromRobotType))
      .calledWith(OT2_ROBOT_TYPE)
      .thenReturn(ot2StandardDeckDef as any)
    when(vi.mocked(parseLabwareInfoByLiquidId))
      .calledWith(mockProtocolAnalysis.commands as any)
      .thenReturn({})
    vi.mocked(useAttachedModules).mockReturnValue(
      mockFetchModulesSuccessActionPayloadModules
    )
    vi.mocked(getLabwareRenderInfo).mockReturnValue({})
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(mockProtocolAnalysis, ot2StandardDeckDef as any)
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getAttachedProtocolModuleMatches))
      .calledWith(
        mockFetchModulesSuccessActionPayloadModules,
        mockProtocolModuleInfo,
        []
      )
      .thenReturn([
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

    when(vi.mocked(BaseDeck))
      .calledWith(
        expect.objectContaining({
          robotType: OT2_ROBOT_TYPE,
          deckLayerBlocklist: getStandardDeckViewLayerBlockList(OT2_ROBOT_TYPE),
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock BaseDeck</div>)
    render(props)
    screen.getByText('mock BaseDeck')
  })

  it('should render base deck - robot type is Flex', () => {
    const mockFlexAnalysis = {
      ...mockProtocolAnalysis,
      robotType: FLEX_ROBOT_TYPE,
    }
    props = {
      ...props,
      protocolAnalysis: {
        ...mockProtocolAnalysis,
        robotType: FLEX_ROBOT_TYPE,
      },
    }
    when(vi.mocked(getDeckDefFromRobotType))
      .calledWith(FLEX_ROBOT_TYPE)
      .thenReturn(ot3StandardDeckDef as any)

    when(vi.mocked(getLabwareRenderInfo))
      .calledWith(mockFlexAnalysis, ot3StandardDeckDef as any)
      .thenReturn({
        [MOCK_300_UL_TIPRACK_ID]: {
          labwareDef: fixtureTiprack300ul as LabwareDefinition2,
          displayName: 'fresh tips',
          x: MOCK_300_UL_TIPRACK_COORDS[0],
          y: MOCK_300_UL_TIPRACK_COORDS[1],
          z: MOCK_300_UL_TIPRACK_COORDS[2],
          slotName: 'C1',
        },
      })

    when(vi.mocked(parseLabwareInfoByLiquidId))
      .calledWith(mockFlexAnalysis.commands as any)
      .thenReturn({})
    vi.mocked(useAttachedModules).mockReturnValue(
      mockFetchModulesSuccessActionPayloadModules
    )

    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(mockFlexAnalysis, ot3StandardDeckDef as any)
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getAttachedProtocolModuleMatches))
      .calledWith(
        mockFetchModulesSuccessActionPayloadModules,
        mockProtocolModuleInfo,
        []
      )
      .thenReturn([
        {
          moduleId: mockMagneticModule.moduleId,
          x: MOCK_MAGNETIC_MODULE_COORDS[0],
          y: MOCK_MAGNETIC_MODULE_COORDS[1],
          z: MOCK_MAGNETIC_MODULE_COORDS[2],
          moduleDef: mockMagneticModule as any,
          nestedLabwareDef: null,
          nestedLabwareDisplayName: null,
          nestedLabwareId: null,
          slotName: 'C1',
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
          slotName: 'B1',
          protocolLoadOrder: 0,
          attachedModuleMatch: null,
        },
      ])
    when(vi.mocked(BaseDeck))
      .calledWith(
        expect.objectContaining({
          deckLayerBlocklist: getStandardDeckViewLayerBlockList(
            FLEX_ROBOT_TYPE
          ),
          robotType: FLEX_ROBOT_TYPE,
          // // ToDo (kk:11/03/2023) Update the following part later
          labwareOnDeck: expect.anything(),
          modulesOnDeck: expect.anything(),
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<div>mock BaseDeck</div>)
    render(props)
    screen.getByText('mock BaseDeck')
  })

  // ToDo (kk:11/03/2023)
  // The current component implementation is tough to test everything.
  // I will do refactoring later and add tests to cover more cases.
  // Probably I will replace BaseDeck's children with a new component and write test for that.
  it.todo('should render labware overlay and labware render with liquids')
})
