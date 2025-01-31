import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { createStore } from 'redux'
import { vi, it, expect, describe, beforeEach, afterEach } from 'vitest'

import {
  getLoadedLabwareDefinitionsByUri,
  simple_v6 as _uncastedSimpleV6Protocol,
} from '@opentrons/shared-data'

import { i18n } from '/app/i18n'
import { RUN_ID_1 } from '..//__fixtures__'
import { useStoredProtocolAnalysis } from '/app/resources/analysis'
import { useLPCDisabledReason } from '../useLPCDisabledReason'
import { useUnmatchedModulesForProtocol } from '../useUnmatchedModulesForProtocol'
import { useRunCalibrationStatus } from '../useRunCalibrationStatus'
import { useMostRecentCompletedAnalysis } from '../useMostRecentCompletedAnalysis'
import { useRunHasStarted } from '../useRunHasStarted'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type * as SharedData from '@opentrons/shared-data'
import type { State } from '/app/redux/types'

vi.mock('../useUnmatchedModulesForProtocol')
vi.mock('../useRunCalibrationStatus')
vi.mock('../useMostRecentCompletedAnalysis')
vi.mock('../useRunHasStarted')
vi.mock('/app/resources/analysis')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    getLoadedLabwareDefinitionsByUri: vi.fn(),
  }
})

const simpleV6Protocol = (_uncastedSimpleV6Protocol as unknown) as SharedData.ProtocolAnalysisOutput

describe('useLPCDisabledReason', () => {
  const store: Store<State> = createStore(vi.fn(), {})
  const wrapper: FunctionComponent<{ children: ReactNode }> = ({
    children,
  }) => (
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>{children}</Provider>
    </I18nextProvider>
  )
  beforeEach(() => {
    store.dispatch = vi.fn()
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(
      simpleV6Protocol as any
    )
    vi.mocked(useStoredProtocolAnalysis).mockReturnValue(
      (simpleV6Protocol as unknown) as SharedData.ProtocolAnalysisOutput
    )
    vi.mocked(useRunHasStarted).mockReturnValue(false)
    vi.mocked(useRunCalibrationStatus).mockReturnValue({ complete: true })
    vi.mocked(useUnmatchedModulesForProtocol).mockReturnValue({
      missingModuleIds: [],
      remainingAttachedModules: [],
    })
    vi.mocked(getLoadedLabwareDefinitionsByUri).mockReturnValue(
      _uncastedSimpleV6Protocol.labwareDefinitions as {}
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('renders no disabled reason', () => {
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toBeNull()
  })
  it('renders no disabled reason for odd', () => {
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toBeNull()
  })
  it('renders disabled reason for module and calibration incomponent for odd', () => {
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: true,
          hasMissingCalForOdd: true,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Connect and calibrate all hardware first'
    )
  })
  it('renders disabled reason for module and calibration incomponent', () => {
    vi.mocked(useUnmatchedModulesForProtocol).mockReturnValue({
      missingModuleIds: ['mockId'],
      remainingAttachedModules: [],
    })
    vi.mocked(useRunCalibrationStatus).mockReturnValue({ complete: false })
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Make sure robot calibration is complete and all modules are connected before running Labware Position Check'
    )
  })
  it('renders disabled reason for calibration incomponent for odd', () => {
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: true,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Calibrate pipettes first')
  })
  it('renders disabled reason for calibration incomponent', () => {
    vi.mocked(useRunCalibrationStatus).mockReturnValue({ complete: false })
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Make sure robot calibration is complete before running Labware Position Check'
    )
  })
  it('renders disabled reason for missing modules for odd', () => {
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: true,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Connect all modules first')
  })
  it('renders disabled reason for missing modules', () => {
    vi.mocked(useUnmatchedModulesForProtocol).mockReturnValue({
      missingModuleIds: ['mockId'],
      remainingAttachedModules: [],
    })
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Make sure all modules are connected before running Labware Position Check'
    )
  })
  it('renders disabled reason for run has started for odd', () => {
    vi.mocked(useRunHasStarted).mockReturnValue(true)

    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Robot is busy')
  })
  it('renders disabled reason for run has started', () => {
    vi.mocked(useRunHasStarted).mockReturnValue(true)

    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Labware Position Check is not available after run has started'
    )
  })
  it('renders disabled reason if robot protocol anaylsis is null for odd', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(null as any)
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Robot is analyzing')
  })
  it('renders disabled reason if robot protocol anaylsis is null', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(null as any)
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Labware Position Check is not available while protocol is analyzing on robot'
    )
  })
  it('renders disabled reason if no pipettes in protocol for odd', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      ...simpleV6Protocol,
      pipettes: {},
    } as any)
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Protocol must load labware and a pipette'
    )
  })
  it('renders disabled reason if no pipettes in protocol', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      ...simpleV6Protocol,
      pipettes: {},
    } as any)
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Labware Position Check requires that the protocol loads labware and pipettes'
    )
  })
  it('renders disabled reason if no tipracks in protocols for odd', () => {
    vi.mocked(getLoadedLabwareDefinitionsByUri).mockReturnValue({})

    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Protocol must load a tip rack')
  })
  it('renders disabled reason if no tipracks in protocols', () => {
    vi.mocked(getLoadedLabwareDefinitionsByUri).mockReturnValue({})

    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Labware Position Check requires that the protocol loads a tip rack'
    )
  })
  it('renders disabled reason if no tips are being used in the protocols for odd', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      ...simpleV6Protocol,
      commands: {},
    } as any)
    const { result } = renderHook(
      () =>
        useLPCDisabledReason({
          runId: RUN_ID_1,
          hasMissingModulesForOdd: false,
          hasMissingCalForOdd: false,
        }),
      { wrapper }
    )
    expect(result.current).toStrictEqual('Protocol must pick up a tip')
  })
  it('renders disabled reason if no tips are being used in the protocols', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      ...simpleV6Protocol,
      commands: {},
    } as any)
    const { result } = renderHook(
      () => useLPCDisabledReason({ robotName: 'otie', runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(
      'Labware Position Check requires that the protocol has at least one pipette that picks up a tip'
    )
  })
  it('renders disabled reason as null if only runId is present', () => {
    const { result } = renderHook(
      () => useLPCDisabledReason({ runId: RUN_ID_1 }),
      { wrapper }
    )
    expect(result.current).toStrictEqual(null)
  })
})
