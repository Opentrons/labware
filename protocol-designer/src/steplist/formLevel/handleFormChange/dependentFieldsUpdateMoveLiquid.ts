import clamp from 'lodash/clamp'
import pick from 'lodash/pick'
import round from 'lodash/round'
import { getPipetteSpecsV2 } from '@opentrons/shared-data'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '@opentrons/step-generation'
import {
  getMinPipetteVolume,
  getPipetteCapacity,
} from '../../../pipettes/pipetteData'
import { getWellRatio } from '../../utils'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import { makeConditionalPatchUpdater } from './makeConditionalPatchUpdater'
import {
  chainPatchUpdaters,
  fieldHasChanged,
  getChannels,
  getDefaultWells,
  getAllWellsFromPrimaryWells,
  getMaxDisposalVolumeForMultidispense,
  volumeInCapacityForMulti,
  DISPOSAL_VOL_DIGITS,
} from './utils'
import type {
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { FormData, StepFieldName } from '../../../form-types'
import type { FormPatch } from '../../actions/types'

// TODO: Ian 2019-02-21 import this from a more central place - see #2926
const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('moveLiquid'), fields)

const wellRatioUpdatesMap = [
  {
    prevValue: 'n:n',
    nextValue: '1:many',
    dependentFields: [
      {
        name: 'changeTip',
        prevValue: 'perSource',
        nextValue: 'always',
      },
      {
        name: 'changeTip',
        prevValue: 'perDest',
        nextValue: 'always',
      },
    ],
  },
  {
    prevValue: 'n:n',
    nextValue: 'many:1',
    dependentFields: [
      // no updates, all possible values are OK
    ],
  },
  {
    prevValue: '1:many',
    nextValue: 'n:n',
    dependentFields: [
      {
        name: 'changeTip',
        prevValue: 'perSource',
        nextValue: 'always',
      },
      {
        name: 'changeTip',
        prevValue: 'perDest',
        nextValue: 'always',
      },
      {
        name: 'path',
        prevValue: 'multiDispense',
        nextValue: 'single',
      },
    ],
  },
  {
    prevValue: '1:many',
    nextValue: 'many:1',
    dependentFields: [
      {
        name: 'changeTip',
        prevValue: 'perSource',
        nextValue: 'always',
      },
      {
        name: 'changeTip',
        prevValue: 'perDest',
        nextValue: 'always',
      },
      {
        name: 'path',
        prevValue: 'multiDispense',
        nextValue: 'single',
      },
    ],
  },
  {
    prevValue: 'many:1',
    nextValue: 'n:n',
    dependentFields: [
      {
        name: 'path',
        prevValue: 'multiAspirate',
        nextValue: 'single',
      },
    ],
  },
  {
    prevValue: 'many:1',
    nextValue: '1:many',
    dependentFields: [
      {
        name: 'changeTip',
        prevValue: 'perSource',
        nextValue: 'always',
      },
      {
        name: 'path',
        prevValue: 'multiAspirate',
        nextValue: 'single',
      },
    ],
  },
]
const wellRatioUpdater = makeConditionalPatchUpdater(wellRatioUpdatesMap)
export function updatePatchPathField(
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch {
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch = { ...(stepData as FormPatch), ...patch }
  const { path, changeTip } = appliedPatch

  if (path == null) {
    // invalid well ratio - fall back to 'single'
    return { ...patch, path: 'single' }
  }

  let pipetteCapacityExceeded = false

  if (
    appliedPatch.volume != null &&
    typeof appliedPatch.pipette === 'string' &&
    appliedPatch.pipette in pipetteEntities
  ) {
    pipetteCapacityExceeded = !volumeInCapacityForMulti(
      // @ts-expect-error(sa, 2021-6-14): appliedPatch is not of type FormData, address in #3161
      appliedPatch,
      pipetteEntities
    )
  }

  // changeTip value incompatible with next path value
  const incompatiblePath =
    (changeTip === 'perSource' && path === 'multiAspirate') ||
    (changeTip === 'perDest' && path === 'multiDispense')

  if (pipetteCapacityExceeded || incompatiblePath) {
    return { ...patch, path: 'single' }
  }

  return patch
}

const updatePatchOnLabwareChange = (
  patch: FormPatch,
  rawForm: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const sourceLabwareChanged = fieldHasChanged(
    rawForm,
    patch,
    'aspirate_labware'
  )
  const destLabwareChanged = fieldHasChanged(rawForm, patch, 'dispense_labware')
  if (!sourceLabwareChanged && !destLabwareChanged) return patch
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch = { ...(stepData as FormPatch), ...patch, id, stepType }
  // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette is type ?unknown. Address in #3161
  const pipetteId: string = appliedPatch.pipette
  const sourceLabwarePatch: FormPatch = sourceLabwareChanged
    ? {
        ...getDefaultFields(
          'aspirate_mmFromBottom',
          'aspirate_touchTip_mmFromTop',
          'aspirate_touchTip_checkbox'
        ),
        aspirate_wells: getDefaultWells({
          // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette is type ?unknown. Address in #3161
          labwareId: appliedPatch.aspirate_labware,
          pipetteId,
          labwareEntities,
          pipetteEntities,
        }),
      }
    : {}
  const destLabwarePatch: FormPatch = destLabwareChanged
    ? {
        ...getDefaultFields(
          'dispense_mmFromBottom',
          'dispense_touchTip_mmFromTop',
          'dispense_touchTip_checkbox'
        ),
        dispense_wells: getDefaultWells({
          // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette is type ?unknown. Address in #3161
          labwareId: appliedPatch.dispense_labware,
          pipetteId,
          labwareEntities,
          pipetteEntities,
        }),
      }
    : {}

  return { ...sourceLabwarePatch, ...destLabwarePatch }
}

const updatePatchOnPipetteChange = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  // when pipette ID is changed (to another ID, or to null),
  // set any flow rates, mix volumes, or disposal volumes to null
  // and set air gap volume to default (= pipette minimum)
  if (fieldHasChanged(rawForm, patch, 'pipette')) {
    const newPipette = patch.pipette
    let airGapVolume: string | null = null

    if (typeof newPipette === 'string' && newPipette in pipetteEntities) {
      const minVolume = getMinPipetteVolume(pipetteEntities[newPipette])
      airGapVolume = minVolume.toString()
    }

    return {
      ...patch,
      ...getDefaultFields(
        'aspirate_flowRate',
        'dispense_flowRate',
        'aspirate_mix_volume',
        'dispense_mix_volume',
        'disposalVolume_volume',
        'aspirate_mmFromBottom',
        'dispense_mmFromBottom',
        'nozzles',
        'tipRack'
      ),
      aspirate_airGap_volume: airGapVolume,
      dispense_airGap_volume: airGapVolume,
    }
  }

  return patch
}

