import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import {
  fixture_tiprack_10_ul,
  fixture_tiprack_300_ul,
} from '@opentrons/shared-data/labware/fixtures/2'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '@opentrons/step-generation'
import {
  dependentFieldsUpdateMoveLiquid,
  updatePatchBlowoutFields,
} from '../dependentFieldsUpdateMoveLiquid'
import {
  fixtureP10SingleV2Specs,
  fixtureP300SingleV2Specs,
} from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  PipetteEntities,
  LabwareEntities,
} from '@opentrons/step-generation'
import type { FormData } from '../../../../form-types'

const fixtureTiprack10ul = fixture_tiprack_10_ul as LabwareDefinition2
const fixtureTiprack300ul = fixture_tiprack_300_ul as LabwareDefinition2

let pipetteEntities: PipetteEntities
let labwareEntities: LabwareEntities
let handleFormHelper: any

beforeEach(() => {
  pipetteEntities = {
    pipetteId: {
      name: 'p10_single',
      spec: fixtureP10SingleV2Specs,
      // @ts-expect-error(sa, 2021-6-15): tiprackModel does not exist on PipetteEntity
      tiprackModel: ['tiprack-10ul'],
      tiprackLabwareDef: [fixtureTiprack10ul],
    },
    otherPipetteId: {
      name: 'p300_single_gen2',
      spec: fixtureP300SingleV2Specs,
      // @ts-expect-error(sa, 2021-6-15): tiprackModel does not exist on PipetteEntity
      tiprackModel: ['tiprack-300ul'],
      tiprackLabwareDef: [fixtureTiprack300ul],
    },
  }
  labwareEntities = {}
  handleFormHelper = (
    patch: Partial<Record<string, unknown>>,
    baseForm: FormData
  ) =>
    dependentFieldsUpdateMoveLiquid(
      patch,
      baseForm,
      pipetteEntities,
      labwareEntities
    )
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('no-op cases should pass through the patch unchanged', () => {
  const minimalBaseForm = {
    blah: 'blaaah',
    // NOTE: without these fields below, `path` gets added to the result
    path: 'single',
    aspirate_wells: ['A1'],
    dispense_wells: ['B1'],
  }

  it('empty patch', () => {
    const patch = {}
    expect(handleFormHelper(patch, minimalBaseForm)).toBe(patch)
  })
  it('patch with unhandled field', () => {
    const patch = { fooField: 123 }
    expect(handleFormHelper(patch, minimalBaseForm)).toBe(patch)
  })
})

describe('path should update...', () => {
  it('if there is no path in base form', () => {
    const patch = {}
    expect(handleFormHelper(patch, { blah: 'blaaah' })).toEqual({
      path: 'single',
    })
  })
  describe('if path is multi and volume*2 + air gap volume exceeds pipette/tip capacity', () => {
    const multiPaths = ['multiAspirate', 'multiDispense']
    multiPaths.forEach(path => {
      const testCases = [
        {
          description:
            'should not reset path when aspirate > air gap checkbox is unchecked',
          volume: '3',
          aspirate_airGap_checkbox: false,
          aspirate_airGap_volume: '8',
          path,
          expectedPath: path,
        },
        {
          description:
            'should not reset path when aspirate > air gap volume is not a number',
          volume: '3',
          aspirate_airGap_checkbox: true,
          aspirate_airGap_volume: '',
          path,
          expectedPath: path,
        },
        {
          description:
            'should not reset path when aspirate > air gap volume is small',
          volume: '3',
          aspirate_airGap_checkbox: true,
          aspirate_airGap_volume: '1',
          path,
          expectedPath: path,
        },
        {
          description:
            'should reset path when aspirate > air gap volume is large',
          volume: '3',
          aspirate_airGap_checkbox: true,
          aspirate_airGap_volume: '5',
          path,
          expectedPath: 'single',
        },
        {
          description:
            'should reset path when aspirate > air gap volume is large',
          volume: '6',
          aspirate_airGap_checkbox: false,
          aspirate_airGap_volume: '5',
          path,
          expectedPath: 'single',
        },
      ]

      testCases.forEach(
        ({
          description,
          volume,
          aspirate_airGap_checkbox,
          aspirate_airGap_volume,
          path,
          expectedPath,
        }) => {
          it(`${description} and path is ${path}`, () => {
            // note: we are asserting on airGapChange and volumeChange because we want to ensure
            // that the path gets updated when air gap volume and volume change independently
            const pathFields = {
              aspirate_wells: path === 'multiAspirate' ? ['A1', 'A2'] : ['A1'],
              dispense_wells: path === 'multiAspirate' ? ['A1'] : ['A1', 'A2'],
            }

            const airGapChange = handleFormHelper(
              // patch
              { aspirate_airGap_volume },
              // form
              {
                ...pathFields,
                path,
                volume,
                pipette: 'pipetteId',
                aspirate_airGap_checkbox,
              }
            )
            const volumeChange = handleFormHelper(
              // patch
              { volume },
              // form
              {
                ...pathFields,
                path,
                aspirate_airGap_volume,
                pipette: 'pipetteId',
                aspirate_airGap_checkbox,
                volume: '1',
              }
            )
            const pathPatch =
              path === expectedPath ? {} : { path: expectedPath }

            const volumeChangeExpected = { volume, ...pathPatch }
            const airGapChangeExpected = {
              aspirate_airGap_volume,
              ...pathPatch,
            }
            expect(airGapChange).toMatchObject(airGapChangeExpected)
            expect(volumeChange).toMatchObject(volumeChangeExpected)
          })
        }
      )
    })
  })

  describe('if new changeTip option is incompatible...', () => {
    // cases are: [changeTip, pathThatIsIncompatibleWithChangeTip]
    const cases = [
      ['perSource', 'multiAspirate'],
      ['perDest', 'multiDispense'],
    ]

    cases.forEach(([changeTip, badPath]) => {
      it(`"${changeTip}" selected: path → single`, () => {
        const patch = { changeTip }
        const result = handleFormHelper({ ...patch, path: badPath }, {})
        expect(result.path).toEqual('single')
      })
    })
  })
})

describe('disposal volume should update...', () => {
  let form: {
    path: string
    aspirate_wells: string[]
    dispense_wells: string[]
    volume: string
    pipette: string
    disposalVolume_checkbox: boolean
    disposalVolume_volume: string
  }
  beforeEach(() => {
    form = {
      path: 'multiDispense',
      aspirate_wells: ['A1'],
      dispense_wells: ['B2', 'B3'],
      volume: '2',
      pipette: 'pipetteId',
      disposalVolume_checkbox: true,
      disposalVolume_volume: '1.1',
    }
  })

  describe('should not remove valid decimal', () => {
    const testCases = ['.', '0.', '.1', '1.', '']
    testCases.forEach(disposalVolume_volume => {
      it(`input is ${disposalVolume_volume}`, () => {
        const result = handleFormHelper({ disposalVolume_volume }, form)
        expect(result.disposalVolume_volume).toBe(disposalVolume_volume)
      })
    })
  })

  it('when path is changed: multiDispense → single', () => {
    const result = handleFormHelper({ path: 'single' }, form)
    expect(result).toEqual({
      path: 'single',
      disposalVolume_checkbox: false,
      disposalVolume_volume: null,
    })
  })

  it('when volume is raised but disposal vol is still in capacity, do not change (noop case)', () => {
    const patch = { volume: '2.5' }
    const result = handleFormHelper(patch, form)
    expect(result).toEqual(patch)
  })

  it('when the aspirate > air gap volume is large', () => {
    const patch = { disposalVolume_volume: '6' }
    const result = handleFormHelper(patch, {
      ...form,
      aspirate_airGap_checkbox: true,
      aspirate_airGap_volume: '3',
      volume: '1',
    })
    expect(result).toEqual({ disposalVolume_volume: '5' })
  })
  it('when the aspirate > air gap volume is increased', () => {
    const patch = { aspirate_airGap_volume: '3' }
    const result = handleFormHelper(patch, {
      ...form,
      aspirate_airGap_checkbox: true,
      aspirate_airGap_volume: '1',
      disposalVolume_volume: '6',
      volume: '1',
    })
    expect(result).toEqual({
      aspirate_airGap_volume: '3',
      disposalVolume_volume: '5',
    })
  })
  it('skipped when the aspirate > air gap checkbox not checked', () => {
    const patch = { disposalVolume_volume: '6' }
    const result = handleFormHelper(patch, {
      ...form,
      aspirate_airGap_checkbox: false,
      aspirate_airGap_volume: '3',
      volume: '1',
    })
    expect(result).toEqual({ disposalVolume_volume: '6' })
  })

  describe('when volume is raised so that disposal vol must be exactly zero, clear/zero disposal volume fields', () => {
    const volume = '5' // 5 + 5 = 10 which is P10 capacity ==> max disposal volume is zero
    it('when form is newly changed to multiDispense: clear the disposal vol + dispense_mix_* fields', () => {
      const patch = { path: 'multiDispense' }
      const result = handleFormHelper(patch, {
        ...form,
        path: 'single',
        volume,
      })
      expect(result).toEqual({
        ...patch,
        disposalVolume_volume: null,
        disposalVolume_checkbox: false,
        dispense_mix_checkbox: false,
        dispense_mix_times: null,
        dispense_mix_volume: null,
        blowout_checkbox: false,
      })
    })

    it('when form was multiDispense already: set to zero', () => {
      const patch = { volume }
      const result = handleFormHelper(patch, form)
      expect(result).toEqual({
        ...patch,
        disposalVolume_volume: '0',
      })
    })
  })

  it('when volume is raised past disposal volume, lower disposal volume', () => {
    const result = handleFormHelper({ volume: '4.6' }, form)
    expect(result).toEqual({
      volume: '4.6',
      disposalVolume_volume: '0.8',
    })
  })

  it('clamp excessive disposal volume to max', () => {
    const result = handleFormHelper({ disposalVolume_volume: '9999' }, form)
    expect(result).toEqual({ disposalVolume_volume: '6' })
  })

  it('when disposal volume is a negative number, set to zero', () => {
    const result = handleFormHelper({ disposalVolume_volume: '-2' }, form)
    expect(result).toEqual({ disposalVolume_volume: '0' })
  })

  describe('mix fields should clear...', () => {
    // NOTE: path --> multiDispense handled in "when form is newly changed to multiDispense" test above

    it('when path is changed to multiAspirate, clear aspirate mix fields', () => {
      const form = {
        path: 'single',
        aspirate_wells: ['A1', 'A2'],
        dispense_wells: ['B1'],
        volume: 3,
        pipette: 'pipetteId',
        aspirate_mix_checkbox: true,
        aspirate_mix_times: 2,
        aspirate_mix_volume: 1,
      }
      const result = handleFormHelper({ path: 'multiAspirate' }, form)
      expect(result).toEqual({
        path: 'multiAspirate',
        aspirate_mix_checkbox: false,
        aspirate_mix_times: null,
        aspirate_mix_volume: null,
      })
    })
  })

  describe('blowout location should reset via updatePatchBlowoutFields...', () => {
    const resetBlowoutLocation = {
      blowout_location: null,
    }

    const testCases = [
      {
        prevPath: 'single',
        nextPath: 'multiAspirate',
        incompatible: SOURCE_WELL_BLOWOUT_DESTINATION,
      },
      {
        prevPath: 'single',
        nextPath: 'multiDispense',
        incompatible: DEST_WELL_BLOWOUT_DESTINATION,
      },
    ]

    testCases.forEach(({ prevPath, nextPath, incompatible }) => {
      const patch = { path: nextPath }
      it(`when changing path ${prevPath} → ${nextPath}, arbitrary labware still allowed`, () => {
        // @ts-expect-error(sa, 2021-6-15): missing id and stepType to be valid formData type
        const result = updatePatchBlowoutFields(patch, {
          path: prevPath,
          blowout_location: 'someKindaTrashLabwareIdHere',
        })
        expect(result).toEqual(patch)
      })

      it(`when changing path ${prevPath} → ${nextPath}, ${incompatible} reset to fixedTrash`, () => {
        // @ts-expect-error(sa, 2021-6-15): missing id and stepType to be valid formData type
        const result = updatePatchBlowoutFields(patch, {
          path: prevPath,
          blowout_location: incompatible,
        })
        expect(result).toEqual({ ...patch, ...resetBlowoutLocation })
      })
    })
  })
})

describe('aspirate > air gap volume', () => {
  describe('when the path is single', () => {
    let form: {
      path: string
      aspirate_wells: string[]
      dispense_wells: string[]
      volume: string
      pipette: string
      disposalVolume_checkbox: boolean
      disposalVolume_volume: string
    }
    beforeEach(() => {
      form = {
        path: 'single',
        aspirate_wells: ['A1'],
        dispense_wells: ['B2'],
        volume: '2',
        pipette: 'pipetteId',
        disposalVolume_checkbox: true,
        disposalVolume_volume: '1.1',
      }
    })

    it('should update the aspirate > air gap volume to 0 when the patch volume is less than 0', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '-1' }, form)
      expect(result.aspirate_airGap_volume).toEqual('0')
    })
    it('should update the aspirate > air gap volume to 0 when the raw form volume is less than 0', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '-1' }
      )
      expect(result.aspirate_airGap_volume).toEqual('0')
    })
    it('should update the aspirate > air gap volume to the pipette capacity - min pipette volume when the patch air gap volume is too big', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '100' }, form)
      expect(result.aspirate_airGap_volume).toEqual('9')
    })
    it('should update the aspirate > air gap volume to the pipette capacity - min pipette volume when the raw form air gap volume is too big', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '10' }
      )
      expect(result.aspirate_airGap_volume).toEqual('9')
    })
    it('should NOT update when the patch volume is greater than the min pipette volume', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '2' }, form)
      expect(result.aspirate_airGap_volume).toEqual('2')
    })
    it('should NOT update when the raw form volume is greater than the min pipette volume', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '2' }
      )
      expect(result.aspirate_airGap_volume).toBeUndefined()
    })
    it('should NOT update when the patch volume is equal to the min pipette volume', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '1' }, form)
      expect(result.aspirate_airGap_volume).toEqual('1')
    })
    it('should NOT update when the raw form volume is equal to the min pipette volume', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '1' }
      )
      expect(result.aspirate_airGap_volume).toBeUndefined()
    })
    it('should reset to pipette min when pipette is changed', () => {
      const result = handleFormHelper({ pipette: 'otherPipetteId' }, form)
      expect(result.aspirate_airGap_volume).toEqual('30')
    })
  })

  describe('when the path is multi aspirate', () => {
    let form: {
      path: string
      aspirate_wells: string[]
      dispense_wells: string[]
      volume: string
      pipette: string
      disposalVolume_checkbox: boolean
      disposalVolume_volume: string
    }
    beforeEach(() => {
      form = {
        path: 'multiAspirate',
        aspirate_wells: ['A1', 'B1'],
        dispense_wells: ['B2'],
        volume: '2',
        pipette: 'pipetteId',
        disposalVolume_checkbox: true,
        disposalVolume_volume: '1.1',
      }
    })

    it('should update the aspirate > air gap volume to 0 when the patch volume is less than 0', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '-1' }, form)
      expect(result.aspirate_airGap_volume).toEqual('0')
    })
    it('should update the aspirate > air gap volume to 0 when the raw form volume is less than 0', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '-1' }
      )
      expect(result.aspirate_airGap_volume).toEqual('0')
    })
    it('should update the aspirate > air gap volume to the pipette capacity - min pipette volume when the air gap volume is too big', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '100' }, form)
      expect(result.aspirate_airGap_volume).toEqual('9')
    })
    it('should update the aspirate > air gap volume to the pipette capacity - min pipette volume when the raw form air gap volume is too big', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '10' }
      )
      expect(result.aspirate_airGap_volume).toEqual('9')
    })
    it('should NOT update when the patch volume is greater than the min pipette volume', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '2' }, form)
      expect(result.aspirate_airGap_volume).toEqual('2')
    })
    it('should NOT update when the raw form volume is greater than the min pipette volume', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '2' }
      )
      expect(result.aspirate_airGap_volume).toBeUndefined()
    })
    it('should NOT update when the patch volume is equal to the min pipette volume', () => {
      const result = handleFormHelper({ aspirate_airGap_volume: '1' }, form)
      expect(result.aspirate_airGap_volume).toEqual('1')
    })
    it('should NOT update when the raw form volume is equal to the min pipette volume', () => {
      const result = handleFormHelper(
        {},
        { ...form, aspirate_airGap_volume: '1' }
      )
      expect(result.aspirate_airGap_volume).toBeUndefined()
    })
    it('should reset to pipette min when pipette is changed', () => {
      const result = handleFormHelper({ pipette: 'otherPipetteId' }, form)
      expect(result.aspirate_airGap_volume).toEqual('30')
    })
  })
  describe('when the path is multi dispense', () => {
    const form = {
      path: 'multiDispense',
      aspirate_wells: ['A1'],
      dispense_wells: ['B2', 'B3'],
      volume: '2',
      pipette: 'pipetteId',
      disposalVolume_checkbox: true,
      disposalVolume_volume: '1.1',
      aspirate_airGap_checkbox: false,
      aspirate_airGap_volume: null,
    }
    it('should reset to pipette min when pipette is changed', () => {
      const result = handleFormHelper({ pipette: 'otherPipetteId' }, form)
      expect(result).toMatchObject({ aspirate_airGap_volume: '30' })
    })
  })
})

