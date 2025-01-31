/** Ensure that the deck schema itself functions as intended,
 *  and that all v4 protocol fixtures will validate */
import Ajv from 'ajv'
import path from 'path'
import glob from 'glob'
import { describe, expect, it } from 'vitest'
import deckSchema from '../../deck/schemas/3.json'
import deckSchemaV4 from '../../deck/schemas/4.json'
import deckSchemaV5 from '../../deck/schemas/5.json'
import deckSchemaV6 from '../../deck/schemas/6.json'

const fixtureGlob = path.join(__dirname, '../../deck/fixtures/3/*.json')
const defGlob = path.join(__dirname, '../../deck/definitions/3/*.json')
const defV4Glob = path.join(__dirname, '../../deck/definitions/4/*.json')
const defV5Glob = path.join(__dirname, '../../deck/definitions/5/*.json')
const defV6Glob = path.join(__dirname, '../../deck/definitions/6/*.json')

const ajv = new Ajv({ allErrors: true, jsonPointers: true })

describe('validate v3 deck defs and fixtures', () => {
  const validateSchemaV3 = ajv.compile(deckSchema)
  const fixtures = glob.sync(fixtureGlob)

  fixtures.forEach(fixturePath => {
    const fixtureDef = require(fixturePath)

    it(`${fixturePath} validates against schema`, () => {
      const valid = validateSchemaV3(fixtureDef)
      const validationErrors = validateSchemaV3.errors

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

  const defs = glob.sync(defGlob)

  defs.forEach(defPath => {
    const deckDef = require(defPath)

    it(`${defPath} validates against v3 schema`, () => {
      const valid = validateSchemaV3(deckDef)
      const validationErrors = validateSchemaV3.errors

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

describe('validate v4 deck defs', () => {
  const defs = glob.sync(defV4Glob)
  const validateSchemaV4 = ajv.compile(deckSchemaV4)

  defs.forEach(defPath => {
    const deckDef = require(defPath)

    it(`${defPath} validates against v4 schema`, () => {
      const valid = validateSchemaV4(deckDef)
      const validationErrors = validateSchemaV4.errors

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

describe('validate v5 deck defs', () => {
  const defs = glob.sync(defV5Glob)
  const validateSchemaV5 = ajv.compile(deckSchemaV5)

  defs.forEach(defPath => {
    const deckDef = require(defPath)
    const defBase = path.parse(defPath).base
    it(`${defBase} validates against v5 schema`, () => {
      const valid = validateSchemaV5(deckDef)
      const validationErrors = validateSchemaV5.errors

      if (validationErrors) {
        console.log(defBase + ' ' + JSON.stringify(validationErrors, null, 4))
      }
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })
})

describe('validate v6 deck defs', () => {
  const defs = glob.sync(defV6Glob)
  const validateSchemaV6 = ajv.compile(deckSchemaV6)
  defs.forEach(defPath => {
    const deckDef = require(defPath)
    const defBase = path.parse(defPath).base
    it(`${defPath} validates against v6 schema`, () => {
      const valid = validateSchemaV6(deckDef)
      const validationErrors = validateSchemaV6.errors

      if (validationErrors) {
        console.log(defBase + ' ' + JSON.stringify(validationErrors, null, 4))
      }
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })
})