const updatePatchOnTiprackChange = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  if (fieldHasChanged(rawForm, patch, 'tipRack')) {
    const pipette = patch.pipette
    let airGapVolume: string | null = null

    if (typeof pipette === 'string' && pipette in pipetteEntities) {
      const minVolume = getMinPipetteVolume(pipetteEntities[pipette])
      airGapVolume = minVolume.toString()
    }

    return {
      ...patch,
      ...getDefaultFields(
        'aspirate_flowRate',
        'dispense_flowRate',
        'aspirate_mix_volume',
        'dispense_mix_volume',
        'disposalVolume_volume'
      ),
      aspirate_airGap_volume: airGapVolume,
      dispense_airGap_volume: airGapVolume,
    }
  }

  return patch
}

const getClearedDisposalVolumeFields = (): FormPatch =>
  getDefaultFields('disposalVolume_volume', 'disposalVolume_checkbox')

const clampAspirateAirGapVolume = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const patchedAspirateAirgapVolume =
    patch.aspirate_airGap_volume ?? rawForm?.aspirate_airGap_volume
  const pipetteId = patch.pipette ?? rawForm.pipette
  const tipRack = rawForm.tipRack

  if (
    patchedAspirateAirgapVolume != null &&
    typeof pipetteId === 'string' &&
    pipetteId in pipetteEntities
  ) {
    const pipetteEntity = pipetteEntities[pipetteId]
    const minPipetteVolume = getMinPipetteVolume(pipetteEntity)
    const minAirGapVolume = 0 // NOTE: a form level warning will occur if the air gap volume is below the pipette min volume

    const maxAirGapVolume =
      getPipetteCapacity(pipetteEntity, tipRack as string) - minPipetteVolume
    const clampedAirGapVolume = clamp(
      Number(patchedAspirateAirgapVolume),
      minAirGapVolume,
      maxAirGapVolume
    )
    if (clampedAirGapVolume === Number(patchedAspirateAirgapVolume))
      return patch
    return { ...patch, aspirate_airGap_volume: String(clampedAirGapVolume) }
  }

  return patch
}

