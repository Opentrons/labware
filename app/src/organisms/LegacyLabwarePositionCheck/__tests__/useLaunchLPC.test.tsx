import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import { when } from 'vitest-when'
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from 'react-query'

import {
  useCreateMaintenanceRunLabwareDefinitionMutation,
  useDeleteMaintenanceRunMutation,
} from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, fixtureTiprack300ul } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import {
  useCreateTargetedMaintenanceRunMutation,
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { useLaunchLegacyLPC } from '../useLaunchLegacyLPC'
import { LegacyLabwarePositionCheck } from '..'

import type { FunctionComponent, ReactNode } from 'react'
import type { Mock } from 'vitest'
import type { LabwareOffset } from '@opentrons/api-client'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')

const MOCK_RUN_ID = 'mockRunId'
const MOCK_MAINTENANCE_RUN_ID = 'mockMaintenanceRunId'
const mockCurrentOffsets: LabwareOffset[] = [
  {
    createdAt: '2022-12-20T14:06:23.562082+00:00',
    definitionUri: 'opentrons/opentrons_96_tiprack_10ul/1',
    id: 'dceac542-bca4-4313-82ba-d54a19dab204',
    location: { slotName: '2' },
    vector: { x: 1, y: 2, z: 3 },
  },
  {
    createdAt: '2022-12-20T14:06:23.562878+00:00',
    definitionUri:
      'opentrons/opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1',
    id: '70ae2e31-716b-4e1f-a90c-9b0dfd4d7feb',
    location: { slotName: '1', moduleModel: 'heaterShakerModuleV1' },
    vector: { x: 0, y: 0, z: 0 },
  },
]
const mockLabwareDef = fixtureTiprack300ul as LabwareDefinition2

describe('useLaunchLPC hook', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  let mockCreateMaintenanceRun: Mock
  let mockCreateLabwareDefinition: Mock
  let mockDeleteMaintenanceRun: Mock
  const mockStore = configureStore()

  beforeEach(() => {
    const queryClient = new QueryClient()
    mockCreateMaintenanceRun = vi.fn((_data, opts) => {
      const results = { data: { id: MOCK_MAINTENANCE_RUN_ID } }
      opts?.onSuccess(results)
      return Promise.resolve(results)
    })
    mockCreateLabwareDefinition = vi.fn(_data =>
      Promise.resolve({ data: { definitionUri: 'fakeDefUri' } })
    )
    mockDeleteMaintenanceRun = vi.fn((_data, opts) => {
      opts?.onSettled()
    })
    const store = mockStore({ isOnDevice: false })
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
    vi.mocked(LegacyLabwarePositionCheck).mockImplementation(
      ({ onCloseClick }) => (
        <div
          onClick={() => {
            onCloseClick()
          }}
        >
          exit
        </div>
      )
    )
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(MOCK_RUN_ID, { staleTime: Infinity })
      .thenReturn({
        data: {
          data: {
            labwareOffsets: mockCurrentOffsets,
          },
        },
      } as any)
    when(vi.mocked(useCreateTargetedMaintenanceRunMutation))
      .calledWith()
      .thenReturn({
        createTargetedMaintenanceRun: mockCreateMaintenanceRun,
      } as any)
    when(vi.mocked(useCreateMaintenanceRunLabwareDefinitionMutation))
      .calledWith()
      .thenReturn({
        createLabwareDefinition: mockCreateLabwareDefinition,
      } as any)
    when(vi.mocked(useDeleteMaintenanceRunMutation))
      .calledWith()
      .thenReturn({
        deleteMaintenanceRun: mockDeleteMaintenanceRun,
      } as any)
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(MOCK_RUN_ID)
      .thenReturn({
        commands: [
          {
            key: 'CommandKey0',
            commandType: 'loadLabware',
            params: {
              labwareId: 'firstLabwareId',
              location: { slotName: '1' },
              displayName: 'first labware nickname',
            },
            result: {
              labwareId: 'firstLabwareId',
              definition: mockLabwareDef,
              offset: { x: 0, y: 0, z: 0 },
            },
            id: 'CommandId0',
            status: 'succeeded',
            error: null,
            createdAt: 'fakeCreatedAtTimestamp',
            startedAt: 'fakeStartedAtTimestamp',
            completedAt: 'fakeCompletedAtTimestamp',
          },
        ],
      } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns and no wizard by default', () => {
    const { result } = renderHook(
      () => useLaunchLegacyLPC(MOCK_RUN_ID, FLEX_ROBOT_TYPE),
      { wrapper }
    )
    expect(result.current.LegacyLPCWizard).toEqual(null)
  })

  it('returns creates maintenance run with current offsets and definitions when create callback is called, closes and deletes when exit is clicked', async () => {
    const { result } = renderHook(
      () => useLaunchLegacyLPC(MOCK_RUN_ID, FLEX_ROBOT_TYPE),
      { wrapper }
    )
    act(() => {
      result.current.launchLegacyLPC()
    })
    await waitFor(() => {
      expect(mockCreateLabwareDefinition).toHaveBeenCalledWith({
        maintenanceRunId: MOCK_MAINTENANCE_RUN_ID,
        labwareDef: mockLabwareDef,
      })
    })

    await waitFor(() => {
      expect(mockCreateMaintenanceRun).toHaveBeenCalledWith({
        labwareOffsets: mockCurrentOffsets.map(
          ({ vector, location, definitionUri }) => ({
            vector,
            location,
            definitionUri,
          })
        ),
      })
    })

    await waitFor(() => {
      expect(result.current.LegacyLPCWizard).not.toBeNull()
    })
    renderWithProviders(result.current.LegacyLPCWizard ?? <></>)
    fireEvent.click(screen.getByText('exit'))
    expect(mockDeleteMaintenanceRun).toHaveBeenCalledWith(
      MOCK_MAINTENANCE_RUN_ID,
      {
        onSettled: expect.any(Function),
      }
    )
    expect(result.current.LegacyLPCWizard).toBeNull()
  })
})
