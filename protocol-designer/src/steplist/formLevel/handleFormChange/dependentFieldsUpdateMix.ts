import pick from 'lodash/pick'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import {
  chainPatchUpdaters,
  fieldHasChanged,
  getChannels,
  getDefaultWells,
  getAllWellsFromPrimaryWells,
} from './utils'
import type {
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { FormData, StepFieldName } from '../../../form-types'
import type { FormPatch } from '../../actions/types'

// TODO: Ian 2019-02-21 import this from a more central place - see #2926
const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('mix'), fields)

const updatePatchOnLabwareChange = (
  patch: FormPatch,
  rawForm: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities
): FormPatch => {
  const labwareChanged = fieldHasChanged(rawForm, patch, 'labware')
  if (!labwareChanged) return patch
  const appliedPatch = { ...rawForm, ...patch }
  const pipetteId = appliedPatch.pipette
  return {
    ...patch,
    ...getDefaultFields(
      'mix_mmFromBottom',
      'mix_touchTip_mmFromTop',
      'mix_touchTip_checkbox'
    ),
    wells: getDefaultWells({
      labwareId: appliedPatch.labware,
      pipetteId,
      labwareEntities,
      pipetteEntities,
    }),
  }
}

// NOTE: this is similar to fn in moveLiquid dependentFieldsUpdate,
// if it's used more consider making a util
const updatePatchOnPipetteChannelChange = (
  patch: FormPatch,
  rawForm: FormData,
  labwareEntities: LabwareEntities,
  pipetteEntities: PipetteEntities
): FormPatch => {
  if (patch.pipette === undefined) return patch
  let update = {}
  const prevChannels = getChannels(rawForm.pipette as string, pipetteEntities)
  const nChannels =
    typeof patch.pipette === 'string'
      ? getChannels(patch.pipette, pipetteEntities)
      : null
  const appliedPatch = { ...rawForm, ...patch }
  let previousChannels = prevChannels
  if (
    rawForm.stepType === 'moveLiquid' ||
    (rawForm.stepType === 'mix' && prevChannels === 96)
  ) {
    if (rawForm.nozzles === 'full') {
      previousChannels = 96
    } else {
      previousChannels = 8
    }
  }
  let nextChannels = nChannels
  if (
    rawForm.stepType === 'moveLiquid' ||
    (rawForm.stepType === 'mix' && nChannels === 96)
  ) {
    if (rawForm.nozzles === 'full') {
      nextChannels = 96
    } else {
      nextChannels = 8
    }
  }

  const singleToMulti =
    previousChannels === 1 && (nextChannels === 8 || nextChannels === 96)
  const multiToSingle =
    (previousChannels === 8 || previousChannels === 96) && nextChannels === 1

  if (patch.pipette === null || singleToMulti) {
    // reset all well selection
    const pipetteId = appliedPatch.pipette
    update = {
      wells: getDefaultWells({
        labwareId: appliedPatch.labware,
        pipetteId,
        labwareEntities,
        pipetteEntities,
      }),
    }
  } else if (multiToSingle) {
    let channels: 8 | 96 = 8
    if (
      rawForm.stepType === 'moveLiquid' ||
      (rawForm.stepType === 'mix' && prevChannels === 96)
    ) {
      if (rawForm.nozzles === 'full') {
        channels = 96
      } else {
        channels = 8
      }
    }
    // multi-channel to single-channel: convert primary wells to all wells
    const labwareId = appliedPatch.labware

    if (labwareId != null) {
      const labwareDef = labwareEntities[labwareId].def
      update = {
        wells: getAllWellsFromPrimaryWells(
          appliedPatch.wells as string[],
          labwareDef,
          channels
        ),
      }
    }
  }

  return { ...patch, ...update }
}

const updatePatchOnPipetteChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  // when pipette ID is changed (to another ID, or to null),
  // set any flow rates to null
  if (fieldHasChanged(rawForm, patch, 'pipette')) {
    return {
      ...patch,
      ...getDefaultFields(
        'aspirate_flowRate',
        'dispense_flowRate',
        'tipRack',
        'nozzles'
      ),
    }
  }

  return patch
}

const updatePatchOnTiprackChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (fieldHasChanged(rawForm, patch, 'tipRack')) {
    return {
      ...patch,
      ...getDefaultFields('aspirate_flowRate', 'dispense_flowRate'),
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
      ...getDefaultFields('wells'),
    }
  }
  return patch
}

export function dependentFieldsUpdateMix(
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
    chainPatch => updatePatchOnPipetteChange(chainPatch, rawForm),
    chainPatch => updatePatchOnTiprackChange(chainPatch, rawForm),
    chainPatch =>
      updatePatchOnNozzleChange(chainPatch, rawForm, pipetteEntities),
  ])
}
