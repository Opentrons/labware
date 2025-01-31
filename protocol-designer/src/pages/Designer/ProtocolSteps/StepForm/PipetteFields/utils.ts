import { getWellRatio } from '../../../../../steplist/utils'
import type { PathOption, StepType } from '../../../../../form-types'
import { getPipetteCapacity } from '../../../../../pipettes/pipetteData'
import {
  volumeInCapacityForMultiDispense,
  volumeInCapacityForMultiAspirate,
} from '../../../../../steplist/formLevel/handleFormChange/utils'
import type {
  ChangeTipOptions,
  PipetteEntities,
} from '@opentrons/step-generation'

export interface DisabledChangeTipArgs {
  aspirateWells?: string[]
  dispenseWells?: string[]
  stepType?: StepType
  path?: PathOption | null | undefined
  isDisposalLocation?: boolean
}
export const getDisabledChangeTipOptions = (
  args: DisabledChangeTipArgs
): Set<ChangeTipOptions> | null | undefined => {
  const {
    path,
    aspirateWells,
    dispenseWells,
    stepType,
    isDisposalLocation,
  } = args

  switch (stepType) {
    case 'moveLiquid': {
      const wellRatio = getWellRatio(
        aspirateWells,
        dispenseWells,
        isDisposalLocation
      )

      //  ensure wells are selected
      if (wellRatio != null && path === 'single') {
        if (wellRatio === '1:many') {
          return new Set(['perSource'])
        }

        return new Set(['perDest'])
      }

      // path is multi
      return new Set(['perSource', 'perDest'])
    }

    case 'mix': {
      return new Set(['perSource', 'perDest'])
    }

    default: {
      console.warn(
        `getChangeTipOptions for stepType ${String(
          stepType
        )} not yet implemented!`
      )
      return null
    }
  }
}

export type DisabledPathMap = Partial<Record<PathOption, string>> | null
export interface ValuesForPath {
  aspirate_airGap_checkbox?: boolean | null
  aspirate_airGap_volume?: string | null
  aspirate_wells?: string[] | null
  changeTip: ChangeTipOptions
  dispense_wells?: string[] | null
  pipette?: string | null
  volume?: string | null
  tipRack?: string | null
  isDisposalLocation?: boolean
}
export function getDisabledPathMap(
  values: ValuesForPath,
  pipetteEntities: PipetteEntities,
  t: any
): DisabledPathMap {
  const {
    aspirate_airGap_checkbox,
    aspirate_wells,
    changeTip,
    dispense_wells,
    pipette,
    tipRack,
    isDisposalLocation,
  } = values
  if (!pipette) return null
  const wellRatio = getWellRatio(
    aspirate_wells,
    dispense_wells,
    isDisposalLocation
  )

  let disabledPathMap: Partial<Record<PathOption, string>> = {}

  // changeTip is lowest priority disable reasoning
  if (changeTip === 'perDest') {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: t(
        'step_edit_form.field.path.subtitle.incompatible_with_per_dest'
      ),
    }
  } else if (changeTip === 'perSource') {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: t(
        'step_edit_form.field.path.subtitle.incompatible_with_per_source'
      ),
    }
  }

  // transfer volume overwrites change tip disable reasoning
  const pipetteEntity = pipetteEntities[pipette]
  const pipetteCapacity =
    pipetteEntity && getPipetteCapacity(pipetteEntity, tipRack)
  const volume = Number(values.volume)
  const airGapChecked = aspirate_airGap_checkbox
  let airGapVolume = airGapChecked ? Number(values.aspirate_airGap_volume) : 0
  airGapVolume = Number.isFinite(airGapVolume) ? airGapVolume : 0
  const withinCapacityForMultiDispense = volumeInCapacityForMultiDispense({
    volume,
    pipetteCapacity,
    airGapVolume,
  })
  const withinCapacityForMultiAspirate = volumeInCapacityForMultiAspirate({
    volume,
    pipetteCapacity,
    airGapVolume,
  })

  if (!withinCapacityForMultiDispense) {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: t('step_edit_form.field.path.subtitle.volume_too_high'),
    }
  }

  if (!withinCapacityForMultiAspirate) {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: t('step_edit_form.field.path.subtitle.volume_too_high'),
    }
  }

  // wellRatio overwrites all other disable reasoning
  if (wellRatio === '1:many') {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: t('step_edit_form.field.path.subtitle.only_many_to_1'),
    }
  } else if (wellRatio === 'many:1') {
    disabledPathMap = {
      ...disabledPathMap,
      multiDispense: t('step_edit_form.field.path.subtitle.only_1_to_many'),
    }
  } else {
    disabledPathMap = {
      ...disabledPathMap,
      multiAspirate: t('step_edit_form.field.path.subtitle.only_many_to_1'),
      multiDispense: t('step_edit_form.field.path.subtitle.only_1_to_many'),
    }
  }
  return disabledPathMap
}
