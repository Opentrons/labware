import { describe, it, expect } from 'vitest'
import { getPrimaryPipetteId } from '../getPrimaryPipetteId'
import type {
  LoadedPipette,
  LoadPipetteRunTimeCommand,
} from '@opentrons/shared-data'

describe('getPrimaryPipetteId', () => {
  it('should return the one and only pipette if there is only one pipette in the protocol', () => {
    const mockPipettesById: { [id: string]: LoadedPipette } = {
      p10SingleId: {
        id: 'p10SingleId',
        pipetteName: 'p10_single',
        mount: 'left',
      },
    }
    expect(getPrimaryPipetteId(mockPipettesById, [])).toBe('p10SingleId')
  })
  it('should throw an error if there are two pipettes with the same mount', () => {
    const loadPipetteCommands: LoadPipetteRunTimeCommand[] = [
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p10SingleId',
          mount: 'left',
        },
      },
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p10MultiId',
          mount: 'left',
        },
      },
    ] as any

    const pipettesById: { [id: string]: LoadedPipette } = {
      p10SingleId: {
        id: 'p10SingleId',
        pipetteName: 'p10_single',
        mount: 'left',
      },
      p10MultiId: {
        id: 'p10SingleId',
        pipetteName: 'p10_multi',
        mount: 'left',
      },
    }
    expect(() =>
      getPrimaryPipetteId(pipettesById, loadPipetteCommands)
    ).toThrow(
      'expected to find both left pipette and right pipette but could not'
    )
  })
  it('should return the pipette with fewer channels', () => {
    const loadPipetteCommands: LoadPipetteRunTimeCommand[] = [
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p10SingleId',
          mount: 'left',
        },
        result: {
          pipetteId: 'p10SingleId',
        },
      },
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p10MultiId',
          mount: 'right',
        },
        result: {
          pipetteId: 'p10MultiId',
        },
      },
    ] as any

    const pipettesById: { [id: string]: LoadedPipette } = {
      p10SingleId: {
        id: 'p10SingleId',
        pipetteName: 'p10_single',
        mount: 'left',
      },
      p10MultiId: {
        id: 'p10SingleId',
        pipetteName: 'p10_multi',
        mount: 'right',
      },
    }

    expect(getPrimaryPipetteId(pipettesById, loadPipetteCommands)).toBe(
      'p10SingleId'
    )
  })
  it('should return the smaller pipette', () => {
    const loadPipetteCommands: LoadPipetteRunTimeCommand[] = [
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p10SingleId',
          mount: 'left',
        },
        result: {
          pipetteId: 'p10SingleId',
        },
      },
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p50SingleId',
          mount: 'right',
        },
        result: {
          pipetteId: 'p50SingleId',
        },
      },
    ] as any

    const pipettesById: { [id: string]: LoadedPipette } = {
      p10SingleId: {
        id: 'p10SingleId',
        pipetteName: 'p10_single',
        mount: 'left',
      },
      p50SingleId: {
        id: 'p50SingleId',
        pipetteName: 'p50_single',
        mount: 'right',
      },
    }
    expect(getPrimaryPipetteId(pipettesById, loadPipetteCommands)).toBe(
      'p10SingleId'
    )
  })
  it('should return the newer model', () => {
    const loadPipetteCommands: LoadPipetteRunTimeCommand[] = [
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p300SingleId',
          mount: 'left',
        },
        result: {
          pipetteId: 'p300SingleId',
        },
      },
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p300SingleGen2Id',
          mount: 'right',
        },
        result: {
          pipetteId: 'p300SingleGen2Id',
        },
      },
    ] as any

    const pipettesById: { [id: string]: LoadedPipette } = {
      p300SingleId: {
        id: 'p300SingleId',
        pipetteName: 'p300_single',
        mount: 'left',
      },
      p300SingleGen2Id: {
        id: 'p300SingleGen2Id',
        pipetteName: 'p300_single_gen2',
        mount: 'right',
      },
    }
    expect(getPrimaryPipetteId(pipettesById, loadPipetteCommands)).toBe(
      'p300SingleGen2Id'
    )
  })

  it('should return the left pipette when all else is the same', () => {
    const loadPipetteCommands: LoadPipetteRunTimeCommand[] = [
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p300SingleLeftId',
          mount: 'left',
        },
        result: {
          pipetteId: 'p300SingleLeftId',
        },
      },
      {
        id: '1',
        commandType: 'loadPipette',
        params: {
          pipetteId: 'p300SingleRightId',
          mount: 'right',
        },
        result: {
          pipetteId: 'p300SingleRightId',
        },
      },
    ] as any

    const pipettesById: { [id: string]: LoadedPipette } = {
      p300SingleLeftId: {
        id: 'p300SingleLeftId',
        pipetteName: 'p300_single',
        mount: 'left',
      },
      p300SingleRightId: {
        id: 'p300SingleRightId',
        pipetteName: 'p300_single',
        mount: 'right',
      },
    }
    expect(getPrimaryPipetteId(pipettesById, loadPipetteCommands)).toBe(
      'p300SingleLeftId'
    )
  })
})
