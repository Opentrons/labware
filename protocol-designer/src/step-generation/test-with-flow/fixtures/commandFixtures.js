// @flow
import {tiprackWellNamesFlat} from '../../data'
import type {Command} from '../../types'

export const replaceTipCommands = (tip: number | string): Array<Command> => [
  {
    command: 'drop-tip',
    params: {
      pipette: 'p300SingleId',
      labware: 'trashId',
      well: 'A1'
    }
  },
  pickUpTip(tip)
]

export const dropTip = (
  tip: number | string,
  params?: {| pipette?: string, labware?: string |}
): Command => ({
  command: 'drop-tip',
  params: {
    pipette: 'p300SingleId',
    labware: 'trashId',
    well: (typeof tip === 'string') ? tip : tiprackWellNamesFlat[tip],
    ...params
  }
})

export const pickUpTip = (
  tip: number | string,
  params?: {| pipette?: string, labware?: string |}
): Command => ({
  command: 'pick-up-tip',
  params: {
    pipette: 'p300SingleId',
    labware: 'tiprack1Id',
    well: (typeof tip === 'string') ? tip : tiprackWellNamesFlat[tip],
    ...params
  }
})

export const touchTip = (well: string): Command => ({
  command: 'touch-tip',
  params: {
    labware: 'sourcePlateId',
    pipette: 'p300SingleId',
    well
  }
})

export const aspirate = (well: string, volume: number): Command => ({
  command: 'aspirate',
  params: {
    pipette: 'p300SingleId',
    labware: 'sourcePlateId',
    volume,
    well
  }
})

export const dispense = (well: string, volume: number): Command => ({
  command: 'dispense',
  params: {
    pipette: 'p300SingleId',
    labware: 'sourcePlateId',
    volume,
    well
  }
})

export const blowout = (labware: string): Command => ({
  command: 'blowout',
  params: {
    pipette: 'p300SingleId',
    well: 'A1',
    labware
  }
})
