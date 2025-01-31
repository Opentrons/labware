import omitBy from 'lodash/omitBy'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import {
  useProtocolQuery,
  useProtocolAnalysisAsDocumentQuery,
  useInstrumentsQuery,
  useModulesQuery,
} from '@opentrons/react-api-client'
import {
  FLEX_SIMPLEST_DECK_CONFIG,
  WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  fixtureTiprack300ul,
} from '@opentrons/shared-data'

import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration/useNotifyDeckConfigurationQuery'
import { useMissingProtocolHardware } from '../useMissingProtocolHardware'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'

import type { FunctionComponent, ReactNode } from 'react'
import type { UseQueryResult } from 'react-query'
import type { Protocol } from '@opentrons/api-client'
import type {
  CompletedProtocolAnalysis,
  DeckConfiguration,
  LabwareDefinition2,
} from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/deck_configuration/useNotifyDeckConfigurationQuery')

const mockRTPData = [
  {
    displayName: 'Dry Run',
    variableName: 'DRYRUN',
    description: 'a dry run description',
    type: 'bool',
    default: false,
  },
  {
    displayName: 'Use Gripper',
    variableName: 'USE_GRIPPER',
    description: '',
    type: 'bool',
    default: true,
  },
  {
    displayName: 'Trash Tips',
    variableName: 'TIP_TRASH',
    description: 'throw tip in trash',
    type: 'bool',
    default: true,
  },
  {
    displayName: 'Deactivate Temperatures',
    variableName: 'DEACTIVATE_TEMP',
    description: 'deactivate temperature?',
    type: 'bool',
    default: true,
  },
  {
    displayName: 'Columns of Samples',
    variableName: 'COLUMNS',
    description: '',
    suffix: 'mL',
    type: 'int',
    min: 1,
    max: 14,
    default: 4,
  },
  {
    displayName: 'PCR Cycles',
    variableName: 'PCR_CYCLES',
    description: '',
    type: 'int',
    min: 1,
    max: 10,
    default: 6,
  },
  {
    displayName: 'EtoH Volume',
    variableName: 'ETOH_VOLUME',
    description: '',
    type: 'float',
    min: 1.5,
    max: 10.0,
    default: 6.5,
  },
  {
    displayName: 'Default Module Offsets',
    variableName: 'DEFAULT_OFFSETS',
    description: '',
    type: 'str',
    choices: [
      {
        displayName: 'no offsets',
        value: 'none',
      },
      {
        displayName: 'temp offset',
        value: '1',
      },
      {
        displayName: 'heater-shaker offset',
        value: '2',
      },
    ],
    default: 'none',
  },
]
const mockLabwareDef = fixtureTiprack300ul as LabwareDefinition2
const PROTOCOL_ANALYSIS = {
  id: 'fake analysis',
  status: 'completed',
  labware: [],
  pipettes: [{ id: 'pipId', pipetteName: 'p1000_multi_flex', mount: 'left' }],
  modules: [
    {
      id: 'modId',
      model: 'heaterShakerModuleV1',
      location: { slotName: 'D3' },
      serialNumber: 'serialNum',
    },
  ],
  commands: [
    {
      key: 'CommandKey0',
      commandType: 'loadModule',
      params: {
        model: 'heaterShakerModuleV1',
        location: { slotName: 'D3' },
      },
      result: {
        moduleId: 'modId',
      },
      id: 'CommandId0',
      status: 'succeeded',
      error: null,
      createdAt: 'fakeCreatedAtTimestamp',
      startedAt: 'fakeStartedAtTimestamp',
      completedAt: 'fakeCompletedAtTimestamp',
    },
    {
      key: 'CommandKey1',
      commandType: 'loadLabware',
      params: {
        labwareId: 'firstLabwareId',
        location: { moduleId: 'modId' },
        displayName: 'first labware nickname',
      },
      result: {
        labwareId: 'firstLabwareId',
        definition: mockLabwareDef,
        offset: { x: 0, y: 0, z: 0 },
      },
      id: 'CommandId1',
      status: 'succeeded',
      error: null,
      createdAt: 'fakeCreatedAtTimestamp',
      startedAt: 'fakeStartedAtTimestamp',
      completedAt: 'fakeCompletedAtTimestamp',
    },
  ],
  runTimeParameters: mockRTPData,
} as any
describe.only('useMissingProtocolHardware', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any)
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any)
    vi.mocked(useProtocolQuery).mockReturnValue({
      data: {
        data: { analysisSummaries: [{ id: PROTOCOL_ANALYSIS.id } as any] },
      },
    } as UseQueryResult<Protocol>)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: PROTOCOL_ANALYSIS,
    } as UseQueryResult<CompletedProtocolAnalysis>)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [{}],
    } as UseQueryResult<DeckConfiguration>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should return 1 pipette and 1 module', () => {
    const { result } = renderHook(
      () => useMissingProtocolHardware(PROTOCOL_ANALYSIS.id),
      { wrapper }
    )
    expect(result.current).toEqual({
      isLoading: false,
      missingProtocolHardware: [
        {
          hardwareType: 'pipette',
          pipetteName: 'p1000_multi_flex',
          mount: 'left',
          connected: false,
        },
        {
          hardwareType: 'module',
          moduleModel: 'heaterShakerModuleV1',
          slot: 'D3',
          connected: false,
          hasSlotConflict: false,
        },
      ],
      conflictedSlots: [],
    })
  })
  it('should return 1 conflicted slot', () => {
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue(({
      data: [
        {
          cutoutId: 'cutoutD3',
          cutoutFixtureId: WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
        },
      ],
    } as any) as UseQueryResult<DeckConfiguration>)

    const { result } = renderHook(
      () => useMissingProtocolHardware(PROTOCOL_ANALYSIS.id),
      { wrapper }
    )
    expect(result.current).toEqual({
      isLoading: false,
      missingProtocolHardware: [
        {
          hardwareType: 'pipette',
          pipetteName: 'p1000_multi_flex',
          mount: 'left',
          connected: false,
        },
        {
          hardwareType: 'module',
          moduleModel: 'heaterShakerModuleV1',
          slot: 'D3',
          connected: false,
          hasSlotConflict: true,
        },
      ],
      conflictedSlots: ['D3'],
    })
  })
  it('should return empty array when the correct modules and pipettes are attached', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            mount: 'left',
            instrumentType: 'pipette',
            instrumentName: 'p1000_multi_flex',
            ok: true,
          },
        ],
      },
      isLoading: false,
    } as any)

    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [mockHeaterShaker] },
      isLoading: false,
    } as any)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        omitBy(
          FLEX_SIMPLEST_DECK_CONFIG,
          ({ cutoutId }) => cutoutId === 'cutoutD3'
        ),
        {
          cutoutId: 'cutoutD3',
          cutoutFixtureId: 'heaterShakerModuleV1',
          opentronsModuleSerialNumber: mockHeaterShaker.serialNumber,
        },
      ],
      isLoading: false,
    } as any)

    const { result } = renderHook(
      () => useMissingProtocolHardware(PROTOCOL_ANALYSIS.id),
      { wrapper }
    )
    expect(result.current).toEqual({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: [],
    })
  })
  it('should return conflicting slot when module location is configured with something other than module fixture', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            mount: 'left',
            instrumentType: 'pipette',
            instrumentName: 'p1000_multi_flex',
            ok: true,
          },
        ],
      },
      isLoading: false,
    } as any)

    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [mockHeaterShaker] },
      isLoading: false,
    } as any)

    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        omitBy(
          FLEX_SIMPLEST_DECK_CONFIG,
          ({ cutoutId }) => cutoutId === 'cutoutD3'
        ),
        {
          cutoutId: 'cutoutD3',
          cutoutFixtureId: WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
        },
      ],
      isLoading: false,
    } as any)

    const { result } = renderHook(
      () => useMissingProtocolHardware(PROTOCOL_ANALYSIS.id),
      { wrapper }
    )
    expect(result.current).toEqual({
      missingProtocolHardware: [
        {
          hardwareType: 'module',
          moduleModel: 'heaterShakerModuleV1',
          slot: 'D3',
          connected: false,
          hasSlotConflict: true,
        },
      ],
      isLoading: false,
      conflictedSlots: ['D3'],
    })
  })
})
