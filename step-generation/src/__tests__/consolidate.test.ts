import { beforeEach, describe, it, expect } from 'vitest'
import { getLabwareDefURI, fixtureTiprack300ul } from '@opentrons/shared-data'
import { consolidate } from '../commandCreators/compound/consolidate'
import { FIXED_TRASH_ID } from '../constants'
import {
  ASPIRATE_OFFSET_FROM_BOTTOM_MM,
  DEFAULT_PIPETTE,
  delayCommand,
  delayWithOffset,
  DEST_LABWARE,
  DISPENSE_OFFSET_FROM_BOTTOM_MM,
  dropTipHelper,
  getErrorResult,
  getFlowRateAndOffsetParamsTransferLike,
  getInitialRobotStateStandard,
  getRobotStatePickedUpTipStandard,
  getSuccessResult,
  makeAirGapHelper,
  makeAspirateHelper,
  makeContext,
  makeDispenseHelper,
  makeTouchTipHelper,
  pickUpTipHelper,
  SOURCE_LABWARE,
  blowoutInPlaceHelper,
  makeMoveToWellHelper,
} from '../fixtures'
import { DEST_WELL_BLOWOUT_DESTINATION } from '../utils'
import type {
  AspDispAirgapParams,
  CreateCommand,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { ConsolidateArgs, InvariantContext, RobotState } from '../types'

const aspirateHelper = makeAspirateHelper()
const dispenseHelper = makeDispenseHelper()
const touchTipHelper = makeTouchTipHelper()
function tripleMix(
  wellName: string,
  volume: number,
  params: Partial<AspDispAirgapParams>,
  delayParams: {
    delayAfterAspirate?: boolean
    delayAfterDispense?: boolean
  } = {}
): CreateCommand[] {
  const { delayAfterAspirate, delayAfterDispense } = delayParams

  return [...Array(3)].reduce(
    (acc, _) => [
      ...acc,
      aspirateHelper(wellName, volume, params),
      ...(delayAfterAspirate ? [delayCommand(12)] : []),
      dispenseHelper(wellName, volume, params),
      ...(delayAfterDispense ? [delayCommand(12)] : []),
    ],
    []
  )
}

let invariantContext: InvariantContext
let initialRobotState: RobotState
let robotStatePickedUpOneTip: RobotState
let mixinArgs: Partial<ConsolidateArgs>

beforeEach(() => {
  invariantContext = makeContext()

  initialRobotState = getInitialRobotStateStandard(invariantContext)
  robotStatePickedUpOneTip = getRobotStatePickedUpTipStandard(invariantContext)

  mixinArgs = {
    ...getFlowRateAndOffsetParamsTransferLike(),
    // `volume` and `changeTip` should be explicit in tests,
    // those fields intentionally omitted from here
    commandCreatorFnName: 'consolidate',
    name: 'Consolidate Test',
    description: 'test blah blah',
    pipette: DEFAULT_PIPETTE,

    sourceWells: ['A1', 'A2', 'A3', 'A4'],
    destWell: 'B1',
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,

    preWetTip: false,
    touchTipAfterAspirate: false,
    mixFirstAspirate: null,
    aspirateDelay: null,
    dispenseDelay: null,
    aspirateAirGapVolume: null,
    touchTipAfterDispense: false,
    mixInDestination: null,
    blowoutLocation: null,
    dropTipLocation: FIXED_TRASH_ID,
    tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
    aspirateXOffset: 0,
    dispenseXOffset: 0,
    aspirateYOffset: 0,
    dispenseYOffset: 0,
  }
})

describe('consolidate single-channel', () => {
  it('Minimal single-channel: A1 A2 to B1, 50uL with p300', () => {
    const data = {
      ...mixinArgs,
      sourceWells: ['A1', 'A2'],
      volume: 50,
      changeTip: 'once',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 50),
      aspirateHelper('A2', 50),
      dispenseHelper('B1', 100),
    ])
  })

  it('Minimal single-channel: A1 A2 to B1, 50uL with p300, drop in waste chute', () => {
    const data = {
      ...mixinArgs,
      sourceWells: ['A1', 'A2'],
      volume: 50,
      changeTip: 'once',
      dropTipLocation: 'wasteChuteId',
      dispenseAirGapVolume: 5,
    } as ConsolidateArgs

    invariantContext = {
      ...invariantContext,
      additionalEquipmentEntities: {
        wasteChuteId: {
          name: 'wasteChute',
          id: 'wasteChuteId',
          location: 'cutoutD3',
        },
      },
    }

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 50),
      aspirateHelper('A2', 50),
      dispenseHelper('B1', 100),
      makeMoveToWellHelper('B1', DEST_LABWARE),
      makeAirGapHelper(5),
    ])
  })

  it('Single-channel with exceeding pipette max: A1 A2 A3 A4 to B1, 150uL with p300', () => {
    // TODO Ian 2018-05-03 is this a duplicate of exceeding max with changeTip="once"???
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
    ])
  })

  it('Single-channel with exceeding pipette max: with changeTip="always"', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'always',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),
      ...dropTipHelper(),

      pickUpTipHelper('B1'),
      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
    ])
  })

  it('Single-channel with exceeding pipette max: with changeTip="once"', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
    ])
  })

  it('Single-channel with exceeding pipette max: with changeTip="never"', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'never',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, robotStatePickedUpOneTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
    ])
  })

  it('mix on aspirate should mix before aspirate in first well of chunk only, and tip position bound to labware', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      mixFirstAspirate: { times: 3, volume: 50 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      ...tripleMix('A1', 50, {
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

      aspirateHelper('A1', 100),
      aspirateHelper('A2', 100),
      aspirateHelper('A3', 100),
      dispenseHelper('B1', 300),

      ...tripleMix('A4', 50, {
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

      aspirateHelper('A4', 100),
      dispenseHelper('B1', 100),
    ])
  })

  it('should delay after mix aspirate AND regular aspirate in first well of chunk only', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      mixFirstAspirate: { times: 3, volume: 50 },
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      ...tripleMix(
        'A1',
        50,
        {
          labwareId: SOURCE_LABWARE,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
            },
          },
        },
        { delayAfterAspirate: true }
      ),

      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      aspirateHelper('A2', 100),
      ...delayWithOffset('A2', SOURCE_LABWARE),
      aspirateHelper('A3', 100),
      ...delayWithOffset('A3', SOURCE_LABWARE),
      dispenseHelper('B1', 300),

      ...tripleMix(
        'A4',
        50,
        {
          labwareId: SOURCE_LABWARE,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: ASPIRATE_OFFSET_FROM_BOTTOM_MM,
            },
          },
        },
        { delayAfterAspirate: true }
      ),

      aspirateHelper('A4', 100),
      ...delayWithOffset('A4', SOURCE_LABWARE),
      dispenseHelper('B1', 100),
    ])
  })

  it('should mix on aspirate', () => {
    const data = {
      ...mixinArgs,
      volume: 125,
      changeTip: 'once',
      mixFirstAspirate: { times: 3, volume: 50 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      // Start mix
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
      // done mix
      aspirateHelper('A1', 125),
      aspirateHelper('A2', 125),
      dispenseHelper('B1', 250),

      // Start mix
      aspirateHelper('A3', 50),
      dispenseHelper('A3', 50, {
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
      aspirateHelper('A3', 50),
      dispenseHelper('A3', 50, {
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
      aspirateHelper('A3', 50),
      dispenseHelper('A3', 50, {
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
      // done mix

      aspirateHelper('A3', 125),
      aspirateHelper('A4', 125),
      dispenseHelper('B1', 250),
    ])
  })

  it('should mix after dispense', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      mixInDestination: { times: 3, volume: 53 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 100),
      aspirateHelper('A2', 100),
      aspirateHelper('A3', 100),
      dispenseHelper('B1', 300),

      ...tripleMix('B1', 53, {
        labwareId: DEST_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),

      aspirateHelper('A4', 100),
      dispenseHelper('B1', 100),

      ...tripleMix('B1', 53, {
        labwareId: DEST_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
    ])
  })

  it('should delay after mix dispense AND regular dispense', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      mixInDestination: { times: 3, volume: 53 },
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 100),
      aspirateHelper('A2', 100),
      aspirateHelper('A3', 100),
      dispenseHelper('B1', 300),
      ...delayWithOffset('B1', DEST_LABWARE),
      ...tripleMix(
        'B1',
        53,
        {
          labwareId: DEST_LABWARE,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
            },
          },
        },
        { delayAfterDispense: true }
      ),

      aspirateHelper('A4', 100),
      dispenseHelper('B1', 100),
      ...delayWithOffset('B1', DEST_LABWARE),

      ...tripleMix(
        'B1',
        53,
        {
          labwareId: DEST_LABWARE,
          wellLocation: {
            origin: 'bottom',
            offset: {
              x: 0,
              y: 0,
              z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
            },
          },
        },
        { delayAfterDispense: true }
      ),
    ])
  })

  it('should mix after dispense with blowout to trash: first mix, then blowout', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      mixInDestination: { times: 3, volume: 54 },
      blowoutLocation: FIXED_TRASH_ID,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 100),
      aspirateHelper('A2', 100),
      aspirateHelper('A3', 100),
      dispenseHelper('B1', 300),

      ...tripleMix('B1', 54, {
        labwareId: DEST_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      ...blowoutInPlaceHelper(),
      aspirateHelper('A4', 100),
      dispenseHelper('B1', 100),

      ...tripleMix('B1', 54, {
        labwareId: DEST_LABWARE,
        wellLocation: {
          origin: 'bottom',
          offset: {
            x: 0,
            y: 0,
            z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
          },
        },
      }),
      ...blowoutInPlaceHelper(),
    ])
  })

  it('"pre-wet tip" should aspirate and dispense consolidate volume from first well of each chunk', () => {
    // TODO LATER Ian 2018-02-13 Should it be 2/3 max volume instead?
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      preWetTip: true,
      sourceWells: ['A1', 'A2', 'A3', 'A4'],
    } as ConsolidateArgs

    const preWetVol = data.volume // NOTE same as volume above... for now

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      // pre-wet tip
      aspirateHelper('A1', preWetVol),
      dispenseHelper('A1', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),

      // pre-wet tip, now with A3
      aspirateHelper('A3', preWetVol),
      dispenseHelper('A3', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
    ])
  })

  it('pre-wet tip should use the aspirate delay when specified', () => {
    // TODO LATER Ian 2018-02-13 Should it be 2/3 max volume instead?
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      preWetTip: true,
      sourceWells: ['A1', 'A2', 'A3', 'A4'],
      aspirateDelay: { mmFromBottom: 14, seconds: 12 },
    } as ConsolidateArgs

    const preWetVol = data.volume // NOTE same as volume above... for now

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      // pre-wet tip
      aspirateHelper('A1', preWetVol),
      delayCommand(12),
      dispenseHelper('A1', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A1', 150),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      aspirateHelper('A2', 150),
      ...delayWithOffset('A2', SOURCE_LABWARE),
      dispenseHelper('B1', 300),

      // pre-wet tip, now with A3
      aspirateHelper('A3', preWetVol),
      delayCommand(12),
      dispenseHelper('A3', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A3', 150),
      ...delayWithOffset('A3', SOURCE_LABWARE),
      aspirateHelper('A4', 150),
      ...delayWithOffset('A4', SOURCE_LABWARE),
      dispenseHelper('B1', 300),
    ])
  })

  it('pre-wet tip should use the dispense delay when specified', () => {
    // TODO LATER Ian 2018-02-13 Should it be 2/3 max volume instead?
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      preWetTip: true,
      sourceWells: ['A1', 'A2', 'A3', 'A4'],
      dispenseDelay: { mmFromBottom: 14, seconds: 12 },
    } as ConsolidateArgs

    const preWetVol = data.volume // NOTE same as volume above... for now

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      // pre-wet tip
      aspirateHelper('A1', preWetVol),
      dispenseHelper('A1', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),
      ...delayWithOffset('B1', DEST_LABWARE),

      // pre-wet tip, now with A3
      aspirateHelper('A3', preWetVol),
      dispenseHelper('A3', preWetVol, {
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
      // done pre-wet

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
      ...delayWithOffset('B1', DEST_LABWARE),
    ])
  })

  it('should delay after aspirate', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'never',
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, robotStatePickedUpOneTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 150),
      ...delayWithOffset('A1', SOURCE_LABWARE),

      aspirateHelper('A2', 150),
      ...delayWithOffset('A2', SOURCE_LABWARE),

      dispenseHelper('B1', 300),

      aspirateHelper('A3', 150),
      ...delayWithOffset('A3', SOURCE_LABWARE),

      aspirateHelper('A4', 150),
      ...delayWithOffset('A4', SOURCE_LABWARE),

      dispenseHelper('B1', 300),
    ])
  })

  it('should delay after air gap aspirate and regular aspirate', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      changeTip: 'once',
      aspirateAirGapVolume: 5,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    // break into single chunks because volume + air gap volume is too big for multi aspirate

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 100),
      ...delayWithOffset('A1', SOURCE_LABWARE),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),
      delayCommand(12),

      aspirateHelper('A2', 100),
      ...delayWithOffset('A2', SOURCE_LABWARE),
      makeMoveToWellHelper('A2'),
      makeAirGapHelper(5),
      delayCommand(12),

      dispenseHelper('B1', 210),

      aspirateHelper('A3', 100),
      ...delayWithOffset('A3', SOURCE_LABWARE),
      makeMoveToWellHelper('A3'),
      makeAirGapHelper(5),
      delayCommand(12),

      aspirateHelper('A4', 100),
      ...delayWithOffset('A4', SOURCE_LABWARE),
      makeMoveToWellHelper('A4'),
      makeAirGapHelper(5),
      delayCommand(12),

      dispenseHelper('B1', 210),
    ])
  })

  it('should delay after dispense', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'never',
      dispenseDelay: { seconds: 12, mmFromBottom: 14 },
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, robotStatePickedUpOneTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),
      dispenseHelper('B1', 300),
      ...delayWithOffset('B1', DEST_LABWARE),

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),
      dispenseHelper('B1', 300),
      ...delayWithOffset('B1', DEST_LABWARE),
    ])
  })

  it('touchTip after aspirate should touch tip after every aspirate command', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      touchTipAfterAspirate: true,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    const touchTipAfterAsp = {
      wellLocation: {
        origin: 'top' as const,
        offset: {
          z: mixinArgs.touchTipAfterAspirateOffsetMmFromTop,
        },
      },
    }
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 150),
      touchTipHelper('A1', touchTipAfterAsp),

      aspirateHelper('A2', 150),
      touchTipHelper('A2', touchTipAfterAsp),

      dispenseHelper('B1', 300),

      aspirateHelper('A3', 150),
      touchTipHelper('A3', touchTipAfterAsp),

      aspirateHelper('A4', 150),
      touchTipHelper('A4', touchTipAfterAsp),

      dispenseHelper('B1', 300),
    ])
  })

  it('touchTip after dispense should touch tip after dispense on destination well', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      touchTipAfterDispense: true,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    const touchTipAfterDisp = {
      labwareId: DEST_LABWARE,
      wellLocation: {
        origin: 'top' as const,
        offset: {
          z: mixinArgs.touchTipAfterDispenseOffsetMmFromTop,
        },
      },
    }
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 150),
      aspirateHelper('A2', 150),

      dispenseHelper('B1', 300),
      touchTipHelper('B1', touchTipAfterDisp),

      aspirateHelper('A3', 150),
      aspirateHelper('A4', 150),

      dispenseHelper('B1', 300),
      touchTipHelper('B1', touchTipAfterDisp),
    ])
  })

  it('invalid pipette ID should return error', () => {
    const data = {
      ...mixinArgs,
      sourceWells: ['A1', 'A2'],
      volume: 150,
      changeTip: 'once',
      pipette: 'no-such-pipette-id-here',
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0].type).toEqual('PIPETTE_DOES_NOT_EXIST')
  })

  it('should air gap after aspirate and dispense all air + liquid at once', () => {
    const data = {
      ...mixinArgs,
      volume: 100,
      changeTip: 'once',
      aspirateAirGapVolume: 5,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    // break into single chunks because volume + air gap volume is too big for multi aspirate

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 100),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),

      aspirateHelper('A2', 100),
      makeMoveToWellHelper('A2'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 210),

      aspirateHelper('A3', 100),
      makeMoveToWellHelper('A3'),
      makeAirGapHelper(5),

      aspirateHelper('A4', 100),
      makeMoveToWellHelper('A4'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 210),
    ])
  })

  it('should air gap after aspirate and break into single chunks and dispense all air + liquid at once', () => {
    const data = {
      ...mixinArgs,
      volume: 150,
      changeTip: 'once',
      aspirateAirGapVolume: 5,
    } as ConsolidateArgs

    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    // break into single chunks because volume + air gap volume is too big for multi aspirate

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 150),
      makeMoveToWellHelper('A1'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 155),

      aspirateHelper('A2', 150),
      makeMoveToWellHelper('A2'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 155),

      aspirateHelper('A3', 150),
      makeMoveToWellHelper('A3'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 155),

      aspirateHelper('A4', 150),
      makeMoveToWellHelper('A4'),
      makeAirGapHelper(5),

      dispenseHelper('B1', 155),
    ])
  })

  describe('all advanced settings enabled', () => {
    it('should create commands in the expected order with expected params (changeTip: never, blowout in trash)', () => {
      const args = {
        ...mixinArgs,
        sourceWells: ['A1', 'A2', 'A3'],
        destWellName: 'B1',
        changeTip: 'never',
        volume: 100,
        // aspirate column
        preWetTip: true,
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        mixInDestination: {
          volume: 36,
          times: 1,
        },
        touchTipAfterDispense: true,
        blowoutLocation: 'fixedTrash',
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 35,
      } as ConsolidateArgs

      const result = consolidate(
        args,
        invariantContext,
        robotStatePickedUpOneTip
      )
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // Pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // First aspirate: source well A1
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Air Gap: after aspirating from A1
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Second aspirate: source well A2
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A2
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31+100+31 = 262uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 262,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to trash
        ...blowoutInPlaceHelper(),
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },

        // No Dispense > Air Gap here because we're re-using the tip
        // for the next chunk

        // Second chunk: source well A3
        // pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // actual aspirate A3
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A3
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31 = 131uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 131,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to trash
        ...blowoutInPlaceHelper(),
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },
        // Dispense > air gap in dest well
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },

        // we used dispense > air gap, so we will dispose of the tip
        ...dropTipHelper(),
      ])
    })

    it('should create commands in the expected order with expected params (changeTip: once, blowout in dest)', () => {
      const args = {
        ...mixinArgs,
        sourceWells: ['A1', 'A2', 'A3'],
        destWellName: 'B1',
        changeTip: 'once',
        volume: 100,
        // aspirate column
        preWetTip: true,
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        mixInDestination: {
          volume: 36,
          times: 1,
        },
        touchTipAfterDispense: true,
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 35,
      } as ConsolidateArgs

      const result = consolidate(args, invariantContext, initialRobotState)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // pick up tip
        {
          commandType: 'pickUpTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'tiprack1Id',
            wellName: 'A1',
          },
        },
        // Pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // First aspirate: source well A1
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Air Gap: after aspirating from A1
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Second aspirate: source well A2
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                x: 0,
                y: 0,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A2
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31+100+31 = 262uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 262,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to dest well
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },

        // No Dispense > Air Gap here because we're re-using the tip
        // for the next chunk

        // Second chunk: source well A3
        // pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // actual aspirate A3
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A3
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31 = 131uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 131,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to dest
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },
        // Dispense > air gap in dest well
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
      ])
    })

    it('should create commands in the expected order with expected params (changeTip: always, blowout in dest)', () => {
      const args = {
        ...mixinArgs,
        sourceWells: ['A1', 'A2', 'A3'],
        destWellName: 'B1',
        changeTip: 'always',
        volume: 100,
        // aspirate column
        preWetTip: true,
        aspirateDelay: { seconds: 11, mmFromBottom: 15 },
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -14.5,
        aspirateAirGapVolume: 31,
        // dispense column
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
        mixInDestination: {
          volume: 36,
          times: 1,
        },
        touchTipAfterDispense: true,
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 35,
      } as ConsolidateArgs

      const result = consolidate(args, invariantContext, initialRobotState)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // pick up tip
        {
          commandType: 'pickUpTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'tiprack1Id',
            wellName: 'A1',
          },
        },
        // Pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // First aspirate: source well A1
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Air Gap: after aspirating from A1
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Second aspirate: source well A2
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A2
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A2',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31+100+31 = 262uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 262,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to dest well
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },

        // Change tip is "always" so we can Dispense > Air Gap here
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // replace tip
        ...dropTipHelper(),
        {
          commandType: 'pickUpTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'tiprack1Id',
            wellName: 'B1',
          },
        },

        // Second chunk: source well A3
        // pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                x: 0,
                y: 0,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // actual aspirate A3
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 100,
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.1,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 15,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -14.5,
              },
            },
          },
        },
        // Aspirate > air gap: after aspirating from A3
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A3',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        // Dispense full air + liquid volume all together to dest well (100+31 = 131uL)
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 131,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 14,
              },
            },
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Mix (disp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 36,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 3.2,
              },
            },
            flowRate: 2.2,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        // Blowout to dest
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // Touch tip (disp)
        {
          commandType: 'touchTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'top',
              offset: {
                z: -3.4,
              },
            },
          },
        },
        // Dispense > air gap in dest well
        {
          commandType: 'moveToWell',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: 11.54,
              },
            },
          },
        },
        {
          commandType: 'airGapInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 11,
          },
        },
      ])
    })
  })
})

