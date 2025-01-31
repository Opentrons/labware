import { describe, expect, it } from 'vitest'
import { capitalizeFirstLetterAfterNumber } from '../utils'

describe('capitalizeFirstLetterAfterNumber', () => {
  it('should capitalize the first letter of a step type', () => {
    expect(capitalizeFirstLetterAfterNumber('1. heater-shaker')).toBe(
      '1. Heater-Shaker'
    )
    expect(capitalizeFirstLetterAfterNumber('22. thermocycler')).toBe(
      '22. Thermocycler'
    )
  })
})
