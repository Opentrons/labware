import { beforeEach, describe, it, expect, test } from 'vitest'
import {
  ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  fixtureTiprack300ul,
  getLabwareDefURI,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
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
  getRobotStateWithTipStandard,
  getSuccessResult,
  makeAirGapHelper,
  makeAspirateHelper,
  makeContext,
  makeDispenseHelper,
  makeTouchTipHelper,
  pickUpTipHelper,
  SOURCE_LABWARE,
  makeDispenseAirGapHelper,
  makeMoveToWellHelper,
} from '../fixtures'
import { FIXED_TRASH_ID } from '../constants'
import {
  DEST_WELL_BLOWOUT_DESTINATION,
  SOURCE_WELL_BLOWOUT_DESTINATION,
} from '../utils/misc'
import { transfer } from '../commandCreators/compound/transfer'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { InvariantContext, RobotState, TransferArgs } from '../types'

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

let invariantContext: InvariantContext
let robotStateWithTip: RobotState
let mixinArgs: Partial<TransferArgs>

beforeEach(() => {
  mixinArgs = {
    ...getFlowRateAndOffsetParamsTransferLike(),
    commandCreatorFnName: 'transfer',
    name: 'Transfer Test',
    description: 'test blah blah',
    pipette: DEFAULT_PIPETTE,
    tipRack: getLabwareDefURI(fixtureTiprack300ul as LabwareDefinition2),
    sourceLabware: SOURCE_LABWARE,
    destLabware: DEST_LABWARE,

    preWetTip: false,
    touchTipAfterAspirate: false,
    mixBeforeAspirate: null,
    aspirateDelay: null,
    dispenseDelay: null,
    aspirateAirGapVolume: null,
    touchTipAfterDispense: false,
    mixInDestination: null,
    blowoutLocation: null,
    dropTipLocation: FIXED_TRASH_ID,
    aspirateXOffset: 0,
    dispenseXOffset: 0,
    aspirateYOffset: 0,
    dispenseYOffset: 0,
  }

  invariantContext = makeContext()
  robotStateWithTip = getRobotStateWithTipStandard(invariantContext)
})

describe('pick up tip if no tip on pipette', () => {
  let noTipArgs: TransferArgs

  beforeEach(() => {
    noTipArgs = {
      ...mixinArgs,
      sourceWells: ['A1'],
      destWells: ['B2'],
      volume: 30,
    } as TransferArgs

    // no tip on pipette
    robotStateWithTip.tipState.pipettes.p300SingleId = false
  })

  const changeTipOptions = ['once', 'always']

  changeTipOptions.forEach(changeTip => {
    it(`...${changeTip}`, () => {
      noTipArgs = {
        ...noTipArgs,
        changeTip,
      } as TransferArgs

      const result = transfer(noTipArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)

      expect(res.commands[0]).toEqual(pickUpTipHelper('A1'))
    })
  })
  it('...once, drop tip in waste chute', () => {
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

    noTipArgs = {
      ...noTipArgs,
      changeTip: 'always',
      dropTipLocation: 'wasteChuteId',
      dispenseAirGapVolume: 5,
    } as TransferArgs

    const result = transfer(noTipArgs, invariantContext, robotStateWithTip)

    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 30),
      dispenseHelper('B2', 30),
      makeMoveToWellHelper('B2', 'destPlateId'),
      makeAirGapHelper(5),
    ])
  })

  it('...never (should not pick up tip, and fail)', () => {
    noTipArgs = {
      ...noTipArgs,
      changeTip: 'never',
    }

    const result = transfer(noTipArgs, invariantContext, robotStateWithTip)
    const res = getErrorResult(result)

    expect(res.errors).toHaveLength(1)
    expect(res.errors[0]).toMatchObject({
      type: 'NO_TIP_ON_PIPETTE',
    })
  })
})

it('single transfer: 1 source & 1 dest', () => {
  mixinArgs = {
    ...mixinArgs,
    sourceWells: ['A1'],
    destWells: ['B2'],
    changeTip: 'never',
    volume: 30,
  }

  robotStateWithTip.liquidState.labware.sourcePlateId.A1 = {
    '0': { volume: 200 },
  }

  const result = transfer(
    mixinArgs as TransferArgs,
    invariantContext,
    robotStateWithTip
  )
  const res = getSuccessResult(result)
  expect(res.commands).toEqual([
    aspirateHelper('A1', 30),
    dispenseHelper('B2', 30),
  ])
})

