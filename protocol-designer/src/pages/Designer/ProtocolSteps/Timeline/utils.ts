import round from 'lodash/round'
import uniq from 'lodash/uniq'
import { UAParser } from 'ua-parser-js'

import type { MouseEvent } from 'react'
import type { StepIdType } from '../../../../form-types'

export const capitalizeFirstLetterAfterNumber = (title: string): string =>
  title.replace(
    /(^[\d\W]*)([a-zA-Z])|(-[a-zA-Z])/g,
    (match, prefix, firstLetter) => {
      if (prefix) {
        return `${prefix}${firstLetter.toUpperCase()}`
      } else {
        return `${match.charAt(0)}${match.charAt(1).toUpperCase()}`
      }
    }
  )

const VOLUME_SIG_DIGITS_DEFAULT = 2
export function formatVolume(
  inputVolume?: string | number | null,
  sigDigits: number = VOLUME_SIG_DIGITS_DEFAULT
): string {
  if (typeof inputVolume === 'number') {
    // don't add digits to numbers with nothing to the right of the decimal
    const digits = inputVolume.toString().split('.')[1] ? sigDigits : 0
    return String(round(inputVolume, digits))
  }

  return inputVolume || ''
}
const PERCENTAGE_DECIMALS_ALLOWED = 1
export const formatPercentage = (part: number, total: number): string => {
  return `${round((part / total) * 100, PERCENTAGE_DECIMALS_ALLOWED)}%`
}

export const getMetaSelectedSteps = (
  multiSelectItemIds: StepIdType[] | null,
  stepId: StepIdType,
  selectedStepId: StepIdType | null
): StepIdType[] => {
  let stepsToSelect: StepIdType[]
  if (multiSelectItemIds?.length) {
    // already have a selection, add/remove the meta-clicked item
    stepsToSelect = multiSelectItemIds.includes(stepId)
      ? multiSelectItemIds.filter(id => id !== stepId)
      : [...multiSelectItemIds, stepId]
  } else if (selectedStepId && selectedStepId === stepId) {
    // meta-clicked on the selected single step
    stepsToSelect = [selectedStepId]
  } else if (selectedStepId) {
    // meta-clicked on a different step, multi-select both
    stepsToSelect = [selectedStepId, stepId]
  } else {
    // meta-clicked on a step when a terminal item was selected
    stepsToSelect = [stepId]
  }
  return stepsToSelect
}

export const getShiftSelectedSteps = (
  selectedStepId: StepIdType | null,
  orderedStepIds: StepIdType[],
  stepId: StepIdType,
  multiSelectItemIds: StepIdType[] | null,
  lastMultiSelectedStepId: StepIdType | null
): StepIdType[] => {
  let stepsToSelect: StepIdType[]
  if (selectedStepId) {
    stepsToSelect = getOrderedStepsInRange(
      selectedStepId,
      stepId,
      orderedStepIds
    )
  } else if (multiSelectItemIds?.length && lastMultiSelectedStepId) {
    const potentialStepsToSelect = getOrderedStepsInRange(
      lastMultiSelectedStepId,
      stepId,
      orderedStepIds
    )

    const allSelected: boolean = potentialStepsToSelect
      .slice(1)
      .every(stepId => multiSelectItemIds.includes(stepId))

    if (allSelected) {
      // if they're all selected, deselect them all
      if (multiSelectItemIds.length - potentialStepsToSelect.length > 0) {
        stepsToSelect = multiSelectItemIds.filter(
          (id: StepIdType) => !potentialStepsToSelect.includes(id)
        )
      } else {
        // unless deselecting them all results in none being selected
        stepsToSelect = [potentialStepsToSelect[0]]
      }
    } else {
      stepsToSelect = uniq([...multiSelectItemIds, ...potentialStepsToSelect])
    }
  } else {
    stepsToSelect = [stepId]
  }
  return stepsToSelect
}

const getOrderedStepsInRange = (
  lastSelectedStepId: StepIdType,
  stepId: StepIdType,
  orderedStepIds: StepIdType[]
): StepIdType[] => {
  const prevIndex: number = orderedStepIds.indexOf(lastSelectedStepId)
  const currentIndex: number = orderedStepIds.indexOf(stepId)

  const [startIndex, endIndex] = [prevIndex, currentIndex].sort((a, b) => a - b)
  const orderedSteps = orderedStepIds.slice(startIndex, endIndex + 1)
  return orderedSteps
}

export const nonePressed = (keysPressed: boolean[]): boolean =>
  keysPressed.every(keyPress => keyPress === false)

export const getMouseClickKeyInfo = (
  event: MouseEvent
): { isShiftKeyPressed: boolean; isMetaKeyPressed: boolean } => {
  const isMac: boolean = getUserOS() === 'Mac OS'
  const isShiftKeyPressed: boolean = event.shiftKey
  const isMetaKeyPressed: boolean =
    (isMac && event.metaKey) || (!isMac && event.ctrlKey)
  return { isShiftKeyPressed, isMetaKeyPressed }
}

const getUserOS = (): string | undefined => new UAParser().getOS().name
