import { describe, it, expect } from 'vitest'
import { calcTextAreaHeight } from '../index'

describe('calcTextAreaHeight', () => {
  it('should return the correct number of lines', () => {
    const input = 'Hello\nWorld\nThis is testing data.'
    const expectedOutput = 3
    const result = calcTextAreaHeight(input)
    expect(result).toEqual(expectedOutput)
  })
})
