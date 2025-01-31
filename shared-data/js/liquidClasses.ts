import waterV1Uncasted from '../liquid-class/definitions/1/water.json'
import type { LiquidClass } from '.'

const waterV1 = waterV1Uncasted as LiquidClass

const defs = { waterV1 }

export const getAllLiquidClassDefs = (): Record<string, LiquidClass> => defs
