import path from 'path'
import glob from 'glob'
import { describe, expect, it, beforeAll } from 'vitest'

const definitionsGlobPath = path.join(
  __dirname,
  '../../labware/definitions/2/**/*.json'
)

const EXPECTED_VALID_QUIRKS = [
  'centerMultichannelOnWells',
  'touchTipDisabled',
  'fixedTrash',
  'gripperIncompatible',
  'tiprackAdapterFor96Channel',
  'stackingMaxFive',
  'stackingOnly',
]

describe('check quirks for all labware defs', () => {
  const labwarePaths = glob.sync(definitionsGlobPath)

  beforeAll(() => {
    // Make sure definitions path didn't break, which would give you false positives
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  labwarePaths.forEach(labwarePath => {
    const defname = path.basename(path.dirname(labwarePath))

    it(`${defname} has valid quirks`, () => {
      const labwareDef = require(labwarePath)

      const quirks = labwareDef.parameters.quirks || []
      // we want to test that the quirks in the def are a subset of validQuirks,
      // whereas arrayContaining tests that the expected value is a subset of
      // the value under test. Unfortunately that means we have to do it backwards
      expect(EXPECTED_VALID_QUIRKS).toEqual(expect.arrayContaining(quirks))
    })
  })
})
