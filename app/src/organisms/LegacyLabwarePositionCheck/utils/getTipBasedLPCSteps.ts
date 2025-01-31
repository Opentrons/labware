import { isEqual } from 'lodash'
import { SECTIONS } from '../constants'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'
import {
  getLabwareDefURI,
  getIsTiprack,
  FIXED_TRASH_ID,
} from '@opentrons/shared-data'
import { getLabwareLocationCombos } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLabwareLocationCombos'

import type {
  LabwarePositionCheckStep,
  CheckTipRacksStep,
  PickUpTipStep,
  CheckLabwareStep,
  ReturnTipStep,
} from '../types'
import type {
  RunTimeCommand,
  ProtocolAnalysisOutput,
  PickUpTipRunTimeCommand,
} from '@opentrons/shared-data'
import type { LabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLabwareLocationCombos'

interface LPCArgs {
  primaryPipetteId: string
  secondaryPipetteId: string | null
  labware: ProtocolAnalysisOutput['labware']
  modules: ProtocolAnalysisOutput['modules']
  commands: RunTimeCommand[]
}

export const getTipBasedLPCSteps = (
  args: LPCArgs
): LabwarePositionCheckStep[] => {
  const checkTipRacksSectionSteps = getCheckTipRackSectionSteps(args)
  if (checkTipRacksSectionSteps.length < 1) return []
  const allButLastTiprackCheckSteps = checkTipRacksSectionSteps.slice(
    0,
    checkTipRacksSectionSteps.length - 1
  )
  const lastTiprackCheckStep =
    checkTipRacksSectionSteps[checkTipRacksSectionSteps.length - 1]

  const pickUpTipSectionStep: PickUpTipStep = {
    section: SECTIONS.PICK_UP_TIP,
    labwareId: lastTiprackCheckStep.labwareId,
    pipetteId: lastTiprackCheckStep.pipetteId,
    location: lastTiprackCheckStep.location,
    adapterId: lastTiprackCheckStep.adapterId,
    definitionUri: lastTiprackCheckStep.definitionUri,
  }
  const checkLabwareSectionSteps = getCheckLabwareSectionSteps(args)

  const returnTipSectionStep: ReturnTipStep = {
    section: SECTIONS.RETURN_TIP,
    labwareId: lastTiprackCheckStep.labwareId,
    pipetteId: lastTiprackCheckStep.pipetteId,
    location: lastTiprackCheckStep.location,
    adapterId: lastTiprackCheckStep.adapterId,
    definitionUri: lastTiprackCheckStep.definitionUri,
  }

  return [
    { section: SECTIONS.BEFORE_BEGINNING },
    ...allButLastTiprackCheckSteps,
    pickUpTipSectionStep,
    ...checkLabwareSectionSteps,
    returnTipSectionStep,
    { section: SECTIONS.RESULTS_SUMMARY },
  ]
}

function getCheckTipRackSectionSteps(args: LPCArgs): CheckTipRacksStep[] {
  const {
    secondaryPipetteId,
    primaryPipetteId,
    commands,
    labware,
    modules = [],
  } = args

  const labwareLocationCombos = getLabwareLocationCombos(
    commands,
    labware,
    modules
  )
  const uniqPrimaryPipettePickUpTipCommands = commands.reduce<
    PickUpTipRunTimeCommand[]
  >((acc, command) => {
    if (
      command.commandType === 'pickUpTip' &&
      command.params.pipetteId === primaryPipetteId &&
      !acc.some(c => c.params.labwareId === command.params.labwareId)
    ) {
      return [...acc, command]
    }
    return acc
  }, [])
  const onlySecondaryPipettePickUpTipCommands = commands.reduce<
    PickUpTipRunTimeCommand[]
  >((acc, command) => {
    if (
      command.commandType === 'pickUpTip' &&
      command.params.pipetteId === secondaryPipetteId &&
      !uniqPrimaryPipettePickUpTipCommands.some(
        c => c.params.labwareId === command.params.labwareId
      ) &&
      !acc.some(c => c.params.labwareId === command.params.labwareId)
    ) {
      return [...acc, command]
    }
    return acc
  }, [])

  return [
    ...onlySecondaryPipettePickUpTipCommands,
    ...uniqPrimaryPipettePickUpTipCommands,
  ].reduce<CheckTipRacksStep[]>((acc, { params }) => {
    const labwareLocations = labwareLocationCombos.reduce<
      LabwareLocationCombo[]
    >((acc, labwareLocationCombo) => {
      // remove labware that isn't accessed by a pickup tip command
      if (labwareLocationCombo.labwareId !== params.labwareId) {
        return acc
      }
      // remove duplicate definitionUri in same location
      const comboAlreadyExists = acc.some(
        accLocationCombo =>
          labwareLocationCombo.definitionUri ===
            accLocationCombo.definitionUri &&
          isEqual(labwareLocationCombo.location, accLocationCombo.location)
      )
      return comboAlreadyExists ? acc : [...acc, labwareLocationCombo]
    }, [])

    return [
      ...acc,
      ...labwareLocations.map(({ location, adapterId, definitionUri }) => ({
        section: SECTIONS.CHECK_TIP_RACKS,
        labwareId: params.labwareId,
        pipetteId: params.pipetteId,
        location,
        adapterId,
        definitionUri: definitionUri,
      })),
    ]
  }, [])
}

function getCheckLabwareSectionSteps(args: LPCArgs): CheckLabwareStep[] {
  const { labware, modules, commands, primaryPipetteId } = args
  const labwareDefinitions = getLabwareDefinitionsFromCommands(commands)

  const deDupedLabwareLocationCombos = getLabwareLocationCombos(
    commands,
    labware,
    modules
  ).reduce<LabwareLocationCombo[]>((acc, labwareLocationCombo) => {
    const labwareDef = labwareDefinitions.find(
      def => getLabwareDefURI(def) === labwareLocationCombo.definitionUri
    )
    if (labwareLocationCombo.labwareId === FIXED_TRASH_ID) return acc
    if (labwareDef == null) {
      throw new Error(
        `could not find labware definition within protocol with uri: ${labwareLocationCombo.definitionUri}`
      )
    }
    const isTiprack = getIsTiprack(labwareDef)
    const adapter = (labwareDef?.allowedRoles ?? []).includes('adapter')
    if (isTiprack || adapter) return acc // skip any labware that is a tiprack or adapter

    const comboAlreadyExists = acc.some(
      accLocationCombo =>
        labwareLocationCombo.definitionUri === accLocationCombo.definitionUri &&
        isEqual(labwareLocationCombo.location, accLocationCombo.location)
    )
    return comboAlreadyExists ? acc : [...acc, labwareLocationCombo]
  }, [])

  return deDupedLabwareLocationCombos.reduce<CheckLabwareStep[]>(
    (acc, { labwareId, location, moduleId, adapterId, definitionUri }) => {
      return [
        ...acc,
        {
          section: SECTIONS.CHECK_LABWARE,
          labwareId,
          pipetteId: primaryPipetteId,
          location,
          moduleId,
          adapterId,
          definitionUri,
        },
      ]
    },
    []
  )
}
