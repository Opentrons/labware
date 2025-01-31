import { describe, it, expect, vi } from 'vitest'
import {
  getInitialRobotStateStandard,
  makeContext,
  DEFAULT_PIPETTE,
  MULTI_PIPETTE,
  SOURCE_LABWARE,
  DEST_LABWARE,
  FIXED_TRASH_ID,
} from '@opentrons/step-generation'
import { fixtureTiprack300ul, getLabwareDefURI } from '@opentrons/shared-data'
import { generateRobotStateTimeline } from '../generateRobotStateTimeline'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { StepArgsAndErrorsById } from '../../steplist'

vi.mock('../../labware-defs/utils')

describe('generateRobotStateTimeline', () => {
  it('performs eager tip dropping', () => {
    const allStepArgsAndErrors: StepArgsAndErrorsById = {
      a: {
        errors: false,
        stepArgs: {
          dropTipLocation: FIXED_TRASH_ID,
          pipette: DEFAULT_PIPETTE,
          volume: 5,
          sourceLabware: SOURCE_LABWARE,
          destLabware: DEST_LABWARE,
          aspirateFlowRateUlSec: 3.78,
          dispenseFlowRateUlSec: 3.78,
          aspirateOffsetFromBottomMm: 1,
          dispenseOffsetFromBottomMm: 0.5,
          blowoutFlowRateUlSec: 3.78,
          blowoutOffsetFromTopMm: 0,
          changeTip: 'once',
          preWetTip: false,
          aspirateDelay: null,
          dispenseDelay: null,
          aspirateAirGapVolume: null,
          dispenseAirGapVolume: null,
          mixInDestination: null,
          touchTipAfterAspirate: false,
          touchTipAfterAspirateOffsetMmFromTop: -13.81,
          touchTipAfterDispense: false,
          touchTipAfterDispenseOffsetMmFromTop: -13.81,
          name: 'transfer',
          commandCreatorFnName: 'transfer',
          blowoutLocation: null,
          sourceWells: ['A1', 'A2'],
          destWells: ['A12', 'A12'],
          mixBeforeAspirate: null,
          description: null,
          nozzles: null,
          tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
          aspirateXOffset: 0,
          aspirateYOffset: 0,
          dispenseXOffset: 0,
          dispenseYOffset: 0,
        },
      },
      b: {
        errors: false,
        stepArgs: {
          dropTipLocation: FIXED_TRASH_ID,
          pipette: MULTI_PIPETTE,
          volume: 5,
          sourceLabware: SOURCE_LABWARE,
          destLabware: DEST_LABWARE,
          aspirateFlowRateUlSec: 3.78,
          dispenseFlowRateUlSec: 3.78,
          aspirateOffsetFromBottomMm: 1,
          dispenseOffsetFromBottomMm: 0.5,
          blowoutFlowRateUlSec: 3.78,
          blowoutOffsetFromTopMm: 0,
          changeTip: 'always',
          preWetTip: false,
          aspirateDelay: null,
          dispenseDelay: null,
          aspirateAirGapVolume: null,
          dispenseAirGapVolume: null,
          mixInDestination: null,
          touchTipAfterAspirate: false,
          touchTipAfterAspirateOffsetMmFromTop: -13.81,
          touchTipAfterDispense: false,
          touchTipAfterDispenseOffsetMmFromTop: -13.81,
          name: 'transfer',
          commandCreatorFnName: 'transfer',
          blowoutLocation: null,
          sourceWells: ['A1'],
          destWells: ['A12'],
          mixBeforeAspirate: null,
          description: null,
          nozzles: null,
          tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
          aspirateXOffset: 0,
          aspirateYOffset: 0,
          dispenseXOffset: 0,
          dispenseYOffset: 0,
        },
      },
      c: {
        errors: false,
        stepArgs: {
          dropTipLocation: FIXED_TRASH_ID,
          commandCreatorFnName: 'mix',
          name: 'Mix',
          description: 'description would be here 2018-03-01',
          labware: SOURCE_LABWARE,
          wells: ['A2', 'A3'],
          volume: 5,
          times: 2,
          touchTip: false,
          touchTipMmFromTop: -13.81,
          changeTip: 'always',
          blowoutLocation: null,
          pipette: DEFAULT_PIPETTE,
          aspirateFlowRateUlSec: 3.78,
          dispenseFlowRateUlSec: 3.78,
          blowoutFlowRateUlSec: 3.78,
          offsetFromBottomMm: 0.5,
          blowoutOffsetFromTopMm: 0,
          aspirateDelaySeconds: null,
          dispenseDelaySeconds: null,
          nozzles: null,
          tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
          xOffset: 0,
          yOffset: 0,
        },
      },
    }
    const orderedStepIds = ['a', 'b', 'c']
    const invariantContext = makeContext()
    const initialRobotState = getInitialRobotStateStandard(invariantContext)
    const result = generateRobotStateTimeline({
      allStepArgsAndErrors,
      orderedStepIds,
      initialRobotState,
      invariantContext,
    })
    expect(result.timeline.length).toEqual(orderedStepIds.length)
    expect(result.errors).toBe(null)
    const commandOverview = result.timeline.map(frame =>
      frame.commands.map(command => command.commandType)
    )
    // NOTE: if you update this snapshot, make sure this it exhibits eager tip dropping
    expect(commandOverview).toMatchInlineSnapshot(`
      [
        [
          "pickUpTip",
          "aspirate",
          "dispense",
          "aspirate",
          "dispense",
          "moveToAddressableAreaForDropTip",
          "dropTipInPlace",
        ],
        [
          "pickUpTip",
          "aspirate",
          "dispense",
          "moveToAddressableAreaForDropTip",
          "dropTipInPlace",
        ],
        [
          "pickUpTip",
          "aspirate",
          "dispense",
          "aspirate",
          "dispense",
          "moveToAddressableAreaForDropTip",
          "dropTipInPlace",
          "pickUpTip",
          "aspirate",
          "dispense",
          "aspirate",
          "dispense",
          "moveToAddressableAreaForDropTip",
          "dropTipInPlace",
        ],
      ]
    `)
  })
})
