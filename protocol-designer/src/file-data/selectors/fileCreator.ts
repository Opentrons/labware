import { createSelector } from 'reselect'
import flatMap from 'lodash/flatMap'
import isEmpty from 'lodash/isEmpty'
import mapValues from 'lodash/mapValues'
import reduce from 'lodash/reduce'
import uniq from 'lodash/uniq'
import {
  FLEX_ROBOT_TYPE,
  OT2_STANDARD_DECKID,
  OT2_STANDARD_MODEL,
  FLEX_STANDARD_DECKID,
} from '@opentrons/shared-data'

import { selectors as dismissSelectors } from '../../dismiss'
import { selectors as labwareDefSelectors } from '../../labware-defs'
import { selectors as ingredSelectors } from '../../labware-ingred/selectors'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import { swatchColors } from '../../organisms/DefineLiquidsModal/swatchColors'
import {
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
  DEFAULT_MM_OFFSET_FROM_BOTTOM,
} from '../../constants'
import { getStepGroups } from '../../step-forms/selectors'
import { getFileMetadata, getRobotType } from './fileFields'
import { getInitialRobotState, getRobotStateTimeline } from './commands'
import { getLoadCommands } from './utils'

import type {
  PipetteEntity,
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type {
  CommandAnnotationV1Mixin,
  CommandV8Mixin,
  CreateCommand,
  LabwareV2Mixin,
  LiquidV1Mixin,
  OT2RobotMixin,
  OT3RobotMixin,
  ProtocolBase,
  ProtocolFile,
} from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from '../../labware-defs'
import type { Selector } from '../../types'
import type { DesignerApplicationData } from '../../load-file/migration/utils/getLoadLiquidCommands'
import type { SecondOrderCommandAnnotation } from '@opentrons/shared-data/commandAnnotation/types'

// TODO: BC: 2018-02-21 uncomment this assert, causes test failures
// console.assert(!isEmpty(process.env.OT_PD_VERSION), 'Could not find application version!')
if (isEmpty(process.env.OT_PD_VERSION))
  console.warn('Could not find application version!')
const applicationVersion: string = process.env.OT_PD_VERSION || ''
// Internal release date: this should never be read programatically,
// it just helps us humans quickly identify what build a user was using
// when we look at saved protocols (without requiring us to trace thru git logs)
const _internalAppBuildDate = process.env.OT_PD_BUILD_DATE
// A labware definition is considered "in use" and should be included in
// the protocol file if it either...
// 1. is present on the deck in initial deck setup
// 2. OR is a tiprack def assigned to a pipette, even if it's not on the deck
export const getLabwareDefinitionsInUse = (
  labware: LabwareEntities,
  pipettes: PipetteEntities,
  allLabwareDefsByURI: LabwareDefByDefURI
): LabwareDefByDefURI => {
  const labwareDefURIsOnDeck: string[] = Object.keys(labware).map(
    (labwareId: string) => labware[labwareId].labwareDefURI
  )
  const tiprackDefURIsInUse: string[] = Object.keys(pipettes)
    .map(id => pipettes[id])
    .flatMap((pipetteEntity: PipetteEntity) => pipetteEntity.tiprackDefURI)
  const labwareDefURIsInUse = uniq([
    ...tiprackDefURIsInUse,
    ...labwareDefURIsOnDeck,
  ])

  return labwareDefURIsInUse.reduce<LabwareDefByDefURI>(
    (acc, labwareDefURI: string) => ({
      ...acc,
      [labwareDefURI]: allLabwareDefsByURI[labwareDefURI],
    }),
    {}
  )
}

export const createFile: Selector<ProtocolFile> = createSelector(
  getFileMetadata,
  getInitialRobotState,
  getRobotStateTimeline,
  getRobotType,
  dismissSelectors.getAllDismissedWarnings,
  ingredSelectors.getLiquidGroupsById,
  ingredSelectors.getLiquidsByLabwareId,
  stepFormSelectors.getSavedStepForms,
  stepFormSelectors.getOrderedStepIds,
  stepFormSelectors.getLabwareEntities,
  stepFormSelectors.getModuleEntities,
  stepFormSelectors.getPipetteEntities,
  uiLabwareSelectors.getLabwareNicknamesById,
  labwareDefSelectors.getLabwareDefsByURI,
  getStepGroups,
  (
    fileMetadata,
    initialRobotState,
    robotStateTimeline,
    robotType,
    dismissedWarnings,
    ingredients,
    ingredLocations,
    savedStepForms,
    orderedStepIds,
    labwareEntities,
    moduleEntities,
    pipetteEntities,
    labwareNicknamesById,
    labwareDefsByURI,
    stepGroups
  ) => {
    const { author, description, created } = fileMetadata

    const loadCommands = getLoadCommands(
      initialRobotState,
      pipetteEntities,
      moduleEntities,
      labwareEntities,
      labwareNicknamesById,
      ingredients,
      ingredLocations
    )

    const name = fileMetadata.protocolName || 'untitled'
    const lastModified = fileMetadata.lastModified
    // TODO: Ian 2018-07-10 allow user to save steps in JSON file, even if those
    // step never have saved forms.
    // (We could just export the `steps` reducer, but we've sunset it)
    const savedOrderedStepIds = orderedStepIds.filter(
      stepId => savedStepForms[stepId]
    )
    const designerApplication = {
      name: 'opentrons/protocol-designer',
      version: applicationVersion,
      data: {
        _internalAppBuildDate,
        defaultValues: {
          // TODO: Ian 2019-06-13 load these into redux and always get them from redux, not constants.js
          // This `defaultValues` key is not yet read by anything, but is populated here for auditability
          // and so that later we can do #3587 without a PD migration
          aspirate_mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
          dispense_mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
          touchTip_mmFromTop: DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
          blowout_mmFromTop: DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
        },
        pipetteTiprackAssignments: mapValues(
          pipetteEntities,
          (p: typeof pipetteEntities[keyof typeof pipetteEntities]): string[] =>
            p.tiprackDefURI
        ),
        dismissedWarnings,
        ingredients,
        ingredLocations,
        savedStepForms,
        orderedStepIds: savedOrderedStepIds,
      },
    }

    const liquids: ProtocolFile['liquids'] = reduce(
      ingredients,
      (acc, liquidData, liquidId) => {
        return {
          ...acc,
          [liquidId]: {
            displayName: liquidData.name,
            description: liquidData.description ?? '',
            displayColor: liquidData.displayColor ?? swatchColors(liquidId),
          },
        }
      },
      {}
    )

    const labwareDefinitions = getLabwareDefinitionsInUse(
      labwareEntities,
      pipetteEntities,
      labwareDefsByURI
    )

    const nonLoadCommands: CreateCommand[] = flatMap(
      robotStateTimeline.timeline,
      timelineFrame => timelineFrame.commands
    )

    const commands = [...loadCommands, ...nonLoadCommands]

    const flexDeckSpec: OT3RobotMixin = {
      robot: {
        model: FLEX_ROBOT_TYPE,
        deckId: FLEX_STANDARD_DECKID,
      },
    }
    const ot2DeckSpec: OT2RobotMixin = {
      robot: {
        model: OT2_STANDARD_MODEL,
        deckId: OT2_STANDARD_DECKID,
      },
    }
    const deckStructure =
      robotType === FLEX_ROBOT_TYPE ? flexDeckSpec : ot2DeckSpec

    const labwareV2Mixin: LabwareV2Mixin = {
      labwareDefinitionSchemaId: 'opentronsLabwareSchemaV2',
      labwareDefinitions,
    }

    const liquidV1Mixin: LiquidV1Mixin = {
      liquidSchemaId: 'opentronsLiquidSchemaV1',
      liquids,
    }

    const commandv8Mixin: CommandV8Mixin = {
      commandSchemaId: 'opentronsCommandSchemaV8',
      commands,
    }

    const commandAnnotations: SecondOrderCommandAnnotation[] = Object.entries(
      stepGroups
    ).map(([name, groupStepIds]) => {
      // map stepIds from group to orderedStepIds and return indices from orderedStepIds
      const stepIndices = groupStepIds
        .map(groupStepId => orderedStepIds.indexOf(groupStepId))
        .filter(index => index !== -1)

      //  return commands assosciated with the indices
      const commands = stepIndices.flatMap(
        index => robotStateTimeline.timeline[index].commands
      )
      const commandKeys = commands.map(command => command.key ?? '')

      const annotation: SecondOrderCommandAnnotation = {
        annotationType: 'secondOrderCommand',
        machineReadableName: name,
        params: {}, // what is this used for?
        commandKeys,
      }

      return annotation
    })

    const commandAnnotionaV1Mixin: CommandAnnotationV1Mixin = {
      commandAnnotationSchemaId: 'opentronsCommandAnnotationSchemaV1',
      commandAnnotations,
    }

    const protocolBase: ProtocolBase<DesignerApplicationData> = {
      $otSharedSchema: '#/protocol/schemas/8',
      schemaVersion: 8,
      metadata: {
        protocolName: name,
        author,
        description,
        created,
        lastModified,
        // TODO LATER
        category: null,
        subcategory: null,
        tags: [],
      },
      designerApplication,
    }

    return {
      ...protocolBase,
      ...deckStructure,
      ...labwareV2Mixin,
      ...liquidV1Mixin,
      ...commandv8Mixin,
      ...commandAnnotionaV1Mixin,
    }
  }
)
