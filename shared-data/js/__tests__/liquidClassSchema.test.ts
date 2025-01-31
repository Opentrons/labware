/** Ensure that the liquid class schema itself functions as intended,
 *  and that all v1 liquid class fixtures will validate */
import Ajv from 'ajv'
import path from 'path'
import glob from 'glob'
import { describe, expect, it } from 'vitest'
import liquidClassSchemaV1 from '../../liquid-class/schemas/1.json'

const fixtureV1Glob = path.join(
  __dirname,
  '../../liquid-class/fixtures/1/*.json'
)
const defV1Glob = path.join(
  __dirname,
  '../../liquid-class/definitions/1/*.json'
)

const ajv = new Ajv({ allErrors: true, jsonPointers: true })

const validateSchemaV1 = ajv.compile(liquidClassSchemaV1)

describe('validate v1 liquid class definitions and fixtures', () => {
  const fixtures = glob.sync(fixtureV1Glob)

  fixtures.forEach(fixturePath => {
    const fixtureDef = require(fixturePath)

    it('fixture validates against schema', () => {
      const valid = validateSchemaV1(fixtureDef)
      const validationErrors = validateSchemaV1.errors

      if (validationErrors) {
        console.log(
          path.parse(fixturePath).base +
            ' ' +
            JSON.stringify(validationErrors, null, 4)
        )
      }

      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })

  const defs = glob.sync(defV1Glob)

  defs.forEach(defPath => {
    const liquidClassDef = require(defPath)

    it('liquid class definition validates against v1 schema', () => {
      const valid = validateSchemaV1(liquidClassDef)
      const validationErrors = validateSchemaV1.errors

      if (validationErrors) {
        console.log(
          path.parse(defPath).base +
            ' ' +
            JSON.stringify(validationErrors, null, 4)
        )
      }

      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })
})
