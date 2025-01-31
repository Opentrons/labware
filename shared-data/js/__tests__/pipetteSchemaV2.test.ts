import Ajv from 'ajv'
import glob from 'glob'
import path from 'path'
import { describe, expect, it } from 'vitest'

import liquidSpecsSchema from '../../pipette/schemas/2/pipetteLiquidPropertiesSchema.json'
import geometrySpecsSchema from '../../pipette/schemas/2/pipetteGeometrySchema.json'
import generalSpecsSchema from '../../pipette/schemas/2/pipettePropertiesSchema.json'

const allGeometryDefinitions = path.join(
  __dirname,
  '../../pipette/definitions/2/geometry/**/**/*.json'
)

const allGeneralDefinitions = path.join(
  __dirname,
  '../../pipette/definitions/2/general/**/**/*.json'
)

const allLiquidDefinitions = path.join(
  __dirname,
  '../../pipette/definitions/2/liquid/**/**/*.json'
)

const ajv = new Ajv({ allErrors: true, jsonPointers: true })

const validateLiquidSpecs = ajv.compile(liquidSpecsSchema)
const validateGeometrySpecs = ajv.compile(geometrySpecsSchema)
const validateGeneralSpecs = ajv.compile(generalSpecsSchema)

describe('test schema against all liquid specs definitions', () => {
  const liquidPaths = glob.sync(allLiquidDefinitions)
  // Make sure definitions path didn't break, which would give you false positives
  expect(liquidPaths.length).toBeGreaterThan(0)

  liquidPaths.forEach(liquidPath => {
    const liquidDef = require(liquidPath)

    it(`${liquidPath} validates against schema`, () => {
      const valid = validateLiquidSpecs(liquidDef)
      const validationErrors = validateLiquidSpecs.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    it(`parent dir matches a liquid class: ${liquidPath}`, () => {
      expect(['default', 'lowVolumeDefault']).toContain(
        path.basename(path.dirname(liquidPath))
      )
    })

    it(`second parent dir matches pipette model: ${liquidPath}`, () => {
      expect(['p10', 'p20', 'p50', 'p200', 'p300', 'p1000']).toContain(
        path.basename(path.dirname(path.dirname(liquidPath)))
      )
    })
  })
})

describe('test schema against all geometry specs definitions', () => {
  const geometryPaths = glob.sync(allGeometryDefinitions)
  // Make sure definitions path didn't break, which would give you false positives
  expect(geometryPaths.length).toBeGreaterThan(0)
  geometryPaths.forEach(geometryPath => {
    const geometryDef = require(geometryPath)
    const geometryParentDir = path.dirname(geometryPath)

    it(`${geometryPath} validates against schema`, () => {
      const valid = validateGeometrySpecs(geometryDef)
      const validationErrors = validateGeometrySpecs.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    it(`parent dir matches pipette model: ${geometryPath}`, () => {
      expect(['p10', 'p20', 'p50', 'p200', 'p300', 'p1000']).toContain(
        path.basename(path.dirname(geometryPath))
      )
    })

    it(`parent directory contains a gltf file: ${geometryPath}`, () => {
      const gltf_file = glob.sync(path.join(geometryParentDir, '*.gltf'))
      expect(gltf_file.length).toBeGreaterThan(0)
      expect(gltf_file).toBeDefined()
    })
  })
})

describe('test schema against all general specs definitions', () => {
  const generalPaths = glob.sync(allGeneralDefinitions)
  expect(generalPaths.length).toBeGreaterThan(0)

  generalPaths.forEach(generalPath => {
    it(`${generalPath} validates against schema`, () => {
      const generalDef = require(generalPath)
      const valid = validateGeneralSpecs(generalDef)
      const validationErrors = validateGeneralSpecs.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    it(`parent dir matches pipette model: ${generalPath}`, () => {
      expect(['p10', 'p20', 'p50', 'p200', 'p300', 'p1000']).toContain(
        path.basename(path.dirname(generalPath))
      )
    })
  })
})
