import { describe, it, beforeEach, expect } from 'vitest'
import {
  fixture_96_plate,
  fixture_trash,
  fixture_tiprack_10_ul,
  fixture_tiprack_300_ul,
} from '@opentrons/shared-data/labware/fixtures/2'
import { DEFAULT_MM_OFFSET_FROM_BOTTOM } from '../../../../constants'
import { dependentFieldsUpdateMix } from '../dependentFieldsUpdateMix'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { FormData } from '../../../../form-types'

const fixture96Plate = fixture_96_plate as LabwareDefinition2
const fixtureTrash = fixture_trash as LabwareDefinition2
const fixtureTipRack10ul = fixture_tiprack_10_ul as LabwareDefinition2
const fixtureTipRack300ul = fixture_tiprack_300_ul as LabwareDefinition2

let pipetteEntities: PipetteEntities
let labwareEntities: LabwareEntities
let handleFormHelper: any
beforeEach(() => {
  pipetteEntities = {
    pipetteId: {
      name: 'p10_single',
      tiprackModel: 'tiprack-10ul',
      spec: {
        channels: 1,
      },
      tiprackLabwareDef: fixtureTipRack300ul,
    },
    pipetteMultiId: {
      name: 'p10_multi',
      tiprackModel: 'tiprack-10ul',
      spec: {
        channels: 8,
      },
      tiprackLabwareDef: fixtureTipRack10ul,
    },
  } as any
  labwareEntities = {
    fixedTrash: {
      type: 'trash-box',
      def: fixtureTrash,
    },
    plateId: {
      type: '96-flat',
      def: fixture96Plate,
    },
  } as any

  handleFormHelper = (
    patch: Partial<Record<string, unknown>>,
    baseForm: FormData
  ) =>
    dependentFieldsUpdateMix(patch, baseForm, pipetteEntities, labwareEntities)
})
describe('no-op cases should pass through the patch unchanged', () => {
  const minimalBaseForm = {
    blah: 'blaaah',
  }
  it('empty patch', () => {
    const patch = {}
    expect(handleFormHelper(patch, minimalBaseForm)).toBe(patch)
  })
  it('patch with unhandled field', () => {
    const patch = {
      fooField: 123,
    }
    expect(handleFormHelper(patch, minimalBaseForm)).toBe(patch)
  })
})
describe('well selection should update', () => {
  let form: any
  beforeEach(() => {
    form = {
      labware: 'plateId',
      wells: ['A1', 'B1'],
      volume: '2',
      pipette: 'pipetteId',
      mix_mmFromBottom: 1.2,
      mix_touchTip_mmFromTop: 2.3,
    }
  })
  it('pipette cleared', () => {
    const patch = {
      pipette: null,
    }
    expect(handleFormHelper(patch, form)).toEqual({
      ...patch,
      wells: [],
      aspirate_flowRate: null,
      dispense_flowRate: null,
      nozzles: null,
      tipRack: null,
    })
  })
  it('pipette single -> multi', () => {
    const patch = {
      pipette: 'pipetteMultiId',
    }
    expect(handleFormHelper(patch, form)).toEqual({
      ...patch,
      wells: [],
      aspirate_flowRate: null,
      dispense_flowRate: null,
      nozzles: null,
      tipRack: null,
    })
  })
  it('pipette multi -> single', () => {
    const multiChForm = { ...form, pipette: 'pipetteMultiId', wells: ['A10'] }
    const patch = {
      pipette: 'pipetteId',
    }
    expect(handleFormHelper(patch, multiChForm)).toEqual({
      ...patch,
      wells: ['A10', 'B10', 'C10', 'D10', 'E10', 'F10', 'G10', 'H10'],
      aspirate_flowRate: null,
      dispense_flowRate: null,
      nozzles: null,
      tipRack: null,
    })
  })
  it('select single-well labware', () => {
    const patch = {
      labware: 'fixedTrash',
    }
    expect(handleFormHelper(patch, form)).toEqual({
      ...patch,
      wells: ['A1'],
      mix_mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
      mix_touchTip_mmFromTop: null,
      mix_touchTip_checkbox: false,
    })
  })
  it('select labware with multiple wells', () => {
    const trashLabwareForm = { ...form, labware: 'fixedTrash' }
    const patch = {
      labware: 'plateId',
    }
    expect(handleFormHelper(patch, trashLabwareForm)).toEqual({
      ...patch,
      wells: [],
      mix_mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
      mix_touchTip_mmFromTop: null,
      mix_touchTip_checkbox: false,
    })
  })
})