test('single transfer: 1 source & 1 dest with waste chute', () => {
  const mockWasteChuteId = 'mockWasteChuteId'

  mixinArgs = {
    ...mixinArgs,
    destLabware: mockWasteChuteId,
    sourceWells: ['A1'],
    destWells: null,
    changeTip: 'never',
    volume: 30,
    dropTipLocation: mockWasteChuteId,
  }

  invariantContext = {
    ...invariantContext,
    additionalEquipmentEntities: {
      mockWasteChuteId: {
        name: 'wasteChute',
        id: mockWasteChuteId,
        location: WASTE_CHUTE_CUTOUT,
      },
    },
  }
  robotStateWithTip.liquidState.additionalEquipment.mockWasteChuteId = {
    '0': { volume: 200 },
  }
  robotStateWithTip.liquidState.labware.sourcePlateId.A1 = {
    '0': { volume: 200 },
  }

  const result = transfer(
    mixinArgs as TransferArgs,
    invariantContext,
    robotStateWithTip
  )
  const res = getSuccessResult(result)
  expect(res.commands).toEqual([
    aspirateHelper('A1', 30),
    {
      commandType: 'moveToAddressableArea',
      key: expect.any(String),
      params: {
        addressableAreaName: ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
        pipetteId: 'p300SingleId',
        offset: { x: 0, y: 0, z: 0 },
      },
    },
    {
      commandType: 'dispenseInPlace',
      key: expect.any(String),
      params: {
        flowRate: 2.2,
        pipetteId: 'p300SingleId',
        volume: 30,
      },
    },
  ])
})

test('transfer with multiple sets of wells', () => {
  mixinArgs = {
    ...mixinArgs,
    sourceWells: ['A1', 'A2'],
    destWells: ['B2', 'C2'],
    changeTip: 'never',
    volume: 30,
  }
  const result = transfer(
    mixinArgs as TransferArgs,
    invariantContext,
    robotStateWithTip
  )
  const res = getSuccessResult(result)
  expect(res.commands).toEqual([
    aspirateHelper('A1', 30),
    dispenseHelper('B2', 30),

    aspirateHelper('A2', 30),
    dispenseHelper('C2', 30),
  ])

  // TODO Ian 2018-04-02 robotState, liquidState checks
})

test('invalid pipette ID should throw error', () => {
  mixinArgs = {
    ...mixinArgs,
    sourceWells: ['A1'],
    destWells: ['B1'],
    volume: 10,
    changeTip: 'always',
    pipette: 'no-such-pipette-id-here',
  }

  const result = transfer(
    mixinArgs as TransferArgs,
    invariantContext,
    robotStateWithTip
  )
  const res = getErrorResult(result)

  expect(res.errors).toHaveLength(1)
  expect(res.errors[0]).toMatchObject({
    type: 'PIPETTE_DOES_NOT_EXIST',
  })
})

test('invalid labware ID should throw error', () => {
  mixinArgs = {
    ...mixinArgs,
    sourceLabware: 'no-such-labware-id-here',
    sourceWells: ['A1'],
    destWells: ['B1'],
    volume: 10,
    changeTip: 'always',
  }

  const result = transfer(
    mixinArgs as TransferArgs,
    invariantContext,
    robotStateWithTip
  )
  const res = getErrorResult(result)

  expect(res.errors).toHaveLength(1)
  expect(res.errors[0]).toMatchObject({
    type: 'LABWARE_DOES_NOT_EXIST',
  })
})

