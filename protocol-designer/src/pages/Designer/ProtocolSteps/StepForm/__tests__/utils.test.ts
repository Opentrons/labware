import { describe, it, expect } from 'vitest'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '@opentrons/step-generation'
import {
  capitalizeFirstLetter,
  getBlowoutLocationOptionsForForm,
  getFormErrorsMappedToField,
  getFormLevelError,
} from '../utils'

const BASE_VISIBLE_FORM_ERROR = {
  title: 'form level error title',
  dependentFields: ['field1', 'field2'],
}

const MAPPED_ERRORS = {
  field1: {
    title: 'form level error title',
    dependentFields: ['field1', 'field2'],
    showAtField: true,
    showAtForm: true,
  },
}

describe('getBlowoutLocationOptionsForForm', () => {
  const destOption = {
    name: 'Destination Well',
    value: DEST_WELL_BLOWOUT_DESTINATION,
  }
  const sourceOption = {
    name: 'Source Well',
    value: SOURCE_WELL_BLOWOUT_DESTINATION,
  }

  it('should return destination option for mix stepType', () => {
    const result = getBlowoutLocationOptionsForForm({ stepType: 'mix' })
    expect(result).toEqual([destOption])
  })

  it('should return source and destination options for moveLiquid stepType with single path', () => {
    const result = getBlowoutLocationOptionsForForm({
      stepType: 'moveLiquid',
      path: 'single',
    })
    expect(result).toEqual([sourceOption, destOption])
  })

  it('should return source option and disabled destination option for moveLiquid stepType with multiDispense path', () => {
    const result = getBlowoutLocationOptionsForForm({
      stepType: 'moveLiquid',
      path: 'multiDispense',
    })
    expect(result).toEqual([sourceOption, { ...destOption, disabled: true }])
  })

  it('should return disabled source option and destination option for moveLiquid stepType with multiAspirate path', () => {
    const result = getBlowoutLocationOptionsForForm({
      stepType: 'moveLiquid',
      path: 'multiAspirate',
    })
    expect(result).toEqual([{ ...sourceOption, disabled: true }, destOption])
  })

  it('should return disabled source and destination options for moveLiquid stepType with undefined path', () => {
    const result = getBlowoutLocationOptionsForForm({ stepType: 'moveLiquid' })
    expect(result).toEqual([
      { ...sourceOption, disabled: true },
      { ...destOption, disabled: true },
    ])
  })

  it('should return an empty array for unknown stepType', () => {
    const result = getBlowoutLocationOptionsForForm({ stepType: 'comment' })
    expect(result).toEqual([])
  })
})

describe('capitalizeFirstLetter', () => {
  it('should capitalize the first letter of a step name and leave the rest unchanged', () => {
    const stepName = 'move labware to D3 on top of Magnetic Block'
    expect(capitalizeFirstLetter(stepName)).toBe(
      'Move labware to D3 on top of Magnetic Block'
    )
  })

  it('should capitalize the first letter of a step name and leave the rest unchanged', () => {
    const moduleName = 'Heater-shaker'
    expect(capitalizeFirstLetter(moduleName)).toBe('Heater-Shaker')
  })
})

describe('getFormErrorsMappedToField', () => {
  it('should flatten form-level errors to an object keyed by each implicated field with form-level error as the value', () => {
    const result = getFormErrorsMappedToField([BASE_VISIBLE_FORM_ERROR])
    expect(result).toEqual({
      field1: {
        ...BASE_VISIBLE_FORM_ERROR,
        showAtField: true,
        showAtForm: true,
      },
      field2: {
        ...BASE_VISIBLE_FORM_ERROR,
        showAtField: true,
        showAtForm: true,
      },
    })
  })
  it('should maintain booleans for showAtForm and showAtField', () => {
    const result = getFormErrorsMappedToField([
      { ...BASE_VISIBLE_FORM_ERROR, showAtForm: false },
    ])
    expect(result).toEqual({
      field1: {
        ...BASE_VISIBLE_FORM_ERROR,
        showAtField: true,
        showAtForm: false,
      },
      field2: {
        ...BASE_VISIBLE_FORM_ERROR,
        showAtField: true,
        showAtForm: false,
      },
    })
  })
})

describe('getFormLevelError', () => {
  it('shows form-level error at field when showAtField is true', () => {
    const result = getFormLevelError('field1', MAPPED_ERRORS)
    expect(result).toEqual('form level error title')
  })

  it('shows no form-level error at field when showAtField is false', () => {
    const result = getFormLevelError('field1', {
      ...MAPPED_ERRORS,
      field1: { ...MAPPED_ERRORS.field1, showAtField: false },
    })
    expect(result).toBeNull()
  })
})
