import path from 'path'
import glob from 'glob'
import { describe, expect, it, beforeAll, test } from 'vitest'

import type { LabwareDefinition3 } from '../types'
import Ajv from 'ajv'
import schema from '../../labware/schemas/3.json'

const fixturesDir = path.join(__dirname, '../../labware/fixtures/3')
const globPattern = '**/*.json'

const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(schema)

const checkGeometryDefinitions = (
  labwareDef: LabwareDefinition3,
  filename: string
): void => {
  test(`all geometryDefinitionIds specified in {filename} should have an accompanying valid entry in innerLabwareGeometry`, () => {
    for (const wellName in labwareDef.wells) {
      const wellGeometryId = labwareDef.wells[wellName].geometryDefinitionId

      if (wellGeometryId === undefined) {
        return
      }
      if (
        labwareDef.innerLabwareGeometry === null ||
        labwareDef.innerLabwareGeometry === undefined
      ) {
        return
      }

      expect(wellGeometryId in labwareDef.innerLabwareGeometry).toBe(true)

      const wellDepth = labwareDef.wells[wellName].depth
      const wellShape = labwareDef.wells[wellName].shape
      const topFrustumHeight =
        labwareDef.innerLabwareGeometry[wellGeometryId].frusta[0].topHeight
      const topFrustumShape =
        labwareDef.innerLabwareGeometry[wellGeometryId].frusta[0].geometry.shape

      expect(wellDepth).toEqual(topFrustumHeight)
      expect(wellShape).toEqual(topFrustumShape)
    }
  })
}

describe(`test additions to labware schema in v3`, () => {
  const labwarePaths = glob.sync(globPattern, { cwd: fixturesDir })

  beforeAll(() => {
    // Make sure definitions path didn't break, which would give you false positives
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  labwarePaths.forEach(labwarePath => {
    const filename = path.parse(labwarePath).base
    const fullLabwarePath = path.join(fixturesDir, labwarePath)
    const labwareDef = require(fullLabwarePath) as LabwareDefinition3

    checkGeometryDefinitions(labwareDef, labwarePath)

    it(`${filename} validates against schema`, () => {
      const valid = validate(labwareDef)
      const validationErrors = validate.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })
})
