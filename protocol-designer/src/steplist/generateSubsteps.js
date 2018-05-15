// @flow
import mapValues from 'lodash/mapValues'
import range from 'lodash/range'

import {getWellsForTips} from '../step-generation/utils'
import {utils as steplistUtils} from '../steplist'

import {
  formHasErrors,
  type ValidFormAndErrors
} from './formProcessing'

import type {
  NamedIngredsByLabwareAllSteps,
  SubSteps,
  SourceDestSubstepItem,
  SourceDestSubstepItemSingleChannel
} from './types'

import type {StepIdType} from '../form-types'
import type {RobotStateTimelineAcc} from '../file-data/selectors'
import {distribute} from '../step-generation'

import type {
  PipetteData,
  ConsolidateFormData,
  // DistributeFormData,
  MixFormData,
  PauseFormData,
  TransferFormData
} from '../step-generation/types'

type AllPipetteData = {[pipetteId: string]: PipetteData}
type AllLabwareTypes = {[labwareId: string]: string}
type SourceDestSubstepItemRows = $PropertyType<SourceDestSubstepItemSingleChannel, 'rows'>

function _transferSubsteps (
  form: TransferFormData,
  transferLikeFields: *
): SourceDestSubstepItem {
  const {
    sourceWells,
    destWells
  } = form

  const {
    stepId,
    pipette,
    volume,
    sourceLabwareType,
    destLabwareType,
    sourceWellIngreds,
    destWellIngreds
  } = transferLikeFields

  const commonFields = {
    stepType: 'transfer',
    parentStepId: stepId
  }

  const channels = pipette.channels

  if (channels > 1) {
    // multichannel

    return {
      ...commonFields,
      multichannel: true,
      volume,
      multiRows: range(sourceWells.length).map(i => {
        const sourceWellsForTips = getWellsForTips(channels, sourceLabwareType, sourceWells[i]).wellsForTips
        const destWellsForTips = getWellsForTips(channels, destLabwareType, destWells[i]).wellsForTips

        return range(channels).map(channel => {
          const sourceWell = sourceWellsForTips[channel]
          const destWell = destWellsForTips[channel]

          const sourceIngredients = sourceWellIngreds[sourceWell]
          const destIngredients = destWellIngreds
            ? destWellIngreds[destWell]
            : []

          return {
            substepId: i,
            channelId: channel,
            sourceIngredients,
            destIngredients,
            sourceWell,
            destWell
          }
        })
      })
    }
  }

  return {
    ...commonFields,
    multichannel: false,
    // TODO Ian 2018-03-02 break up steps when pipette too small
    rows: range(sourceWells.length).map(i => {
      const sourceWell = sourceWells[i]
      const destWell = destWells[i]
      return {
        substepId: i,
        sourceIngredients: sourceWellIngreds[sourceWell],
        destIngredients: destWellIngreds ? destWellIngreds[destWell] : [],
        sourceWell,
        destWell,
        volume
      }
    })
  }
}

function _consolidateSubsteps (
  form: ConsolidateFormData,
  transferLikeFields: *
): SourceDestSubstepItem {
  const {
    sourceWells,
    destWell
  } = form

  const {
    stepId,
    pipette,
    volume,
    sourceLabwareType,
    destLabwareType,
    sourceWellIngreds,
    destWellIngreds
  } = transferLikeFields

  const commonFields = {
    stepType: 'consolidate',
    parentStepId: stepId
  }

  const channels = pipette.channels

  if (channels > 1) {
    // multichannel

    const destWellsForTips = getWellsForTips(channels, destLabwareType, destWell).wellsForTips

    return {
      ...commonFields,
      multichannel: true,
      volume,
      multiRows: range(sourceWells.length).map(i => {
        const isLastGroup = i + 1 === sourceWells.length
        const sourceWellsForTips = getWellsForTips(channels, sourceLabwareType, sourceWells[i]).wellsForTips

        return range(channels).map(channel => {
          const sourceWell = sourceWellsForTips[channel]
          const destWell = destWellsForTips[channel]

          // only show dest ingreds on last group
          const destIngredients = isLastGroup ? destWellIngreds[destWell] : []

          return {
            substepId: i,
            channelId: channel,
            sourceIngredients: sourceWellIngreds[sourceWell],
            destIngredients,
            sourceWell,
            destWell: isLastGroup ? destWell : null // only show dest wells on last group
            // volume
          }
        })
      })
    }
  }

  // dest well is only shown at the end, last substep
  const destWellSubstep = {
    destWell,
    destIngredients: destWellIngreds[destWell],
    volume: volume * sourceWells.length,
    substepId: sourceWells.length
  }

  return {
    ...commonFields,
    multichannel: false,
    // TODO Ian 2018-03-02 break up steps when pipette too small
    rows: [
      ...sourceWells.map((sourceWell, i) => ({
        substepId: i,
        sourceWell,
        sourceIngredients: sourceWellIngreds[sourceWell],
        volume
      })),
      destWellSubstep
    ]
  }
}

// function _distributeSubsteps (
//   form: DistributeFormData,
//   transferLikeFields: *
// ): ?SourceDestSubstepItem { // <-- TODO remove '?' type
//   console.log('Distribute substeps not yet implemented') // TODO Ian 2018-05-04
//   return null
// }

