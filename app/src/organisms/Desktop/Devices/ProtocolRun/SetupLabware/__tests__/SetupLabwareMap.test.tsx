import { when } from 'vitest-when'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { BaseDeck } from '@opentrons/components'
import {
  OT2_ROBOT_TYPE,
  getModuleDef2,
  fixtureTiprack300ul,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LabwareInfoOverlay } from '../../LabwareInfoOverlay'
import {
  getLabwareRenderInfo,
  getAttachedProtocolModuleMatches,
} from '/app/transformations/analysis'
import { SetupLabwareMap } from '../SetupLabwareMap'

import type { ComponentProps } from 'react'
import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  ModuleModel,
  ModuleType,
} from '@opentrons/shared-data'

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof BaseDeck>()
  return {
    ...actualComponents,
    BaseDeck: vi.fn(),
  }
})
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof getModuleDef2>()
  return {
    ...actualSharedData,
    getModuleDef2: vi.fn(),
  }
})

vi.mock('../../LabwareInfoOverlay')
vi.mock('/app/transformations/analysis/getLabwareRenderInfo')
vi.mock('/app/transformations/analysis/getAttachedProtocolModuleMatches')
vi.mock('../../utils/getModuleTypesThatRequireExtraAttention')
vi.mock('/app/organisms/RunTimeControl')
vi.mock('../../../hooks')

// TODO(jh 03-06-24): We need to rethink this test as we are testing components several layers deep across top-level imports.
// Effectively, this test is a BaseDeck test, and truly a "Module" component and "LabwareRender" test.
// Instead of testing SetupLabwareMap, make a test for Module using the tests below as a guide.

const RUN_ID = '1'
const MOCK_300_UL_TIPRACK_ID = '300_ul_tiprack_id'
const MOCK_MAGNETIC_MODULE_COORDS = [10, 20, 0]
const MOCK_TC_COORDS = [20, 30, 0]
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

const mockTCModule = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'TCModuleId',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
}

const render = (props: ComponentProps<typeof SetupLabwareMap>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SetupLabwareMap {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('SetupLabwareMap', () => {
  beforeEach(() => {
    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([])
    vi.mocked(getLabwareRenderInfo).mockReturnValue({})
    vi.mocked(BaseDeck).mockReturnValue(<div>mock baseDeck</div>)

    vi.mocked(LabwareInfoOverlay).mockReturnValue(<div></div>) // this (default) empty div will be returned when LabwareInfoOverlay isn't called with expected props
    when(vi.mocked(LabwareInfoOverlay))
      .calledWith(expect.objectContaining({ definition: fixtureTiprack300ul }))
      .thenReturn(
        <div>
          mock labware info overlay of{' '}
          {fixtureTiprack300ul.metadata.displayName}
        </div>
      )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render a deck WITHOUT labware and WITHOUT modules', () => {
    render({
      runId: RUN_ID,
      protocolAnalysis: ({
        commands: [],
        labware: [],
        robotType: OT2_ROBOT_TYPE,
      } as unknown) as CompletedProtocolAnalysis,
    })
    expect(vi.mocked(LabwareInfoOverlay)).not.toHaveBeenCalled()
    expect(vi.mocked(BaseDeck)).toHaveBeenCalledWith(
      expect.objectContaining({ labwareOnDeck: [], modulesOnDeck: [] }),
      expect.anything()
    )
  })
  it.skip('should render a deck WITH labware and WITHOUT modules', () => {
    vi.mocked(getLabwareRenderInfo).mockReturnValue({
      '300_ul_tiprack_id': {
        labwareDef: fixtureTiprack300ul as LabwareDefinition2,
        displayName: 'fresh tips',
        x: MOCK_300_UL_TIPRACK_COORDS[0],
        y: MOCK_300_UL_TIPRACK_COORDS[1],
        z: MOCK_300_UL_TIPRACK_COORDS[2],
        slotName: '1',
      },
    })
    render({
      runId: RUN_ID,
      protocolAnalysis: ({
        commands: [],
        labware: [],
        robotType: OT2_ROBOT_TYPE,
      } as unknown) as CompletedProtocolAnalysis,
    })

    expect(vi.mocked(BaseDeck)).toHaveBeenCalledWith(
      expect.objectContaining(
        {
          labwareOnDeck: [
            expect.objectContaining(
              { definition: fixtureTiprack300ul },
              // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
              expect.anything()
            ),
          ],
        },
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
    )
  })

  it.skip('should render a deck WITH labware and WITH modules', () => {
    vi.mocked(getLabwareRenderInfo).mockReturnValue({
      [MOCK_300_UL_TIPRACK_ID]: {
        labwareDef: fixtureTiprack300ul as LabwareDefinition2,
        displayName: 'fresh tips',
        x: MOCK_300_UL_TIPRACK_COORDS[0],
        y: MOCK_300_UL_TIPRACK_COORDS[1],
        z: MOCK_300_UL_TIPRACK_COORDS[2],
        slotName: '1',
      },
    })

    vi.mocked(getAttachedProtocolModuleMatches).mockReturnValue([
      {
        moduleId: mockMagneticModule.moduleId,
        x: MOCK_MAGNETIC_MODULE_COORDS[0],
        y: MOCK_MAGNETIC_MODULE_COORDS[1],
        z: MOCK_MAGNETIC_MODULE_COORDS[2],
        moduleDef: mockMagneticModule as any,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 0,
        attachedModuleMatch: null,
        slotName: '4',
      } as any,
      {
        moduleId: mockTCModule.moduleId,
        x: MOCK_TC_COORDS[0],
        y: MOCK_TC_COORDS[1],
        z: MOCK_TC_COORDS[2],
        moduleDef: mockTCModule,
        nestedLabwareDef: null,
        nestedLabwareId: null,
        protocolLoadOrder: 1,
        attachedModuleMatch: null,
        slotName: '5',
      },
    ])

    when(vi.mocked(getModuleDef2))
      .calledWith(mockMagneticModule.model)
      .thenReturn(mockMagneticModule as any)
    when(vi.mocked(getModuleDef2))
      .calledWith(mockTCModule.model)
      .thenReturn(mockTCModule as any)

    render({
      runId: RUN_ID,
      protocolAnalysis: ({
        commands: [],
        labware: [],
        robotType: OT2_ROBOT_TYPE,
      } as unknown) as CompletedProtocolAnalysis,
    })

    screen.getByText('mock module viz magneticModuleType')
    screen.getByText('mock module viz thermocyclerModuleType')
    screen.getByText('mock labware render of 300ul Tiprack FIXTURE')
    screen.getByText('mock labware info overlay of 300ul Tiprack FIXTURE')
  })
})
