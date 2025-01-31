import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { PAUSE_UNTIL_TIME } from '../../constants'

import type { ProtocolFile } from '@opentrons/shared-data'
import type { PauseForm } from '../../form-types'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

const getTimeFromIndividualUnits = (
  seconds: any,
  minutes: any,
  hours?: any
): string => {
  const pad = (num: number): string => String(num).padStart(2, '0')
  const hoursString = hours !== undefined ? `${pad(Number(hours) ?? 0)}:` : ''
  return `${hoursString}${pad(Number(minutes) ?? 0)}:${pad(
    Number(seconds) ?? 0
  )}`
}

export const migrateFile = (
  appData: ProtocolFile<DesignerApplicationData>
): ProtocolFile<DesignerApplicationData> => {
  const { designerApplication } = appData

  if (designerApplication == null || designerApplication?.data == null) {
    throw Error('The designerApplication key in your file is corrupt.')
  }

  const savedStepForms = designerApplication.data
    ?.savedStepForms as DesignerApplicationData['savedStepForms']

  const savedStepsWithConsolidatedTimeField = Object.values(
    savedStepForms
  ).reduce((acc, form) => {
    if (form.stepType === 'pause') {
      const {
        id,
        pauseHour,
        pauseMinute,
        pauseSecond,
        pauseTime,
        pauseAction,
      } = form
      const pauseFormIndividualTimeUnitsRemoved = Object.keys(
        form as PauseForm
      ).reduce(
        (accInner, key) =>
          !['pauseSecond', 'pauseMinute', 'pauseHour'].includes(key)
            ? { ...accInner, [key]: form[key] }
            : accInner,
        { pauseTime }
      )

      if (pauseAction !== PAUSE_UNTIL_TIME) {
        return {
          ...acc,
          [id]: { ...pauseFormIndividualTimeUnitsRemoved, pauseTime: null },
        }
      }

      return pauseTime != null
        ? { ...acc, [id]: pauseFormIndividualTimeUnitsRemoved }
        : {
            ...acc,
            [id]: {
              ...pauseFormIndividualTimeUnitsRemoved,
              pauseTime: getTimeFromIndividualUnits(
                pauseSecond,
                pauseMinute,
                pauseHour
              ),
            },
          }
    } else if (form.stepType === 'heaterShaker') {
      const {
        id,
        heaterShakerTimerMinutes,
        heaterShakerTimerSeconds,
        heaterShakerTimer,
        heaterShakerSetTimer,
      } = form

      const heaterShakerFormIndividualTimeUnitsRemoved = Object.keys(
        form as Object
      ).reduce(
        (accInner, key) =>
          !['heaterShakerTimerMinutes', 'heaterShakerTimerSeconds'].includes(
            key
          )
            ? { ...accInner, [key]: form[key] }
            : accInner,
        { heaterShakerTimer }
      )
      if (!heaterShakerSetTimer) {
        return {
          ...acc,
          [id]: {
            ...heaterShakerFormIndividualTimeUnitsRemoved,
            heaterShakerTimer: null,
          },
        }
      }

      return heaterShakerTimer != null
        ? { ...acc, [id]: heaterShakerFormIndividualTimeUnitsRemoved }
        : {
            ...acc,
            [id]: {
              ...heaterShakerFormIndividualTimeUnitsRemoved,
              heaterShakerTimer: getTimeFromIndividualUnits(
                heaterShakerTimerSeconds,
                heaterShakerTimerMinutes
              ),
            },
          }
    }
    return acc
  }, {})

  const updatedInitialStep = Object.values(savedStepForms).reduce(
    (acc, form) => {
      const { id, moduleLocationUpdate } = form
      if (
        moduleLocationUpdate != null &&
        id === '__INITIAL_DECK_SETUP_STEP__' &&
        appData.robot.model === OT2_ROBOT_TYPE
      ) {
        const moduleLocationUpdateThermocyclerOT2Slot = Object.keys(
          moduleLocationUpdate as Record<string, string>
        ).reduce((acc, key) => {
          return moduleLocationUpdate[key] === 'span7_8_10_11'
            ? { ...acc, [key]: '7' }
            : { ...acc, [key]: moduleLocationUpdate[key] }
        }, {})
        return {
          ...acc,
          [id]: {
            ...form,
            moduleLocationUpdate: moduleLocationUpdateThermocyclerOT2Slot,
          },
        }
      }
      return acc
    },
    {}
  )

  return {
    ...appData,
    designerApplication: {
      ...designerApplication,
      data: {
        ...designerApplication.data,
        savedStepForms: {
          ...designerApplication.data.savedStepForms,
          ...savedStepsWithConsolidatedTimeField,
          ...updatedInitialStep,
        },
      },
    },
  }
}