function _mixSubsteps (
  form: MixFormData,
  standardFields: *
): SourceDestSubstepItem {
  const {
    stepType,
    wells
  } = form

  const {
    stepId,
    pipette,
    labwareType,
    wellIngreds
  } = standardFields

  const commonFields = {
    stepType,
    parentStepId: stepId
  }

  const channels = pipette.channels

  if (channels > 1) {
    return {
      ...commonFields,
      multichannel: true,
      multiRows: wells.map((well: string, i: number) => {
        const wellsForTips = getWellsForTips(channels, labwareType, well).wellsForTips

        return range(channels).map(channel => ({
          substepId: i,
          channelId: channel,
          sourceIngredients: wellIngreds[wellsForTips[channel]],
          sourceWell: wellsForTips[channel]
        }))
      })
    }
  }

  return {
    ...commonFields,
    multichannel: false,
    rows: wells.map((well: string, idx: number) => ({
      substepId: idx,
      sourceIngredients: wellIngreds[well],
      sourceWell: well
    }))
  }
}

// NOTE: This is the fn used by the `allSubsteps` selector
export function generateSubsteps (
  validatedForms: {[StepIdType]: ValidFormAndErrors},
  allPipetteData: AllPipetteData,
  allLabwareTypes: AllLabwareTypes,
  namedIngredsByLabwareAllSteps: NamedIngredsByLabwareAllSteps,
  orderedSteps: Array<StepIdType>,
  robotStateTimeline: RobotStateTimelineAcc
): SubSteps {
  return mapValues(validatedForms, (valForm: ValidFormAndErrors, stepId: StepIdType) => {
    const validatedForm = valForm.validatedForm
    const prevStepId = steplistUtils.getPrevStepId(orderedSteps, stepId)

    // Don't try to render with errors. TODO LATER: presentational error state of substeps?
    if (validatedForm === null || formHasErrors(valForm)) {
      return null
    }

    if (validatedForm.stepType === 'deck-setup') {
      // No substeps for Deck Setup
      return null
    }

    if (validatedForm.stepType === 'pause') {
      // just returns formData
      const formData: PauseFormData = validatedForm
      return formData
    }

    if (validatedForm.stepType === 'distribute') {
      const robotState = (
        robotStateTimeline.timeline[prevStepId] &&
        robotStateTimeline.timeline[prevStepId].robotState
      ) || robotStateTimeline.robotState

      const result = distribute(validatedForm)(robotState) // TODO IMMEDIATELY disable any mix args
      if (result.errors) {
        return null
      }
      const commands = result.commands
      // TODO multi-channel

      const rows = commands.reduce((
        acc: SourceDestSubstepItemRows,
        command: *,
        commandIdx: number
      ): SourceDestSubstepItemRows => {
        if (command.command === 'aspirate') {
          const {well, volume, labware} = command.params
          return [
            ...acc,
            {
              substepId: acc.length,
              sourceIngredients: namedIngredsByLabwareAllSteps[prevStepId][labware][well] || [], // TODO needs &&s
              sourceWell: well,
              volume: volume
            }
          ]
        }

        if (command.command === 'dispense') {
          return [
            ...acc,
            {
              substepId: acc.length,
              destIngredients: [], // TODO
              destWell: command.params.well,
              volume: command.params.volume
            }
          ]
        }

        return acc
      }, [])
      console.log({commands, rows})
      const returnThisThing: SourceDestSubstepItem = { // TODO
        stepType: validatedForm.stepType,
        parentStepId: stepId,
        multichannel: false,
        rows
      }
      return returnThisThing
    }

    // TODO REPLACE: Handle all TransferLike substeps + mix
    if (
      validatedForm.stepType === 'consolidate' ||
      validatedForm.stepType === 'transfer' ||
      validatedForm.stepType === 'mix'
    ) {
      const namedIngredsByLabware = namedIngredsByLabwareAllSteps[prevStepId]

      if (!namedIngredsByLabware) {
        // TODO Ian 2018-05-02 another assert candidate here
        console.warn(`No namedIngredsByLabware for previous step id ${prevStepId}`)
        return null
      }

      const {
        pipette: pipetteId,
        volume
      } = validatedForm

      const pipette = allPipetteData[pipetteId]

      // TODO Ian 2018-04-06 use assert here
      if (!pipette) {
        console.warn(`Pipette "${pipetteId}" does not exist, step ${stepId} can't determine channels`)
      }

      // NOTE: other one-labware step types go here
      if (validatedForm.stepType === 'mix') {
        const {labware} = validatedForm

        const wellIngreds = namedIngredsByLabware[labware]
        const labwareType = allLabwareTypes[labware]

        // fields common to all one-labware step types
        const standardFields = {
          stepId,
          pipette,
          volume,
          labwareType,
          wellIngreds
        }

        return _mixSubsteps(
          validatedForm,
          standardFields
        )
      }

      const {
        sourceLabware,
        destLabware
      } = validatedForm

      const sourceWellIngreds = namedIngredsByLabware[sourceLabware]
      const destWellIngreds = namedIngredsByLabware[destLabware]

      const sourceLabwareType = allLabwareTypes[sourceLabware]
      const destLabwareType = allLabwareTypes[destLabware]

      // fields common to all transferlike substep generator fns
      const transferLikeFields = {
        stepId,

        pipette,
        volume,

        sourceLabwareType,
        destLabwareType,

        sourceWellIngreds,
        destWellIngreds
      }

      if (validatedForm.stepType === 'transfer') {
        return _transferSubsteps(
          validatedForm,
          transferLikeFields
        )
      }

      if (validatedForm.stepType === 'consolidate') {
        return _consolidateSubsteps(
          validatedForm,
          transferLikeFields
        )
      }

      // unreachable here
    }

    console.warn('allSubsteps doesn\'t support step type: ', validatedForm.stepType, stepId)
    return null
  })
}