const clampDispenseAirGapVolume = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch = { ...(stepData as FormPatch), ...patch, id, stepType }
  // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette does not exist. Address in #3161
  const pipetteId: string = appliedPatch.pipette
  const disposalVolume =
    // @ts-expect-error(sa, 2021-6-14): appliedPatch.disposalVolume_volume does not exist. Address in #3161
    appliedPatch.disposalVolume_checkbox != null
      ? // @ts-expect-error(sa, 2021-6-14): appliedPatch.disposalVolume_volume does not exist. Address in #3161
        isNaN(Number(appliedPatch.disposalVolume_volume))
        ? 0
        : // @ts-expect-error(sa, 2021-6-14): appliedPatch.disposalVolume_volume does not exist. Address in #3161
          Number(appliedPatch.disposalVolume_volume)
      : 0
  // @ts-expect-error(sa, 2021-6-14): appliedPatch.volume does not exist. Address in #3161
  const transferVolume = Number(appliedPatch.volume)
  // @ts-expect-error(sa, 2021-6-14): appliedPatch.dispense_airGap_volume does not exist. Address in #3161
  const dispenseAirGapVolume = Number(appliedPatch.dispense_airGap_volume)
  // @ts-expect-error(jr, 2023-7-21): appliedPatch.tipRack does not exist
  const tipRack = String(appliedPatch.tipRack)
  if (
    // @ts-expect-error(sa, 2021-6-14): appliedPatch.dispense_airGap_volume does not exist. Address in #3161
    appliedPatch.dispense_airGap_volume != null &&
    typeof pipetteId === 'string' &&
    pipetteId in pipetteEntities
  ) {
    const pipetteEntity = pipetteEntities[pipetteId]
    const capacity = getPipetteCapacity(pipetteEntity, tipRack)
    const minAirGapVolume = 0 // NOTE: a form level warning will occur if the air gap volume is below the pipette min volume

    const maxAirGapVolume =
      // @ts-expect-error(sa, 2021-6-14): appliedPatch.path does not exist. Address in #3161
      appliedPatch.path === 'multiDispense'
        ? capacity - disposalVolume - transferVolume
        : capacity
    const clampedAirGapVolume = clamp(
      dispenseAirGapVolume,
      minAirGapVolume,
      maxAirGapVolume
    )
    if (clampedAirGapVolume === dispenseAirGapVolume) return patch
    return { ...patch, dispense_airGap_volume: String(clampedAirGapVolume) }
  }

  return patch
}

