import { describe, expect, it } from 'vitest'

import { ERROR_KINDS, DEFINED_ERROR_TYPES } from '../../constants'
import { getErrorKind } from '../getErrorKind'

import type { RunCommandError, RunTimeCommand } from '@opentrons/shared-data'

describe('getErrorKind', () => {
  it.each([
    {
      commandType: 'prepareToAspirate',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      expectedError: ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE,
    },
    {
      commandType: 'aspirate',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      expectedError: ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING,
    },
    {
      commandType: 'aspirateInPlace',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      expectedError: ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING,
    },
    {
      commandType: 'dispense',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      expectedError: ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING,
    },
    {
      commandType: 'dispenseInPlace',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      expectedError: ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING,
    },
    {
      commandType: 'dropTip',
      errorType: DEFINED_ERROR_TYPES.TIP_PHYSICALLY_ATTACHED,
      expectedError: ERROR_KINDS.TIP_DROP_FAILED,
    },
    {
      commandType: 'dropTipInPlace',
      errorType: DEFINED_ERROR_TYPES.TIP_PHYSICALLY_ATTACHED,
      expectedError: ERROR_KINDS.TIP_DROP_FAILED,
    },
    {
      commandType: 'liquidProbe',
      errorType: DEFINED_ERROR_TYPES.LIQUID_NOT_FOUND,
      expectedError: ERROR_KINDS.NO_LIQUID_DETECTED,
    },
    {
      commandType: 'pickUpTip',
      errorType: DEFINED_ERROR_TYPES.TIP_PHYSICALLY_MISSING,
      expectedError: ERROR_KINDS.TIP_NOT_DETECTED,
    },
    {
      commandType: 'moveLabware',
      errorType: DEFINED_ERROR_TYPES.GRIPPER_MOVEMENT,
      expectedError: ERROR_KINDS.GRIPPER_ERROR,
    },
    {
      commandType: 'aspirate',
      errorType: DEFINED_ERROR_TYPES.OVERPRESSURE,
      isDefined: false,
      expectedError: ERROR_KINDS.GENERAL_ERROR,
    },
    {
      commandType: 'aspirate',
      errorType: 'someHithertoUnknownDefinedErrorType',
      expectedError: ERROR_KINDS.GENERAL_ERROR,
    },
    ...([
      'aspirate',
      'dispense',
      'blowOut',
      'moveToWell',
      'moveToAddressableArea',
      'dropTip',
      'pickUpTip',
      'prepareToAspirate',
    ] as const).map(cmd => ({
      commandType: cmd,
      errorType: DEFINED_ERROR_TYPES.STALL_OR_COLLISION,
      expectedError: ERROR_KINDS.STALL_OR_COLLISION,
      isDefined: true,
    })),
  ])(
    'returns $expectedError for $commandType with errorType $errorType',
    ({ commandType, errorType, expectedError, isDefined = true }) => {
      const runRecordFailedCommand = {
        commandType,
        error: {
          isDefined,
          errorType,
        } as RunCommandError,
      } as RunTimeCommand

      const result = getErrorKind({
        byRunRecord: runRecordFailedCommand,
      } as any)
      expect(result).toEqual(expectedError)
    }
  )
})
