import { describe, it, expect } from 'vitest'
import {
  FLEX_ROBOT_TYPE,
  MAGNETIC_BLOCK_V1,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'
import { getModuleModelsBySlot } from '../utils'
import { FLEX_MODULE_MODELS, OT2_MODULE_MODELS } from '../constants'

describe('getModuleModelsBySlot', () => {
  it('renders no modules for ot-2 middle slot', () => {
    expect(getModuleModelsBySlot(false, OT2_ROBOT_TYPE, '5')).toEqual([])
  })
  it('renders all ot-2 modules for slot 7', () => {
    expect(getModuleModelsBySlot(false, OT2_ROBOT_TYPE, '7')).toEqual(
      OT2_MODULE_MODELS
    )
  })
  it('renders ot-2 modules minus thermocyclers for slot 1', () => {
    const noTC = OT2_MODULE_MODELS.filter(
      model =>
        model !== THERMOCYCLER_MODULE_V1 && model !== THERMOCYCLER_MODULE_V2
    )
    expect(getModuleModelsBySlot(false, OT2_ROBOT_TYPE, '1')).toEqual(noTC)
  })
  it('renders flex modules for middle slots', () => {
    expect(getModuleModelsBySlot(false, FLEX_ROBOT_TYPE, 'B2')).toEqual([
      MAGNETIC_BLOCK_V1,
    ])
  })
  it('renders all flex modules for B1', () => {
    expect(getModuleModelsBySlot(false, FLEX_ROBOT_TYPE, 'B1')).toEqual(
      FLEX_MODULE_MODELS
    )
  })
  it('renders all flex modules for C1', () => {
    const noTC = FLEX_MODULE_MODELS.filter(
      model => model !== THERMOCYCLER_MODULE_V2
    )
    expect(getModuleModelsBySlot(false, FLEX_ROBOT_TYPE, 'C1')).toEqual(noTC)
  })
})