const updatePatchDisposalVolumeFields = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch = { ...(stepData as FormPatch), ...patch, id, stepType }
  const pathChangedFromMultiDispense =
    patch.path != null &&
    patch.path !== 'multiDispense' &&
    rawForm.path === 'multiDispense'

  if (pathChangedFromMultiDispense || patch.disposalVolume_checkbox === false) {
    // clear disposal volume whenever path is changed from multiDispense
    // or whenever disposalVolume_checkbox is cleared
    return { ...patch, ...getClearedDisposalVolumeFields() }
  }

  const shouldReinitializeDisposalVolume =
    (patch.path === 'multiDispense' && rawForm.path !== 'multiDispense') ||
    (patch.pipette != null && patch.pipette !== rawForm.pipette) ||
    Boolean(patch.disposalVolume_checkbox)

  if (
    shouldReinitializeDisposalVolume &&
    // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette does not exist. Address in #3161
    typeof appliedPatch.pipette === 'string'
  ) {
    // @ts-expect-error(sa, 2021-6-14): appliedPatch.pipette does not exist. Address in #3161
    const pipetteEntity = pipetteEntities[appliedPatch.pipette]
    const pipetteSpec = getPipetteSpecsV2(pipetteEntity.name)
    const minVolumes =
      pipetteSpec != null
        ? Object.values(pipetteSpec.liquids).map(liquid => liquid.minVolume)
        : []
    let recommendedMinimumDisposalVol: string = '0'
    if (minVolumes.length === 1) {
      recommendedMinimumDisposalVol = minVolumes[0].toString()
      //  to accommodate for lowVolume
    } else {
      const lowestVolume = Math.min(...minVolumes)
      recommendedMinimumDisposalVol = lowestVolume.toString()
    }

    // reset to recommended vol. Expects `clampDisposalVolume` to reduce it if needed
    return {
      ...patch,
      disposalVolume_checkbox: true,
      disposalVolume_volume: recommendedMinimumDisposalVol,
      blowout_checkbox: false,
    }
  }

  return patch
}

// clamp disposal volume so it cannot be negative, or exceed the capacity for multiDispense
// also rounds it to acceptable digits before clamping
const clampDisposalVolume = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch = { ...(stepData as FormPatch), ...patch, id, stepType }
  // @ts-expect-error(sa, 2021-6-14): appliedPatch isn't well-typed, address in #3161
  const isDecimalString = appliedPatch.disposalVolume_volume === '.'
  // @ts-expect-error(sa, 2021-6-14): appliedPatch isn't well-typed, address in #3161
  if (appliedPatch.path !== 'multiDispense' || isDecimalString) return patch
  const maxDisposalVolume = getMaxDisposalVolumeForMultidispense(
    // @ts-expect-error(sa, 2021-6-14): appliedPatch isn't well-typed, address in #3161
    appliedPatch,
    pipetteEntities
  )

  if (maxDisposalVolume == null) {
    console.assert(
      false,
      `clampDisposalVolume got null maxDisposalVolume for pipette, something weird happened`
    )
    return patch
  }
  // @ts-expect-error(sa, 2021-6-14): appliedPatch.disposalVolume_volume does not exist. Address in #3161
  const candidateDispVolNum = Number(appliedPatch.disposalVolume_volume)
  const nextDisposalVolume = clamp(
    round(candidateDispVolNum, DISPOSAL_VOL_DIGITS),
    0,
    maxDisposalVolume
  )

  if (nextDisposalVolume === candidateDispVolNum) {
    // this preserves decimals
    return patch
  }

  if (nextDisposalVolume > 0) {
    return { ...patch, disposalVolume_volume: String(nextDisposalVolume) }
  }

  // clear out if path is new, or set to zero/null depending on checkbox
  return rawForm.path === 'multiDispense'
    ? {
        ...patch,
        // @ts-expect-error(sa, 2021-6-14): appliedPatch.disposalVolume_checkbox does not exist. Address in #3161
        disposalVolume_volume: Boolean(appliedPatch.disposalVolume_checkbox)
          ? '0'
          : null,
      }
    : { ...patch, ...getClearedDisposalVolumeFields() }
}