describe('air gap > dispense volume', () => {
  const paths = ['single', 'multiAspirate']
  paths.forEach(path => {
    // max should equal pipette/tip capacity for single and for multi-dispense

    it(`should reset dispense > air gap volume when pipette field is changed, for ${path} path`, () => {
      // for otherPipetteId, P300, capacity is 300 so 150 is below air gap max
      const form = {
        path,
        aspirate_wells: ['A1'],
        dispense_wells: ['B2', 'B3'],
        volume: '2',
        pipette: 'otherPipetteId',
        disposalVolume_checkbox: true,
        disposalVolume_volume: '1.1',
        dispense_airGap_checkbox: true,
        dispense_airGap_volume: '150',
      }
      const result = handleFormHelper({ pipette: 'pipetteId' }, form)
      // new max should be 10 for the P10
      expect(result).toMatchObject({ dispense_airGap_volume: '1' })
    })

    it(`should clamp max dispense > air gap when dispense_airGap_volume field is changed, for ${path} path`, () => {
      const form = {
        path,
        aspirate_wells: ['A1', 'A2'],
        dispense_wells: ['B2'],
        volume: '2',
        pipette: 'pipetteId',
        disposalVolume_checkbox: true,
        disposalVolume_volume: '1.1',
        dispense_airGap_checkbox: true,
        dispense_airGap_volume: '2',
      }
      const result = handleFormHelper({ dispense_airGap_volume: '29' }, form)
      // clamp to max, which should be 10 for the P10
      expect(result).toMatchObject({ dispense_airGap_volume: '10' })
    })
  })

  it('should clamp max dispense > air gap when going from single path to multiDispense', () => {
    // NOTE: multiDispense is potentially lower max than single, so changing the path can cause this clamp
    const form = {
      path: 'single',
      aspirate_wells: ['A1'],
      dispense_wells: ['B2', 'B3'],
      volume: '5',
      pipette: 'pipetteId',
      // NOTE: disposal volume is cleared out when changing the path to multiDispense,
      // so should not affect the clamp
      disposalVolume_checkbox: true,
      disposalVolume_volume: '4',
      dispense_airGap_checkbox: true,
      dispense_airGap_volume: '9',
    }
    const result = handleFormHelper({ path: 'multiDispense' }, form)
    expect(result).toMatchObject({
      dispense_airGap_volume: String(10 - 0 - 5),

      // this isn't specific to dispense > air gap
      path: 'multiDispense',
      disposalVolume_checkbox: false,
      disposalVolume_volume: null,
    })
  })

  const multiDispenseCases = [
    {
      update: { dispense_airGap_volume: '300' },
      expected: {
        dispense_airGap_volume: String(300 - 1.1 - 2),
      },
    },
    {
      // NOTE: when pipette changes, the dispense > air gap volume gets reset to the min pipette volume
      update: { pipette: 'pipetteId' },
      expected: {
        pipette: 'pipetteId',
        dispense_airGap_volume: String(1),
      },
    },
    {
      update: { disposalVolume_volume: '50' },
      expected: {
        dispense_airGap_volume: String(300 - 50 - 2),
      },
    },
    {
      update: { volume: '55' },
      expected: {
        dispense_airGap_volume: String(300 - 1.1 - 55),
      },
    },
  ]
  // Multi-dispense max is different: max = pipette/tip capacity - disposal volume - transfer volume
  // Ensure updating ANY one of the fields will cause the clamp (selected pipette, disposal volume, transfer volume, air gap)
  multiDispenseCases.forEach(({ update, expected }) => {
    it(`should clamp max air gap > dispense volume, if path is multi-dispense, when field '${Object.keys(
      update
    ).join(', ')}' updated`, () => {
      const form = {
        path: 'multiDispense',
        aspirate_wells: ['A1'],
        dispense_wells: ['B2', 'B3'],
        volume: '2',
        pipette: 'otherPipetteId',
        disposalVolume_checkbox: true,
        disposalVolume_volume: '1.1',
        dispense_airGap_checkbox: true,
        dispense_airGap_volume: '295',
      }
      const result = handleFormHelper(update, form)
      expect(result).toMatchObject(expected)
    })
  })
})
