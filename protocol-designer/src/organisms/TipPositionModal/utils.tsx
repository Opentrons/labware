import floor from 'lodash/floor'
import round from 'lodash/round'
import { getIsTouchTipField } from '../../form-types'
import {
  DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
  DEFAULT_MM_FROM_BOTTOM_DISPENSE,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
} from '../../constants'
import { DECIMALS_ALLOWED, TOO_MANY_DECIMALS } from './constants'
import type { StepFieldName } from '../../form-types'

export function getDefaultMmFromBottom(args: {
  name: StepFieldName
  wellDepthMm: number
}): number {
  const { name, wellDepthMm } = args

  switch (name) {
    case 'aspirate_mmFromBottom':
      return DEFAULT_MM_FROM_BOTTOM_ASPIRATE

    case 'aspirate_delay_mmFromBottom':
      return DEFAULT_MM_FROM_BOTTOM_ASPIRATE

    case 'dispense_mmFromBottom':
      return DEFAULT_MM_FROM_BOTTOM_DISPENSE

    case 'dispense_delay_mmFromBottom':
      return DEFAULT_MM_FROM_BOTTOM_DISPENSE

    case 'mix_mmFromBottom':
      // TODO: Ian 2018-11-131 figure out what offset makes most sense for mix
      return DEFAULT_MM_FROM_BOTTOM_DISPENSE

    default:
      // touch tip fields
      console.assert(
        getIsTouchTipField(name),
        `getDefaultMmFromBottom fn does not know what to do with field ${name}`
      )
      return DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP + wellDepthMm
  }
}

export const roundValue = (
  value: number | string | null,
  direction: 'up' | 'down'
): number => {
  if (value === null) return 0

  switch (direction) {
    case 'up': {
      return round(Number(value), DECIMALS_ALLOWED)
    }
    case 'down': {
      return floor(Number(value), DECIMALS_ALLOWED)
    }
  }
}

const OUT_OF_BOUNDS: 'OUT_OF_BOUNDS' = 'OUT_OF_BOUNDS'
export type Error = typeof TOO_MANY_DECIMALS | typeof OUT_OF_BOUNDS

export const getErrorText = (args: {
  errors: Error[]
  maxMm: number
  minMm: number
  isPristine: boolean
  t: any
}): string | null => {
  const { errors, minMm, maxMm, isPristine, t } = args

  if (errors.includes(TOO_MANY_DECIMALS)) {
    return t('tip_position.errors.TOO_MANY_DECIMALS')
  } else if (!isPristine && errors.includes(OUT_OF_BOUNDS)) {
    return t('tip_position.errors.OUT_OF_BOUNDS', {
      minMm,
      maxMm,
    })
  } else {
    return null
  }
}

export const getErrors = (args: {
  value: string | null
  maxMm: number
  minMm: number
}): Error[] => {
  const { value: rawValue, maxMm, minMm } = args
  const errors: Error[] = []

  const value = Number(rawValue)
  if (rawValue === null || Number.isNaN(value)) {
    // blank or otherwise invalid should show this error as a fallback
    return [OUT_OF_BOUNDS]
  }
  const hasIncorrectDecimals = round(value, DECIMALS_ALLOWED) !== value
  const isOutOfBounds = value > maxMm || value < minMm

  if (hasIncorrectDecimals) {
    errors.push(TOO_MANY_DECIMALS)
  }
  if (isOutOfBounds) {
    errors.push(OUT_OF_BOUNDS)
  }
  return errors
}

interface MinMaxValues {
  minValue: number
  maxValue: number
}

export const getMinMaxWidth = (width: number): MinMaxValues => {
  return {
    minValue: -width * 0.5,
    maxValue: width * 0.5,
  }
}