const updatePatchOnPipetteChannelChange = (
  patch: FormPatch,
  rawForm: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities
): FormPatch => {
  if (patch.pipette === undefined) return patch
  let update: FormPatch = {}
  const prevChannels = getChannels(rawForm.pipette as string, pipetteEntities)
  const nextChannels =
    typeof patch.pipette === 'string'
      ? getChannels(patch.pipette, pipetteEntities)
      : null
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch: FormPatch = {
    ...(stepData as FormPatch),
    ...patch,
    id,
    stepType,
  }
  const singleToMulti =
    prevChannels === 1 && (nextChannels === 8 || nextChannels === 96)
  const multiToSingle =
    (prevChannels === 8 || prevChannels === 96) && nextChannels === 1

  const pipetteId: string = appliedPatch.pipette as string

  if (patch.pipette === null || singleToMulti) {
    // reset all well selection
    update = {
      aspirate_wells: getDefaultWells({
        // @ts-expect-error(sa, 2021-6-14): appliedPatch.aspirate_labware does not exist. Address in #3161
        labwareId: appliedPatch.aspirate_labware,
        pipetteId,
        labwareEntities,
        pipetteEntities,
      }),
      dispense_wells: getDefaultWells({
        // @ts-expect-error(sa, 2021-6-14): appliedPatch.dispense_labware does not exist. Address in #3161
        labwareId: appliedPatch.dispense_labware,
        pipetteId,
        labwareEntities,
        pipetteEntities,
      }),
    }
  } else if (multiToSingle) {
    let channels = 8
    if (prevChannels === 96) {
      channels = 96
    }
    // multi-channel to single-channel: convert primary wells to all wells
    const sourceLabwareId: string = appliedPatch.aspirate_labware as string
    const destLabwareId: string = appliedPatch.dispense_labware as string
    const sourceLabware = labwareEntities[sourceLabwareId]
    const destLabware = labwareEntities[destLabwareId]

    if (sourceLabwareId != null && destLabwareId != null) {
      update = {
        aspirate_wells: getAllWellsFromPrimaryWells(
          appliedPatch.aspirate_wells as string[],
          sourceLabware.def,
          channels as 8 | 96
        ),
        dispense_wells:
          destLabwareId.includes('trashBin') ||
          destLabwareId.includes('wasteChute')
            ? getDefaultWells({
                labwareId: destLabwareId,
                pipetteId,
                labwareEntities,
                pipetteEntities,
              })
            : getAllWellsFromPrimaryWells(
                appliedPatch.dispense_wells as string[],
                destLabware.def,
                channels as 8 | 96
              ),
      }
    }
  }

  return { ...patch, ...update }
}

function updatePatchOnWellRatioChange(
  patch: FormPatch,
  rawForm: FormData
): FormPatch {
  const appliedPatch = { ...rawForm, ...patch }
  const isDisposalLocation =
    rawForm.dispense_labware?.includes('wasteChute') ||
    rawForm.dispense_labware?.includes('trashBin') ||
    rawForm.dispense_labware?.includes('movableTrash') ||
    rawForm.dispense_labware?.includes('fixedTrash')

  const prevWellRatio = getWellRatio(
    rawForm.aspirate_wells as string[],
    rawForm.dispense_wells as string[],
    isDisposalLocation as boolean
  )
  const nextWellRatio = getWellRatio(
    appliedPatch.aspirate_wells as string[],
    appliedPatch.dispense_wells as string[],
    isDisposalLocation as boolean
  )

  if (nextWellRatio == null || prevWellRatio == null) {
    // selected invalid well combo (eg 2:3, 0:1, etc). Reset path to 'single' and reset changeTip if invalid
    const resetChangeTip = ['perSource', 'perDest'].includes(
      appliedPatch.changeTip as string
    )
    const resetPath = { ...patch, path: 'single' }
    return resetChangeTip ? { ...resetPath, changeTip: 'always' } : resetPath
  }

  if (nextWellRatio === prevWellRatio) return patch
  return {
    ...patch,
    ...(wellRatioUpdater(
      prevWellRatio,
      nextWellRatio,
      appliedPatch
    ) as FormPatch),
  }
}

