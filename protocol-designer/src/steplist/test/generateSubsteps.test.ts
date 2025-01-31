import { it, describe, expect, beforeEach } from 'vitest'
import {
  makeInitialRobotState,
  makeContext,
  FIXED_TRASH_ID,
} from '@opentrons/step-generation'
import { fixtureTiprack300ul, getLabwareDefURI } from '@opentrons/shared-data'
import { THERMOCYCLER_STATE } from '../../constants'
import { generateSubstepItem } from '../generateSubstepItem'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  RobotState,
  InvariantContext,
  ThermocyclerStateStepArgs,
} from '../../../../step-generation/src/types'
import type { StepArgsAndErrors, LabwareNamesByModuleId } from '../types'

describe('generateSubstepItem', () => {
  const stepId = 'step123'
  const tiprackId = 'tiprack1Id'
  const pipetteId = 'p300SingleId'
  const sourcePlateId = 'sourcePlateId'
  const destPlateId = 'destPlateId'

  let invariantContext: InvariantContext,
    labwareNamesByModuleId: LabwareNamesByModuleId,
    robotState: RobotState | null
  beforeEach(() => {
    invariantContext = makeContext()

    labwareNamesByModuleId = {
      magnet123: {
        nickname: 'mag nickname',
      },
      tempId: {
        nickname: 'temp nickname',
      },
      thermocyclerModuleId: {
        nickname: 'tc nickname',
      },
    }
    robotState = makeInitialRobotState({
      invariantContext,
      pipetteLocations: { p300SingleId: { mount: 'left' } },
      labwareLocations: {
        tiprack1Id: { slot: '2' },
        sourcePlateId: { slot: '4' },
        destPlateId: { slot: '5' },
      },
      // @ts-expect-error(sa, 2021-6-15): this looks to be copied, because tiprackSetting is nowhere to be found in makeInitialRobotState
      tiprackSetting: { tiprack1Id: false },
    })
  })

  it('null is returned when no robotState', () => {
    robotState = null
    const stepArgsAndErrors = {
      stepArgs: {
        module: 'aaaa',
        commandCreatorFnName: 'deactivateTemperature',
        message: 'message',
      },
      errors: {},
    }

    const result = generateSubstepItem(
      // @ts-expect-error(sa, 2021-6-15): errors should be a boolean, not {}
      stepArgsAndErrors,
      invariantContext,
      robotState,
      stepId,
      labwareNamesByModuleId
    )

    expect(result).toBeNull()
  })
  ;[
    {
      testName: 'null is returned when no stepArgsAndErrors',
      args: null,
    },
    {
      testName: 'null is returned when no stepArgs',
      args: {
        stepArgs: null,
        errors: { field: {} },
      },
    },
    {
      testName: 'null is returned when no errors',
      args: {
        stepArgs: {
          module: 'aaaa',
          commandCreatorFnName: 'deactivateTemperature',
          message: 'message',
        },
        errors: { field: {} },
      },
    },
  ].forEach(({ testName, args }) => {
    it(testName, () => {
      const result = generateSubstepItem(
        // @ts-expect-error(sa, 2021-6-15): errors should be a boolean, not {}
        args,
        invariantContext,
        robotState,
        stepId,
        labwareNamesByModuleId
      )

      expect(result).toBeNull()
    })
  })

  describe('like substeps', () => {
    let sharedArgs: {
      pipette: string
      sourceLabware: string
      destLabware: string
      name: string
      volume: number
      preWetTip: boolean
      touchTipAfterAspirate: boolean
      touchTipAfterAspirateOffsetMmFromBottom: number
      changeTip: string
      aspirateFlowRateUlSec: number
      aspirateOffsetFromBottomMm: number
      touchTipAfterDispense: boolean
      touchTipAfterDispenseOffsetMmFromBottom: number
      dispenseFlowRateUlSec: number
      dispenseOffsetFromBottomMm: number
      dropTipLocation: string
      tipRack: string
    }
    beforeEach(() => {
      sharedArgs = {
        pipette: pipetteId,
        sourceLabware: sourcePlateId,
        destLabware: destPlateId,
        name: 'testing',
        volume: 50,
        preWetTip: false,
        touchTipAfterAspirate: false,
        touchTipAfterAspirateOffsetMmFromBottom: 10,
        changeTip: 'once',
        aspirateFlowRateUlSec: 5,
        aspirateOffsetFromBottomMm: 3,
        touchTipAfterDispense: false,
        touchTipAfterDispenseOffsetMmFromBottom: 10,
        dispenseFlowRateUlSec: 5,
        dispenseOffsetFromBottomMm: 10,
        dropTipLocation: FIXED_TRASH_ID,
        tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
      }
    })
    ;[
      {
        testName: 'consolidate command returns substep data',
        stepArgs: {
          commandCreatorFnName: 'consolidate',
          sourceWells: ['A1', 'A2'],
          destWell: 'C1',
          blowoutLocation: null,
          blowoutFlowRateUlSec: 10,
          blowoutOffsetFromTopMm: 5,
          mixFirstAspirate: null,
          mixInDestination: null,
          dropTipLocation: FIXED_TRASH_ID,
        },
        expected: {
          substepType: 'sourceDest',
          multichannel: false,
          commandCreatorFnName: 'consolidate',
          parentStepId: stepId,
          rows: [
            {
              activeTips: {
                pipetteId: pipetteId,
                labwareId: tiprackId,
                wellName: 'A1',
              },
              source: { well: 'A1', preIngreds: {}, postIngreds: {} },
              dest: undefined,
              volume: 50,
            },
            {
              volume: 50,
              source: { well: 'A2', preIngreds: {}, postIngreds: {} },
              activeTips: {
                pipetteId: pipetteId,
                labwareId: tiprackId,
                wellName: 'A1',
              },
              dest: {
                postIngreds: {
                  __air__: {
                    volume: 100,
                  },
                },
                preIngreds: {},
                well: 'C1',
              },
              isAirGap: false,
            },
          ],
        },
      },
      {
        testName: 'distribute command returns substep data',
        stepArgs: {
          commandCreatorFnName: 'distribute',
          sourceWell: 'A1',
          destWells: ['A1', 'A2'],
          disposalVolume: null,
          disposalLabware: null,
          disposalWell: null,
          blowoutFlowRateUlSec: 10,
          blowoutOffsetFromTopMm: 5,
          mixBeforeAspirate: null,
          dropTipLocation: FIXED_TRASH_ID,
        },
        expected: {
          commandCreatorFnName: 'distribute',
          multichannel: false,
          parentStepId: stepId,
          rows: [
            {
              activeTips: {
                labwareId: tiprackId,
                pipetteId: pipetteId,
                wellName: 'A1',
              },
              dest: {
                postIngreds: {
                  __air__: {
                    volume: 50,
                  },
                },
                preIngreds: {},
                well: 'A1',
              },
              isAirGap: false,
              source: {
                postIngreds: {},
                preIngreds: {},
                well: 'A1',
              },
              volume: 50,
            },
            {
              activeTips: {
                labwareId: tiprackId,
                pipetteId: pipetteId,
                wellName: 'A1',
              },
              dest: {
                postIngreds: {
                  __air__: {
                    volume: 50,
                  },
                },
                preIngreds: {},
                well: 'A2',
              },
              source: undefined,
              volume: 50,
            },
          ],
          substepType: 'sourceDest',
        },
      },
      {
        testName: 'transfer command returns substep data',
        stepArgs: {
          commandCreatorFnName: 'transfer',
          sourceWells: ['A1', 'A2'],
          destWells: ['A1', 'A2'],
          blowoutLocation: null,
          blowoutFlowRateUlSec: 10,
          blowoutOffsetFromTopMm: 5,
          mixBeforeAspirate: null,
          mixInDestination: null,
          dropTipLocation: FIXED_TRASH_ID,
        },
        expected: {
          substepType: 'sourceDest',
          multichannel: false,
          commandCreatorFnName: 'transfer',
          parentStepId: stepId,
          rows: [
            {
              activeTips: {
                pipetteId: pipetteId,
                labwareId: tiprackId,
                wellName: 'A1',
              },
              isAirGap: false,
              source: { well: 'A1', preIngreds: {}, postIngreds: {} },
              dest: {
                well: 'A1',
                preIngreds: {},
                postIngreds: {
                  __air__: {
                    volume: 50,
                  },
                },
              },
              volume: 50,
            },
            {
              volume: 50,
              source: { well: 'A2', preIngreds: {}, postIngreds: {} },
              activeTips: {
                pipetteId: pipetteId,
                labwareId: tiprackId,
                wellName: 'A1',
              },
              isAirGap: false,
              dest: {
                postIngreds: {
                  __air__: {
                    volume: 50,
                  },
                },
                preIngreds: {},
                well: 'A2',
              },
            },
          ],
        },
      },
    ].forEach(({ testName, stepArgs, expected }) => {
      it(testName, () => {
        const stepArgsAndErrors: StepArgsAndErrors = {
          // @ts-expect-error(sa, 2021-6-15): errors should be boolean typed
          errors: {},
          // @ts-expect-error(sa, 2021-6-15): stepArgs missing name and description
          stepArgs: { ...sharedArgs, ...stepArgs },
        }

        const result = generateSubstepItem(
          stepArgsAndErrors,
          invariantContext,
          robotState,
          stepId,
          labwareNamesByModuleId
        )

        expect(result).toEqual(expected)
      })
    })
  })

  it('mix command returns substep data', () => {
    const stepArgsAndErrors: StepArgsAndErrors = {
      // @ts-expect-error(sa, 2021-6-15): stepArgs missing description
      stepArgs: {
        name: 'testing',
        commandCreatorFnName: 'mix',
        labware: sourcePlateId,
        pipette: pipetteId,
        wells: ['A1', 'A2'],
        volume: 50,
        times: 2,
        touchTip: false,
        touchTipMmFromTop: -5,
        changeTip: 'always',
        blowoutLocation: null,
        blowoutFlowRateUlSec: 3,
        blowoutOffsetFromTopMm: 3,
        offsetFromBottomMm: 4,
        aspirateFlowRateUlSec: 5,
        dispenseFlowRateUlSec: 5,
        dropTipLocation: FIXED_TRASH_ID,
        tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
      },
      // @ts-expect-error(sa, 2021-6-15): errors should be boolean typed
      errors: {},
    }

    const result = generateSubstepItem(
      stepArgsAndErrors,
      invariantContext,
      robotState,
      stepId,
      labwareNamesByModuleId
    )

    const expected = {
      commandCreatorFnName: 'mix',
      multichannel: false,
      parentStepId: 'step123',
      rows: [
        {
          activeTips: {
            labwareId: 'tiprack1Id',
            pipetteId: 'p300SingleId',
            wellName: 'A1',
          },
          dest: {
            postIngreds: {
              __air__: {
                volume: 50,
              },
            },
            preIngreds: {},
            well: 'A1',
          },
          isAirGap: false,
          source: {
            postIngreds: {},
            preIngreds: {},
            well: 'A1',
          },
          volume: 50,
        },
        {
          activeTips: {
            labwareId: 'tiprack1Id',
            pipetteId: 'p300SingleId',
            wellName: 'A1',
          },
          dest: {
            postIngreds: {
              __air__: {
                volume: 100,
              },
            },
            preIngreds: {
              __air__: {
                volume: 50,
              },
            },
            well: 'A1',
          },
          isAirGap: false,
          source: {
            postIngreds: {
              __air__: {
                volume: 50,
              },
            },
            preIngreds: {
              __air__: {
                volume: 50,
              },
            },
            well: 'A1',
          },
          volume: 50,
        },
        {
          activeTips: {
            labwareId: 'tiprack1Id',
            pipetteId: 'p300SingleId',
            wellName: 'B1',
          },
          dest: {
            postIngreds: {
              __air__: {
                volume: 50,
              },
            },
            preIngreds: {},
            well: 'A2',
          },
          isAirGap: false,
          source: {
            postIngreds: {},
            preIngreds: {},
            well: 'A2',
          },
          volume: 50,
        },
        {
          activeTips: {
            labwareId: 'tiprack1Id',
            pipetteId: 'p300SingleId',
            wellName: 'B1',
          },
          dest: {
            postIngreds: {
              __air__: {
                volume: 100,
              },
            },
            preIngreds: {
              __air__: {
                volume: 50,
              },
            },
            well: 'A2',
          },
          isAirGap: false,
          source: {
            postIngreds: {
              __air__: {
                volume: 50,
              },
            },
            preIngreds: {
              __air__: {
                volume: 50,
              },
            },
            well: 'A2',
          },
          volume: 50,
        },
      ],
      substepType: 'sourceDest',
    }
    expect(result).toEqual(expected)
  })

  it('thermocyclerState returns substep data', () => {
    const ThermocyclerStateArgs: ThermocyclerStateStepArgs = {
      moduleId: 'thermocyclerModuleId',
      commandCreatorFnName: THERMOCYCLER_STATE,
      message: 'a message',
      blockTargetTemp: 44,
      lidTargetTemp: 66,
      lidOpen: false,
    }
    const stepArgsAndErrors: StepArgsAndErrors = {
      // @ts-expect-error(sa, 2021-6-15): errors should be boolean typed
      errors: {},
      stepArgs: ThermocyclerStateArgs,
    }
    const result = generateSubstepItem(
      stepArgsAndErrors,
      invariantContext,
      robotState,
      stepId,
      labwareNamesByModuleId
    )
    expect(result).toEqual({
      substepType: THERMOCYCLER_STATE,
      labwareNickname: 'tc nickname',
      blockTargetTemp: 44,
      lidTargetTemp: 66,
      lidOpen: false,
      message: 'a message',
    })
  })

  it('null is returned when no matching command', () => {
    const stepArgsAndErrors = {
      errors: {},
      stepArgs: {
        commandCreatorFnName: 'nonexistentCommand',
      },
    }

    const result = generateSubstepItem(
      // @ts-expect-error(sa, 2021-6-15): errors should be boolean typed
      stepArgsAndErrors,
      invariantContext,
      robotState,
      stepId,
      {}
    )

    expect(result).toBeNull()
  })
})