describe('single transfer exceeding pipette max', () => {
  let transferArgs: TransferArgs

  beforeEach(() => {
    transferArgs = {
      ...mixinArgs,
      sourceWells: ['A1', 'B1'],
      destWells: ['A3', 'B3'],
      volume: 350,
    } as TransferArgs
    // tip setup: tiprack's A1 has tip, pipette has no tip
    robotStateWithTip.tipState.tipracks.tiprack1Id.A1 = true
    robotStateWithTip.tipState.pipettes.p300SingleId = false
    // liquid setup
    robotStateWithTip.liquidState.labware.sourcePlateId.A1 = {
      '0': { volume: 400 },
    }
    robotStateWithTip.liquidState.labware.sourcePlateId.B1 = {
      '1': { volume: 400 },
    }
  })

  it('changeTip="once"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'once',
    }

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),
      aspirateHelper('A1', 300),
      dispenseHelper('A3', 300),
      aspirateHelper('A1', 50),
      dispenseHelper('A3', 50),
      aspirateHelper('B1', 300),
      dispenseHelper('B3', 300),
      aspirateHelper('B1', 50),
      dispenseHelper('B3', 50),
    ])
  })

  it('changeTip="always"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'always',
    }

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)

    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 300),
      dispenseHelper('A3', 300),

      // replace tip before next asp-disp chunk
      ...dropTipHelper(),
      pickUpTipHelper('B1'),

      aspirateHelper('A1', 50),
      dispenseHelper('A3', 50),

      // replace tip before next source-dest well pair
      ...dropTipHelper(),
      pickUpTipHelper('C1'),

      aspirateHelper('B1', 300),
      dispenseHelper('B3', 300),

      // replace tip before next asp-disp chunk
      ...dropTipHelper(),
      pickUpTipHelper('D1'),

      aspirateHelper('B1', 50),
      dispenseHelper('B3', 50),
    ])
  })

  it('changeTip="perSource"', () => {
    transferArgs = {
      ...transferArgs,
      sourceWells: ['A1', 'A1', 'A2'],
      destWells: ['B1', 'B2', 'B2'],
      changeTip: 'perSource',
    }

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 300),
      dispenseHelper('B1', 300),

      aspirateHelper('A1', 50),
      dispenseHelper('B1', 50),

      // same source, different dest: no change
      aspirateHelper('A1', 300),
      dispenseHelper('B2', 300),

      aspirateHelper('A1', 50),
      dispenseHelper('B2', 50),

      // new source, different dest: change tip
      ...dropTipHelper(),
      pickUpTipHelper('B1'),

      aspirateHelper('A2', 300),
      dispenseHelper('B2', 300),

      aspirateHelper('A2', 50),
      dispenseHelper('B2', 50),
    ])
  })

  it('changeTip="perDest"', () => {
    // NOTE: same wells as perSource test
    transferArgs = {
      ...transferArgs,
      sourceWells: ['A1', 'A1', 'A2'],
      destWells: ['B1', 'B2', 'B2'],
      changeTip: 'perDest',
    }

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      pickUpTipHelper('A1'),

      aspirateHelper('A1', 300),
      dispenseHelper('B1', 300),

      aspirateHelper('A1', 50),
      dispenseHelper('B1', 50),

      // same source, different dest: change tip
      ...dropTipHelper(),
      pickUpTipHelper('B1'),

      aspirateHelper('A1', 300),
      dispenseHelper('B2', 300),

      aspirateHelper('A1', 50),
      dispenseHelper('B2', 50),

      // different source, same dest: no change

      aspirateHelper('A2', 300),
      dispenseHelper('B2', 300),

      aspirateHelper('A2', 50),
      dispenseHelper('B2', 50),
    ])
  })

  it('changeTip="never"', () => {
    transferArgs = {
      ...transferArgs,
      changeTip: 'never',
    }
    // begin with tip on pipette
    robotStateWithTip.tipState.pipettes.p300SingleId = true

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      // no pick up tip
      aspirateHelper('A1', 300),
      dispenseHelper('A3', 300),

      aspirateHelper('A1', 50),
      dispenseHelper('A3', 50),

      aspirateHelper('B1', 300),
      dispenseHelper('B3', 300),

      aspirateHelper('B1', 50),
      dispenseHelper('B3', 50),
    ])
  })

  it('split up volume without going below pipette min', () => {
    transferArgs = {
      ...transferArgs,
      volume: 629,
      changeTip: 'never', // don't test tip use here
    }

    // begin with tip on pipette
    robotStateWithTip.tipState.pipettes.p300SingleId = true

    const result = transfer(transferArgs, invariantContext, robotStateWithTip)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      aspirateHelper('A1', 300),
      dispenseHelper('A3', 300),
      // last 2 chunks split evenly
      aspirateHelper('A1', 164.5),
      dispenseHelper('A3', 164.5),
      aspirateHelper('A1', 164.5),
      dispenseHelper('A3', 164.5),

      aspirateHelper('B1', 300),
      dispenseHelper('B3', 300),
      // last 2 chunks split evenly
      aspirateHelper('B1', 164.5),
      dispenseHelper('B3', 164.5),
      aspirateHelper('B1', 164.5),
      dispenseHelper('B3', 164.5),
    ])
  })
})

