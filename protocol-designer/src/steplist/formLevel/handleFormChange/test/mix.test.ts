import { DEFAULT_MM_FROM_BOTTOM_DISPENSE } from '../../../../constants'
import { FormData } from '../../../../form-types'
import { dependentFieldsUpdateMix } from '../dependentFieldsUpdateMix'
import { LabwareDefinition2 } from '@opentrons/shared-data'
import _fixture_96_plate from '@opentrons/shared-data/labware/fixtures/2/fixture_96_plate.json'
import _fixture_trash from '@opentrons/shared-data/labware/fixtures/2/fixture_trash.json'
import { LabwareEntities, PipetteEntities } from '@opentrons/step-generation'

const fixture96Plate = _fixture_96_plate as LabwareDefinition2
const fixtureTrash = _fixture_trash as LabwareDefinition2

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
    },
    pipetteMultiId: {
      name: 'p10_multi',
      tiprackModel: 'tiprack-10ul',
      spec: {
        channels: 8,
      },
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
      mix_touchTip_mmFromBottom: 2.3,
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
    })
  })
  it('select single-well labware', () => {
    const patch = {
      labware: 'fixedTrash',
    }
    expect(handleFormHelper(patch, form)).toEqual({
      ...patch,
      wells: ['A1'],
      mix_mmFromBottom: DEFAULT_MM_FROM_BOTTOM_DISPENSE,
      mix_touchTip_mmFromBottom: null,
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
      mix_mmFromBottom: DEFAULT_MM_FROM_BOTTOM_DISPENSE,
      mix_touchTip_mmFromBottom: null,
    })
  })
})
