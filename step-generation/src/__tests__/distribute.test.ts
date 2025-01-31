import { beforeEach, describe, it, expect } from 'vitest'
import { FIXED_TRASH_ID } from '../constants'
import {
  WASTE_CHUTE_CUTOUT,
  fixtureTiprack300ul,
  getLabwareDefURI,
} from '@opentrons/shared-data'
import {
  ASPIRATE_OFFSET_FROM_BOTTOM_MM,
  blowoutHelper,
  DEFAULT_PIPETTE,
  delayCommand,
  delayWithOffset,
  DEST_LABWARE,
  dropTipHelper,
  getErrorResult,
  getFlowRateAndOffsetParamsTransferLike,
  getRobotInitialStateNoTipsRemain,
  getRobotStateWithTipStandard,
  getSuccessResult,
  makeAirGapHelper,
  makeAspirateHelper,
  makeContext,
  makeDispenseHelper,
  makeDispenseAirGapHelper,
  makeTouchTipHelper,
  pickUpTipHelper,
  SOURCE_LABWARE,
  blowoutInPlaceHelper,
  makeMoveToWellHelper,
} from '../fixtures'
import { distribute } from '../commandCreators/compound/distribute'
import type { CreateCommand, LabwareDefinition2 } from '@opentrons/shared-data'
import type { DistributeArgs, InvariantContext, RobotState } from '../types'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '../utils/misc'

const dispenseAirGapHelper = makeDispenseAirGapHelper({
  wellLocation: {
    origin: 'bottom',
    offset: {
      x: 0,
      y: 0,
      z: 11.54,
    },
  },
})
const aspirateHelper = makeAspirateHelper()
const dispenseHelper = makeDispenseHelper()
const touchTipHelper = makeTouchTipHelper()
// TODO: Ian 2019-06-14 more elegant way to test the blowout offset calculation
const BLOWOUT_OFFSET_ANY: any = expect.any(Number)

let mixinArgs: Partial<DistributeArgs>
let invariantContext: InvariantContext
let robotStateWithTip: RobotState
let robotInitialStateNoTipsRemain: RobotState
let blowoutSingleToTrash: CreateCommand[]
let blowoutSingleToSourceA1: CreateCommand
let blowoutSingleToDestA4: CreateCommand
let blowoutSingleToDestA3: CreateCommand

beforeEach(() => {
  mixinArgs = {
    ...getFlowRateAndOffsetParamsTransferLike(),
    commandCreatorFnName: 'distribute',
    name: 'distribute test',
    description: 'test blah blah',
    tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
    pipette: DEFAULT_PIPETTE,
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,

    preWetTip: false,
    touchTipAfterAspirate: false,
    disposalVolume: 60,
    blowoutLocation: FIXED_TRASH_ID,
    mixBeforeAspirate: null,
    aspirateDelay: null,
    dispenseDelay: null,
    aspirateAirGapVolume: null,
    touchTipAfterDispense: false,
    dropTipLocation: FIXED_TRASH_ID,
    aspirateXOffset: 0,
    dispenseXOffset: 0,
    aspirateYOffset: 0,
    dispenseYOffset: 0,
  }
  blowoutSingleToTrash = blowoutInPlaceHelper()
  blowoutSingleToSourceA1 = blowoutHelper(SOURCE_LABWARE, {
    wellLocation: {
      origin: 'top',
      offset: {
        z: BLOWOUT_OFFSET_ANY,
      },
    },
  })
  blowoutSingleToDestA4 = blowoutHelper(DEST_LABWARE, {
    wellLocation: {
      origin: 'top',
      offset: {
        z: BLOWOUT_OFFSET_ANY,
      },
    },
    wellName: 'A4',
  })
  blowoutSingleToDestA3 = blowoutHelper(DEST_LABWARE, {
    wellLocation: {
      origin: 'top',
      offset: {
        z: BLOWOUT_OFFSET_ANY,
      },
    },
    wellName: 'A3',
  })

  invariantContext = makeContext()
  robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
  robotInitialStateNoTipsRemain = getRobotInitialStateNoTipsRemain(
    invariantContext
  )
})

