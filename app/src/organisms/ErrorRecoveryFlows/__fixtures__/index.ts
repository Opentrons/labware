import {
  FLEX_ROBOT_TYPE,
  getLabwareDefURI,
  opentrons96PcrAdapterV1,
} from '@opentrons/shared-data'
import { RUN_STATUS_AWAITING_RECOVERY } from '@opentrons/api-client'

import { RECOVERY_MAP } from '../constants'
import { mockRobotSideAnalysis } from '/app/molecules/Command/__fixtures__'

import type { LoadedLabware, LabwareDefinition2 } from '@opentrons/shared-data'
import type { FailedCommand, RecoveryContentProps } from '../types'

export const mockFailedCommand: FailedCommand = {
  commandType: 'pickUpTip',
  completedAt: '2024-05-24T13:55:32.595751+00:00',
  createdAt: '2024-05-24T13:55:19.014871+00:00',
  status: 'failed',
  key: '28d6daa63cc6d88bd8e3f0ababff79c3',
  error: {
    createdAt: '2024-05-24T13:55:32.595751+00:00',
    detail: 'No tip detected.',
    isDefined: true,
    errorCode: '3003',
    errorType: 'tipPhysicallyMissing',
    errorInfo: {},
    wrappedErrors: [],
    id: '123',
  } as any,
  startedAt: '2024-05-24T13:55:19.016799+00:00',
  id: '1',
  params: {
    labwareId: '58774227-2413-40aa-957e-271ab7807927',
    pipetteId: '3d471ffa-0b6b-45f9-86ce-4d0fe2c25fdc',
    wellLocation: {
      offset: { x: 0, y: 0, z: 0 },
      origin: 'top',
    },
    wellName: 'A1',
  },
  notes: [],
}

const mockAdapterDef = opentrons96PcrAdapterV1 as LabwareDefinition2

export const mockPickUpTipLabware: LoadedLabware = {
  id: 'MOCK_PickUpTipLabware_ID',
  location: { slotName: 'A1' },
  definitionUri: getLabwareDefURI(mockAdapterDef),
  loadName: mockAdapterDef.parameters.loadName,
  displayName: 'MOCK_PickUpTipLabware_NAME',
}

// TODO: jh(08-07-24): update the "byAnalysis" mockFailedCommand.
export const mockRecoveryContentProps: RecoveryContentProps = {
  unvalidatedFailedCommand: mockFailedCommand,
  failedCommand: {
    byRunRecord: mockFailedCommand,
    byAnalysis: mockFailedCommand,
  },
  runLwDefsByUri: {} as any,
  errorKind: 'GENERAL_ERROR',
  robotType: FLEX_ROBOT_TYPE,
  runId: 'MOCK_RUN_ID',
  doorStatusUtils: { isDoorOpen: false, isProhibitedDoorOpen: false },
  isOnDevice: true,
  runStatus: RUN_STATUS_AWAITING_RECOVERY,
  recoveryMap: {
    route: RECOVERY_MAP.OPTION_SELECTION.ROUTE,
    step: RECOVERY_MAP.OPTION_SELECTION.STEPS.SELECT,
  },
  routeUpdateActions: {} as any,
  recoveryCommands: {} as any,
  tipStatusUtils: {} as any,
  currentRecoveryOptionUtils: {} as any,
  failedLabwareUtils: { pickUpTipLabware: mockPickUpTipLabware } as any,
  failedPipetteUtils: {} as any,
  deckMapUtils: { setSelectedLocation: () => {} } as any,
  stepCounts: {} as any,
  protocolAnalysis: mockRobotSideAnalysis,
  subMapUtils: { subMap: null, updateSubMap: () => null } as any,
  hasLaunchedRecovery: true,
  getRecoveryOptionCopy: () => 'MOCK_COPY',
  commandsAfterFailedCommand: [
    mockRobotSideAnalysis.commands[mockRobotSideAnalysis.commands.length - 2],
    mockRobotSideAnalysis.commands[mockRobotSideAnalysis.commands.length - 1],
  ],
  recoveryActionMutationUtils: {} as any,
  analytics: {
    reportRecoveredRunResult: () => {},
    reportErrorEvent: () => {},
    reportViewErrorDetailsEvent: () => {},
    reportActionSelectedEvent: () => {},
    reportActionSelectedResult: () => {},
  },
  allRunDefs: [],
}