describe('advanced options', () => {
  let advArgs: TransferArgs

  beforeEach(() => {
    advArgs = {
      ...mixinArgs,
      sourceWells: ['A1'],
      destWells: ['B1'],
      changeTip: 'never',
    } as TransferArgs
  })
  describe('...aspirate options', () => {
    it('pre-wet tip should aspirate and dispense the transfer volume from source well of each subtransfer', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        preWetTip: true,
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // pre-wet aspirate/dispense
        aspirateHelper('A1', 300),
        dispenseHelper('A1', 300, {
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

        // "real" aspirate/dispenses
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
      ])
    })

    it('pre-wet tip should use the aspirate delay when specified', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        preWetTip: true,
        aspirateDelay: { mmFromBottom: 14, seconds: 12 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // pre-wet aspirate/dispense
        aspirateHelper('A1', 300),
        delayCommand(12),
        dispenseHelper('A1', 300, {
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

        // "real" aspirate/dispenses
        aspirateHelper('A1', 300),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 300),

        aspirateHelper('A1', 50),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 50),
      ])
    })

    it('pre-wet tip should use the dispense delay when specified', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        preWetTip: true,
        dispenseDelay: { mmFromBottom: 14, seconds: 12 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // pre-wet aspirate/dispense
        aspirateHelper('A1', 300),
        dispenseHelper('A1', 300, {
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

        // "real" aspirate/dispenses
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),
        ...delayWithOffset('B1', DEST_LABWARE),

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
        ...delayWithOffset('B1', DEST_LABWARE),
      ])
    })

    it('should touchTip after aspirate on each source well, for every aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        touchTipAfterAspirate: true,
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        touchTipHelper('A1'),
        dispenseHelper('B1', 300),

        aspirateHelper('A1', 50),
        touchTipHelper('A1'),
        dispenseHelper('B1', 50),
      ])
    })

    it('should touchTip after dispense on each dest well, for every dispense', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        touchTipAfterDispense: true,
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),
        touchTipHelper('B1', { labwareId: DEST_LABWARE }),

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
        touchTipHelper('B1', { labwareId: DEST_LABWARE }),
      ])
    })

    it('should mix before aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        mixBeforeAspirate: {
          volume: 250,
          times: 2,
        },
      }

      // written here for less verbose `commands` below
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

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        ...mixCommands,
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),

        ...mixCommands,
        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
      ])
    })
    it('should delay after mix aspirate and regular aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        mixBeforeAspirate: {
          volume: 250,
          times: 2,
        },
        aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      }

      // mixes will include the delays after aspirating
      const mixCommandsWithDelays = [
        // mix 1
        aspirateHelper('A1', 250),
        delayCommand(12),
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
        delayCommand(12),
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

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        ...mixCommandsWithDelays,
        aspirateHelper('A1', 300),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 300),

        ...mixCommandsWithDelays,
        aspirateHelper('A1', 50),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 50),
      ])
    })

    it('should delay after aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 300),

        aspirateHelper('A1', 50),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        dispenseHelper('B1', 50),
      ])
    })

    it('should air gap after aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        aspirateAirGapVolume: 5,
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 295),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 295),
        aspirateHelper('A1', 55),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 55),
      ])
    })
    it('should air gap after aspirate and break into two chunks', () => {
      advArgs = {
        ...advArgs,
        volume: 300,
        aspirateAirGapVolume: 5,
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 150),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 150),
        aspirateHelper('A1', 150),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 150),
      ])
    })
    it('should delay after air gap aspirate and regular aspirate', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        aspirateAirGapVolume: 5,
        aspirateDelay: { seconds: 12, mmFromBottom: 14 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 295),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        delayCommand(12),

        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 295),

        aspirateHelper('A1', 55),
        ...delayWithOffset('A1', SOURCE_LABWARE),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),
        delayCommand(12),

        dispenseAirGapHelper('B1', 5),
        dispenseHelper('B1', 55),
      ])
    })
    it('should delay after air gap dispense and regular dispense', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        aspirateAirGapVolume: 5,
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 295),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),

        dispenseAirGapHelper('B1', 5),
        delayCommand(12),

        dispenseHelper('B1', 295),
        ...delayWithOffset('B1', DEST_LABWARE),

        aspirateHelper('A1', 55),
        makeMoveToWellHelper('A1'),
        makeAirGapHelper(5),

        dispenseAirGapHelper('B1', 5),
        delayCommand(12),
        dispenseHelper('B1', 55),
        ...delayWithOffset('B1', DEST_LABWARE),
      ])
    })
  })

  describe('...dispense options', () => {
    it('should mix after dispense', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        mixInDestination: {
          volume: 250,
          times: 2,
        },
      }

      // written here for less verbose `commands` below
      const mixCommands = [
        // mix 1
        aspirateHelper('B1', 250, {
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
        dispenseHelper('B1', 250),
        // mix 2
        aspirateHelper('B1', 250, {
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
        dispenseHelper('B1', 250),
      ]

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),
        ...mixCommands,

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
        ...mixCommands,
      ])
    })
    it('should delay after mix dispense and after dispense', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        mixInDestination: {
          volume: 250,
          times: 2,
        },
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      }

      // mixes will include the delays after aspirating
      const mixCommandsWithDelays = [
        // mix 1
        aspirateHelper('B1', 250, {
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
        dispenseHelper('B1', 250, {
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
        delayCommand(12),
        // mix 2
        aspirateHelper('B1', 250, {
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
        dispenseHelper('B1', 250, {
          labwareId: DEST_LABWARE,
        }),
        delayCommand(12),
      ]

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),
        // delay after dispense
        ...delayWithOffset('B1', DEST_LABWARE),
        ...mixCommandsWithDelays,

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
        // delay after dispense
        ...delayWithOffset('B1', DEST_LABWARE),
        ...mixCommandsWithDelays,
      ])
    })

    it('should delay after dispense', () => {
      advArgs = {
        ...advArgs,
        volume: 350,
        dispenseDelay: { seconds: 12, mmFromBottom: 14 },
      }

      const result = transfer(advArgs, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        aspirateHelper('A1', 300),
        dispenseHelper('B1', 300),
        ...delayWithOffset('B1', DEST_LABWARE),

        aspirateHelper('A1', 50),
        dispenseHelper('B1', 50),
        ...delayWithOffset('B1', DEST_LABWARE),
      ])
    })
  })

  describe('all advanced settings enabled', () => {
    let allArgs: TransferArgs
    beforeEach(() => {
      allArgs = {
        ...mixinArgs,
        sourceWells: ['A1'],
        destWells: ['B1'],
        volume: 350,
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
        mixInDestination: {
          volume: 36,
          times: 1,
        },
        touchTipAfterDispense: true,
        blowoutFlowRateUlSec: 2.3,
        blowoutOffsetFromTopMm: 3.3,
        dispenseAirGapVolume: 3,
      } as TransferArgs
    })

    it('should create commands in the expected order with expected params (blowout in trash)', () => {
      const args = {
        ...allArgs,
        changeTip: 'never',
        blowoutLocation: 'fixedTrash',
      } as TransferArgs
      const result = transfer(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // Pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense the aspirate > air gap
        {
          commandType: 'dispense',

          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',

              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // no dispense > air gap, because tip will be reused
        // blowout
        {
          commandType: 'moveToAddressableArea',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            addressableAreaName: 'movableTrashA3',
            offset: { x: 0, y: 0, z: 0 },
          },
        },
        {
          commandType: 'blowOutInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            flowRate: 2.3,
          },
        },
        // touch tip (disp)
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
        // next chunk from A1: remaining volume
        // do not pre-wet
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate 81 (= total vol 350 - prev transfer's 269)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense aspirate > air gap then liquid
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.2,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                y: 0,
                x: 0,
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
                z: 3.2,
                y: 0,
                x: 0,
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
        {
          commandType: 'moveToAddressableArea',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            addressableAreaName: 'movableTrashA3',
            offset: { x: 0, y: 0, z: 0 },
          },
        },
        {
          commandType: 'blowOutInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            flowRate: 2.3,
          },
        },
        // touch tip (disp)
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
        // use the dispense > air gap here before moving to trash
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
            volume: 3,
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
        // since we used dispense > air gap, drop the tip
        ...dropTipHelper(),
      ])
    })

    it('should create commands in the expected order with expected params (blowout in dest well, reuse tip)', () => {
      const args = {
        ...allArgs,
        changeTip: 'never',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      } as TransferArgs

      const result = transfer(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // Pre-wet
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense the aspirate > air gap
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // blowout
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
        // touch tip (disp)
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
        // don't dispense > air gap bc we're re-using the tip
        //
        // next chunk from A1: remaining volume
        // do not pre-wet
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate 81 (= total vol 350 - prev transfer's 269)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            flowRate: 2.2,
            labwareId: 'destPlateId',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
              },
            },
            pipetteId: 'p300SingleId',
            volume: 31,
            wellName: 'B1',
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: {
            seconds: 12,
          },
        },
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // blowout to dest well
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
        // touch tip (disp)
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
        // dispense > air gap on the way to trash
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
            volume: 3,
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
        // this step is over, and we used dispense > air gap, so
        // we will dispose of the tip
        ...dropTipHelper(),
      ])
    })

    it('should create commands in the expected order with expected params (blowout in dest well, change tip perSource)', () => {
      const args = {
        ...allArgs,
        changeTip: 'perSource',
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      } as TransferArgs

      const result = transfer(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // get fresh tip b/c it's per source
        {
          commandType: 'moveToAddressableAreaForDropTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            addressableAreaName: 'movableTrashA3',
            offset: { x: 0, y: 0, z: 0 },
            alternateDropLocation: true,
          },
        },
        {
          commandType: 'dropTipInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
          },
        },

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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // blowout
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
        // touch tip (disp)
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
        // we're re-using the tip, so we'll skip the dispense > air gap
        //
        // next chunk from A1: remaining volume
        // do not pre-wet
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate 81 (= total vol 350 - prev transfer's 269)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense "aspirate > air gap" then dispense liquid
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // blowout
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
        // touch tip (disp)
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
        // dispense > air gap
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
            volume: 3,
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

    it('should create commands in the expected order with expected params (blowout in source well, change tip each aspirate)', () => {
      const args = {
        ...allArgs,
        changeTip: 'always',
        blowoutLocation: SOURCE_WELL_BLOWOUT_DESTINATION,
      } as TransferArgs

      const result = transfer(args, invariantContext, robotStateWithTip)
      const res = getSuccessResult(result)
      expect(res.commands).toEqual([
        // get fresh tip b/c it's per source
        {
          commandType: 'moveToAddressableAreaForDropTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            addressableAreaName: 'movableTrashA3',
            offset: { x: 0, y: 0, z: 0 },
            alternateDropLocation: true,
          },
        },
        {
          commandType: 'dropTipInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
          },
        },
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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 11.54,
                y: 0,
                x: 0,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 269,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
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
        // blowout
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // touch tip (disp)
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
        // dispense > air gap
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
            volume: 3,
            flowRate: 2.1,
          },
        },
        {
          commandType: 'waitForDuration',
          key: expect.any(String),
          params: { seconds: 11 },
        },
        // we're not re-using the tip, so instead of dispenseAirGap we'll change the tip
        {
          commandType: 'moveToAddressableAreaForDropTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            addressableAreaName: 'movableTrashA3',
            offset: { x: 0, y: 0, z: 0 },
            alternateDropLocation: true,
          },
        },
        {
          commandType: 'dropTipInPlace',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
          },
        },
        {
          commandType: 'pickUpTip',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'tiprack1Id',
            wellName: 'B1',
          },
        },
        // next chunk from A1: remaining volume
        // do not pre-wet
        // mix (asp)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
            volume: 35,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // aspirate 81 (= total vol 350 - prev transfer's 269)
        {
          commandType: 'aspirate',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: 3.1,
                y: 0,
                x: 0,
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
        // touch tip (asp)
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
        // aspirate > air gap
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
        // dispense "aspirate > air gap" then dispense liquid
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 31,
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
        {
          commandType: 'dispense',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            volume: 81,
            labwareId: 'destPlateId',
            wellName: 'B1',
            wellLocation: {
              origin: 'bottom',
              offset: {
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // mix (disp)
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
                z: DISPENSE_OFFSET_FROM_BOTTOM_MM,
                y: 0,
                x: 0,
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
        // blowout
        {
          commandType: 'blowout',
          key: expect.any(String),
          params: {
            pipetteId: 'p300SingleId',
            labwareId: 'sourcePlateId',
            wellName: 'A1',
            flowRate: 2.3,
            wellLocation: {
              origin: 'top',
              offset: {
                z: 3.3,
              },
            },
          },
        },
        // touch tip (disp)
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
        // dispense > air gap
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
            volume: 3,
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
  })
})