describe('distribute: minimal example', () => {
  it('single channel; 60uL from A1 -> A2, A3; no tip pickup', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 60,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 180),
      dispenseHelper('A2', 60),
      dispenseHelper('A3', 60),
      ...blowoutSingleToTrash,
    ])
  })
})

describe('tip handling for multiple distribute chunks', () => {
  it('changeTip: "once"', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'once',
      volume: 90,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      ...dropTipHelper(),
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      ...blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),

      ...blowoutSingleToTrash,
    ])
  })

  it('changeTip: "always"', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 90,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      ...dropTipHelper(),
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      ...blowoutSingleToTrash,

      // next chunk, change tip
      ...dropTipHelper(),
      pickUpTipHelper('B1'),
      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      ...blowoutSingleToTrash,
    ])
  })

  it('changeTip: "never" with carried-over tip', () => {
    // NOTE: this has been used as BASE CASE for the "advanced settings" tests
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      ...blowoutSingleToTrash,
      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      ...blowoutSingleToTrash,
    ])
  })

  it('changeTip: "never" should fail with no initial tip', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'always',
      volume: 150,
      tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotInitialStateNoTipsRemain
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'INSUFFICIENT_TIPS',
    })
  })
})

describe('advanced settings: volume, mix, pre-wet tip, tip touch, tip position', () => {
  let mixCommandsWithDelay: CreateCommand[]
  beforeEach(() => {
    mixCommandsWithDelay = [
      aspirateHelper('A1', 35),
      delayCommand(11),
      dispenseHelper('A1', 35, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      delayCommand(12),
    ]
  })
  it('should mix before aspirate, then aspirate disposal volume', () => {
    // NOTE this also tests "uneven final chunk" eg A6 in [A2 A3 | A4 A5 | A6]
    // which is especially relevant to disposal volume
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5', 'A6'],
      changeTip: 'never',
      volume: 120,
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 12,
      blowoutLocation: SOURCE_LABWARE,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    const aspirateVol = 120 * 2 + 12
    const mixCommands = [
      // mix 1
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      // mix 2
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
    ]
    expect(res.commands).toEqual([
      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A2', 120),
      dispenseHelper('A3', 120),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A4', 120),
      dispenseHelper('A5', 120),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', 120 + 12),
      dispenseHelper('A6', 120),
      blowoutSingleToSourceA1,
    ])
  })

  // TODO(IL, 2020-02-28): pre-wet volume is not implemented for distribute! #5122
  //
  // TODO(IL, 2020-08-18): don't forget to add delay tests for pre-wet when that is implemented
  it.todo('should pre-wet tip')
  // (() => {
  //   const distributeArgs: DistributeArgs = {
  //     ...mixinArgs,
  //     sourceWell: 'A1',
  //     destWells: ['A2', 'A3', 'A4', 'A5'],
  //     changeTip: 'never',
  //     volume: 150,
  //     preWetTip: true,
  //   }
  //   const result = distribute(
  //     distributeArgs,
  //     invariantContext,
  //     robotStateWithTip
  //   )
  //   const res = getSuccessResult(result)

  //   const preWetVolume = 42 // TODO what is pre-wet volume?

  //   const preWetTipCommands = [
  //     aspirateHelper('A1', preWetVolume),
  //     dispenseHelper('A1', preWetVolume, { labware: SOURCE_LABWARE }),
  //   ]

  //   expect(res.commands).toEqual([
  //     ...preWetTipCommands,
  //     aspirateHelper('A1', 300),
  //     dispenseHelper('A2', 150),
  //     dispenseHelper('A3', 150),
  //     blowoutSingleToTrash,
  //     ...preWetTipCommands,
  //     aspirateHelper('A1', 300),
  //     dispenseHelper('A4', 150),
  //     dispenseHelper('A5', 150),
  //     blowoutSingleToTrash,
  //   ])
  // })

  it('should delay after aspirate', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      // no blowout
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 300),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),
      dispenseHelper('A4', 100),

      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A5', 100),
    ])
  })
  it('should delay after air gap aspirate and regular aspirate', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),
      delayCommand(12),

      dispenseAirGapHelper('A2', 5),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),

      aspirateHelper('A1', 200),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),
      delayCommand(12),
      dispenseAirGapHelper('A4', 5),
      dispenseHelper('A4', 100),
      dispenseHelper('A5', 100),
    ])
  })

  it('should air gap after aspirate and break into two chunks', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),
      dispenseAirGapHelper('A2', 5),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),

      aspirateHelper('A1', 200),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),
      dispenseAirGapHelper('A4', 5),
      dispenseHelper('A4', 100),
      dispenseHelper('A5', 100),
    ])
  })

  it('should delay after air gap dispense and regular dispense', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      aspirateAirGapVolume: 5,
      // no blowout
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 200),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),

      dispenseAirGapHelper('A2', 5),
      delayCommand(12),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),

      aspirateHelper('A1', 200),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),

      dispenseAirGapHelper('A4', 5),
      delayCommand(12),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),
      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })

  it('should delay after mix aspirate and regular aspirate', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 0,
    } as DistributeArgs

    mixCommandsWithDelay = [
      // mix 1
      aspirateHelper('A1', 50),
      delayCommand(12),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      // mix 2
      aspirateHelper('A1', 50),
      delayCommand(12),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
    ]

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      ...mixCommandsWithDelay,
      aspirateHelper('A1', 300),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A2', 100),
      dispenseHelper('A3', 100),
      dispenseHelper('A4', 100),

      ...mixCommandsWithDelay,
      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      dispenseHelper('A5', 100),
    ])
  })

  it('should touch tip after aspirate', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterAspirate: true,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      touchTipHelper('A1'),
      dispenseHelper('A2', 90),
      dispenseHelper('A3', 90),
      ...blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      touchTipHelper('A1'),
      dispenseHelper('A4', 90),
      dispenseHelper('A5', 90),
      ...blowoutSingleToTrash,
    ])
  })

  it('should touch tip after dispense', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 90,
      touchTipAfterDispense: true,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 240),
      dispenseHelper('A2', 90),
      touchTipHelper('A2', { labwareId: DEST_LABWARE }),
      dispenseHelper('A3', 90),
      touchTipHelper('A3', { labwareId: DEST_LABWARE }),
      ...blowoutSingleToTrash,

      aspirateHelper('A1', 240),
      dispenseHelper('A4', 90),
      touchTipHelper('A4', { labwareId: DEST_LABWARE }),
      dispenseHelper('A5', 90),
      touchTipHelper('A5', { labwareId: DEST_LABWARE }),
      ...blowoutSingleToTrash,
    ])
  })

  it('should mix before aspirate w/ disposal vol', () => {
    const volume = 130
    const disposalVolume = 20
    const aspirateVol = volume * 2 + disposalVolume
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume,
      mixBeforeAspirate: {
        volume: 250,
        times: 2,
      },
      disposalVolume,
      blowoutLocation: SOURCE_LABWARE,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const mixCommands = [
      // mix 1
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      // mix 2
      aspirateHelper('A1', 250),
      dispenseHelper('A1', 250, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
    ]

    expect(res.commands).toEqual([
      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A2', volume),
      dispenseHelper('A3', volume),
      blowoutSingleToSourceA1,

      ...mixCommands,
      aspirateHelper('A1', aspirateVol),
      dispenseHelper('A4', volume),
      dispenseHelper('A5', volume),
      blowoutSingleToSourceA1,
    ])
  })

  it('should delay after dispense', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      // no blowout
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 300),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),

      aspirateHelper('A1', 100),
      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })
  it('should delay after mix dispense AND regular dispense', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3', 'A4', 'A5'],
      changeTip: 'never',
      volume: 100,
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      mixBeforeAspirate: { times: 2, volume: 50 },
      disposalVolume: 0,
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getSuccessResult(result)

    const mixCommandsWithDelay = [
      // mix 1
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      delayCommand(12),
      // mix 2
      aspirateHelper('A1', 50),
      dispenseHelper('A1', 50, {
        labwareId: SOURCE_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      delayCommand(12),
    ]
    expect(res.commands).toEqual([
      ...mixCommandsWithDelay,
      aspirateHelper('A1', 300),
      dispenseHelper('A2', 100),
      ...delayWithOffset('A2', DEST_LABWARE),
      dispenseHelper('A3', 100),
      ...delayWithOffset('A3', DEST_LABWARE),
      dispenseHelper('A4', 100),
      ...delayWithOffset('A4', DEST_LABWARE),

      ...mixCommandsWithDelay,
      aspirateHelper('A1', 100),

      dispenseHelper('A5', 100),
      ...delayWithOffset('A5', DEST_LABWARE),
    ])
  })

  describe('all advanced settings enabled', () => {
    let allArgs: Partial<DistributeArgs>
    beforeEach(() => {
      allArgs = {
        ...mixinArgs,
        sourceWell: 'A1',
        destWells: ['B1', 'B2'],
        changeTip: 'never',
        volume: 45,
        // aspirate column
        preWetTip: true,
        mixBeforeAspirate: {
          volume: 35,
          times: 1,
        },
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        touchTipAfterDispense: true,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 3,
      }
    })
    it('should create commands in the expected order with expected params', () => {
      const args = {
        ...mixinArgs,
        sourceWell: 'A1',
        destWells: ['B1', 'B2'],
        changeTip: 'never',
        volume: 45,
        // aspirate column
        preWetTip: true,
        mixBeforeAspirate: {
          volume: 35,
          times: 1,
        },
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        touchTipAfterDispense: true,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // mix (asp)
        aspirateHelper('A1', 35),
        delayCommand(11),
        dispenseHelper('A1', 35, {
          labwareId: SOURCE_LABWARE,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
            },
          },
        }),
        delayCommand(12),
        // aspirate
        aspirateHelper('A1', 150),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('B1', 31),
        delayCommand(12),
        dispenseHelper('B1', 45),
        ...delayWithOffset('B1', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('B1', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('B2', 45),
        ...delayWithOffset('B2', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('B2', { labwareId: DEST_LABWARE }),
        // blowout
        ...blowoutSingleToTrash,
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: 'fixedTrash',
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to pickup tip/drop tip since change tip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout into trash since we are not changing tip
        ...blowoutSingleToTrash,
        // next chunk from A1: remaining volume
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        // dispense #3
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        ...blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: 'fixedTrash',
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip since change tip is always
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        ...blowoutSingleToTrash,
        // dispense > air gap since we are about to change the tip
        makeMoveToWellHelper('A3', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        ...blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        // skip blowout into trash b/c we're about to drop tip anyway
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in trash, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: 'fixedTrash',
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip at the beginning of the step
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        ...blowoutSingleToTrash,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        ...blowoutSingleToTrash,
        // use the dispense > air gap here before moving to trash
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to replace tip since change tip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // use the dispense > air gap here before moving to trash since it is the final dispense in the step
        // dispense > air gap from source since blowout location is source
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is source so need to blowout
        blowoutSingleToSourceA1,
        // dispense > air gap so no liquid drops off the tip as pipette moves from source well to trash
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(3),
        // delay after aspirating air
        delayCommand(11),
        // just drop the tip in the trash
        ...dropTipHelper(),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // blowout location is source so need to blowout
        blowoutSingleToSourceA1,
        // dispense > air gap so no liquid drops off the tip as pipette moves from source well to trash
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in source, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is source so we gotta blowout
        blowoutSingleToSourceA1,
        // skip dispense > air gap since tip is being reused
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        blowoutSingleToSourceA1,
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, reuse tip)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'never',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // no need to replace tip since changeTip is never
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // skip dispense > air gap since we are reusing the tip
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA4,
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'always',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // dispense > air gap so no liquid drops off the tip as pipette moves from destination well to trash
        makeMoveToWellHelper('A3', DEST_LABWARE),
        makeAirGapHelper(3),
        // dispense delay
        delayCommand(11),
        // just drop the tip in the trash
        ...dropTipHelper(),
        // next chunk from A1: remaining volume
        pickUpTipHelper('B1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        blowoutSingleToDestA4,
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
    it('should create commands in the expected order with expected params (blowout in dest, change tip once)', () => {
      const args = {
        ...allArgs,
        volume: 100,
        sourceWell: 'A1',
        destWells: ['A2', 'A3', 'A4'],
        changeTip: 'once',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      } as DistributeArgs

      const result = distribute(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // replace tip
        ...dropTipHelper(),
        pickUpTipHelper('A1'),
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate
        aspirateHelper('A1', 260),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #1
        dispenseAirGapHelper('A2', 31),
        delayCommand(12),
        dispenseHelper('A2', 100),
        ...delayWithOffset('A2', DEST_LABWARE),
        // touch tip (disp #1)
        touchTipHelper('A2', { labwareId: DEST_LABWARE }),
        // dispense #2
        dispenseHelper('A3', 100),
        ...delayWithOffset('A3', DEST_LABWARE),
        // touch tip (disp #2)
        touchTipHelper('A3', { labwareId: DEST_LABWARE }),
        // blowout location is dest so we gotta blowout
        blowoutSingleToDestA3,
        // skip dispense > air gap since tip is being reused
        // mix (asp)
        ...mixCommandsWithDelay,
        // aspirate 100 liquid + 60 for disposal vol
        aspirateHelper('A1', 160),
        ...delayWithOffset('A1', SOURCE_LABWARE, 11, 15),
        // touch tip (asp)
        touchTipHelper('A1', {
          wellLocation: {
            origin: 'top',
            offset: {
              z: -14.5,
            },
          },
        }),
        // aspirate > air gap
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(31),
        delayCommand(11),
        // dispense #3
        dispenseAirGapHelper('A4', 31),
        delayCommand(12),
        dispenseHelper('A4', 100),
        ...delayWithOffset('A4', DEST_LABWARE),
        // touch tip (disp #3)
        touchTipHelper('A4', { labwareId: DEST_LABWARE }),
        // blowout location is dest so need to blowout
        blowoutSingleToDestA4,
        // use the dispense > air gap here before moving to trash
        // since it is the final dispense in the step
        makeMoveToWellHelper('A4', DEST_LABWARE),
        makeAirGapHelper(3),
        delayCommand(11),
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })
  })
})

describe('invalid input + state errors', () => {
  it('invalid pipette ID should throw error', () => {
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip: 'never',
      volume: 100,
      pipette: 'no-such-pipette-id-here',
    } as DistributeArgs

    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'PIPETTE_DOES_NOT_EXIST',
    })
  })
})

it('should return an error for the labware already being discarded in previous step', () => {
  const mockWasteChuteId = 'mockWasteChuteId'
  const wasteChuteInvariantContext = {
    ...invariantContext,
    additionalEquipmentEntities: {
      ...invariantContext.additionalEquipmentEntities,
      mockWasteChuteId: {
        name: 'wasteChute',
        id: mockWasteChuteId,
        location: WASTE_CHUTE_CUTOUT,
      },
    },
  } as InvariantContext

  robotStateWithTip.labware = {
    [SOURCE_LABWARE]: { slot: 'gripperWasteChute' },
  }

  const distributeArgs = {
    ...mixinArgs,
    sourceWell: 'A1',
    destWells: ['A2', 'A3'],
    changeTip: 'always',
    volume: 100,
  } as DistributeArgs

  const result = distribute(
    distributeArgs,
    wasteChuteInvariantContext,
    robotStateWithTip
  )
  expect(getErrorResult(result).errors).toHaveLength(1)
  expect(getErrorResult(result).errors[0]).toMatchObject({
    type: 'LABWARE_DISCARDED_IN_WASTE_CHUTE',
  })
})

describe('distribute volume exceeds pipette max volume', () => {
  it(`no disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 350,
      disposalVolume: null,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })

  it(`with disposal volume`, () => {
    const changeTip = 'once'
    const distributeArgs = {
      ...mixinArgs,
      sourceWell: 'A1',
      destWells: ['A2', 'A3'],
      changeTip,
      volume: 250,
      disposalVolume: 100,
    } as DistributeArgs
    const result = distribute(
      distributeArgs,
      invariantContext,
      robotStateWithTip
    )
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_VOLUME_EXCEEDED')
  })
})