describe('consolidate multi-channel', () => {
  const multiParams = { pipetteId: 'p300MultiId' }
  const multiDispense = (wellName: string, volume: number): CreateCommand =>
    dispenseHelper(wellName, volume, {
      labwareId: DEST_LABWARE,
      pipetteId: 'p300MultiId',
    })

  const args: Partial<ConsolidateArgs> = {
    ...getFlowRateAndOffsetParamsTransferLike(),
    commandCreatorFnName: 'consolidate',
    name: 'Consolidate Test',
    description: 'test blah blah',
    pipette: 'p300MultiId',

    sourceWells: ['A1', 'A2', 'A3', 'A4'],
    destWell: 'A12',
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,
    dropTipLocation: FIXED_TRASH_ID,
    // volume and changeTip should be explicit in tests

    preWetTip: false,
    touchTipAfterAspirate: false,
    mixFirstAspirate: null,
    aspirateDelay: null,
    dispenseDelay: null,
    aspirateAirGapVolume: null,
    touchTipAfterDispense: false,
    mixInDestination: null,
    blowoutLocation: null,
  }

  it('simple multi-channel: cols A1 A2 A3 A4 to col A12', () => {
    const data: ConsolidateArgs = {
      ...args,
      volume: 140,
      tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
      changeTip: 'once',
      aspirateXOffset: 0,
      dispenseXOffset: 0,
      aspirateYOffset: 0,
      dispenseYOffset: 0,
    } as ConsolidateArgs
    const result = consolidate(data, invariantContext, initialRobotState)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1', multiParams),
      aspirateHelper('A1', 140, multiParams),
      aspirateHelper('A2', 140, multiParams),
      multiDispense('A12', 280),

      aspirateHelper('A3', 140, multiParams),
      aspirateHelper('A4', 140, multiParams),
      multiDispense('A12', 280),
    ])
  })

  // TODO Ian 2018-03-14: address different multi-channel layouts of plates
  it.todo('multi-channel 384 plate: cols A1 B1 A2 B2 to 96-plate col A12')

  it.todo('multi-channel trough A1 A2 A3 A4 to 96-plate A12')
})