function updatePatchMixFields(patch: FormPatch, rawForm: FormData): FormPatch {
  if (patch.path != null) {
    if (patch.path === 'multiAspirate') {
      return {
        ...patch,
        ...getDefaultFields(
          'aspirate_mix_checkbox',
          'aspirate_mix_times',
          'aspirate_mix_volume'
        ),
      }
    }

    if (patch.path === 'multiDispense') {
      return {
        ...patch,
        ...getDefaultFields(
          'dispense_mix_checkbox',
          'dispense_mix_times',
          'dispense_mix_volume'
        ),
      }
    }
  }

  return patch
}

export function updatePatchBlowoutFields(
  patch: FormPatch,
  rawForm: FormData
): FormPatch {
  const { id, stepType, ...stepData } = rawForm
  const appliedPatch: FormPatch = {
    ...(stepData as FormPatch),
    ...patch,
    id,
    stepType,
  }

  if (fieldHasChanged(rawForm, patch, 'path')) {
    const { path, blowout_location } = appliedPatch
    // reset blowout_location when path changes to avoid invalid location for path
    // or reset whenever checkbox is toggled
    const shouldResetBlowoutLocation =
      (path === 'multiAspirate' &&
        blowout_location === SOURCE_WELL_BLOWOUT_DESTINATION) ||
      (path === 'multiDispense' &&
        blowout_location === DEST_WELL_BLOWOUT_DESTINATION)

    if (shouldResetBlowoutLocation) {
      return { ...patch, ...getDefaultFields('blowout_location') }
    }
  }

  return patch
}

const updatePatchOnNozzleChange = (
  patch: FormPatch,
  rawForm: FormData,
  pipetteEntities: PipetteEntities
): FormPatch => {
  if (
    Object.values(pipetteEntities).find(pip => pip.spec.channels === 96) &&
    fieldHasChanged(rawForm, patch, 'nozzles')
  ) {
    return {
      ...patch,
      ...getDefaultFields('aspirate_wells', 'dispense_wells'),
    }
  }
  return patch
}

export function dependentFieldsUpdateMoveLiquid(
  originalPatch: FormPatch,
  rawForm: FormData, // raw = NOT hydrated
  pipetteEntities: PipetteEntities,
  labwareEntities: LabwareEntities
): FormPatch {
  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch =>
      updatePatchOnLabwareChange(
        chainPatch,
        rawForm,
        labwareEntities,
        pipetteEntities
      ),
    chainPatch =>
      updatePatchOnPipetteChannelChange(
        chainPatch,
        rawForm,
        labwareEntities,
        pipetteEntities
      ),
    chainPatch =>
      updatePatchOnPipetteChange(chainPatch, rawForm, pipetteEntities),
    chainPatch => updatePatchOnWellRatioChange(chainPatch, rawForm),
    chainPatch => updatePatchPathField(chainPatch, rawForm, pipetteEntities),
    chainPatch =>
      updatePatchDisposalVolumeFields(chainPatch, rawForm, pipetteEntities),
    chainPatch =>
      clampAspirateAirGapVolume(chainPatch, rawForm, pipetteEntities),
    chainPatch => clampDisposalVolume(chainPatch, rawForm, pipetteEntities),
    chainPatch => updatePatchMixFields(chainPatch, rawForm),
    chainPatch => updatePatchBlowoutFields(chainPatch, rawForm),
    chainPatch =>
      clampDispenseAirGapVolume(chainPatch, rawForm, pipetteEntities),
    chainPatch =>
      updatePatchOnTiprackChange(chainPatch, rawForm, pipetteEntities),
    chainPatch =>
      updatePatchOnNozzleChange(chainPatch, rawForm, pipetteEntities),
  ])
}
