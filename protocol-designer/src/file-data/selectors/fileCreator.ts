import { createSelector } from 'reselect'
import flatMap from 'lodash/flatMap'
import isEmpty from 'lodash/isEmpty'
import mapValues from 'lodash/mapValues'
import map from 'lodash/map'
import reduce from 'lodash/reduce'
import uniq from 'lodash/uniq'
import {
  FLEX_ROBOT_TYPE,
  OT2_STANDARD_DECKID,
  OT2_STANDARD_MODEL,
  FLEX_STANDARD_DECKID,
  SPAN7_8_10_11_SLOT,
} from '@opentrons/shared-data'

import { COLUMN_4_SLOTS } from '@opentrons/step-generation'
import { selectors as dismissSelectors } from '../../dismiss'
import { selectors as labwareDefSelectors } from '../../labware-defs'
import { uuid } from '../../utils'
import { selectors as ingredSelectors } from '../../labware-ingred/selectors'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import { swatchColors } from '../../organisms/DefineLiquidsModal/swatchColors'
import { getLoadLiquidCommands } from '../../load-file/migration/utils/getLoadLiquidCommands'
import {
  DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
  DEFAULT_MM_FROM_BOTTOM_DISPENSE,
  DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
} from '../../constants'
import { getStepGroups } from '../../step-forms/selectors'
import { getFileMetadata, getRobotType } from './fileFields'
import { getInitialRobotState, getRobotStateTimeline } from './commands'

import type {
  PipetteEntity,
  LabwareEntities,
  PipetteEntities,
  RobotState,
} from '@opentrons/step-generation'
import type {
  LabwareLocation,
  AddressableAreaName,
  CommandAnnotationV1Mixin,
  CommandV8Mixin,
  CreateCommand,
  LabwareV2Mixin,
  LiquidV1Mixin,
  LoadLabwareCreateCommand,
  LoadModuleCreateCommand,
  LoadPipetteCreateCommand,
  OT2RobotMixin,
  OT3RobotMixin,
  PipetteName,
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
          aspirate_mmFromBottom: DEFAULT_MM_FROM_BOTTOM_ASPIRATE,
          dispense_mmFromBottom: DEFAULT_MM_FROM_BOTTOM_DISPENSE,
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

    interface Pipettes {
      [pipetteId: string]: { name: PipetteName }
    }

    const pipettes: Pipettes = mapValues(
      initialRobotState.pipettes,
      (
        pipette: typeof initialRobotState.pipettes[keyof typeof initialRobotState.pipettes],
        pipetteId: string
      ) => ({
        name: pipetteEntities[pipetteId].name,
      })
    )

    const loadPipetteCommands = map(
      initialRobotState.pipettes,
      (
        pipette: typeof initialRobotState.pipettes[keyof typeof initialRobotState.pipettes],
        pipetteId: string
      ): LoadPipetteCreateCommand => {
        const loadPipetteCommand = {
          key: uuid(),
          commandType: 'loadPipette' as const,
          params: {
            pipetteName: pipettes[pipetteId].name,
            mount: pipette.mount,
            pipetteId: pipetteId,
          },
        }
        return loadPipetteCommand
      }
    )

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
    // initiate "adapter" commands first so we can map through them to get the
    //  labware that goes on top of it's location
    const loadAdapterCommands = reduce<
      RobotState['labware'],
      LoadLabwareCreateCommand[]
    >(
      initialRobotState.labware,
      (
        acc,
        labware: typeof initialRobotState.labware[keyof typeof initialRobotState.labware],
        labwareId: string
      ): LoadLabwareCreateCommand[] => {
        const { def } = labwareEntities[labwareId]
        const isAdapter = def.allowedRoles?.includes('adapter')
        if (!isAdapter) return acc
        const isOnTopOfModule = labware.slot in initialRobotState.modules
        const namespace = def.namespace
        const loadName = def.parameters.loadName
        const version = def.version
        const loadAdapterCommands = {
          key: uuid(),
          commandType: 'loadLabware' as const,
          params: {
            displayName: def.metadata.displayName,
            labwareId,
            loadName,
            namespace: namespace,
            version: version,
            location: isOnTopOfModule
              ? { moduleId: labware.slot }
              : { slotName: labware.slot },
          },
        }

        return [...acc, loadAdapterCommands]
      },
      []
    )

    const loadLabwareCommands = reduce<
      RobotState['labware'],
      LoadLabwareCreateCommand[]
    >(
      initialRobotState.labware,
      (
        acc,
        labware: typeof initialRobotState.labware[keyof typeof initialRobotState.labware],
        labwareId: string
      ): LoadLabwareCreateCommand[] => {
        const { def } = labwareEntities[labwareId]
        const isAdapter = def.allowedRoles?.includes('adapter')
        if (isAdapter || def.metadata.displayCategory === 'trash') return acc
        const isOnTopOfModule = labware.slot in initialRobotState.modules
        const isOnAdapter =
          loadAdapterCommands.find(
            command => command.params.labwareId === labware.slot
          ) != null
        const namespace = def.namespace
        const loadName = def.parameters.loadName
        const version = def.version
        const isAddressableAreaName = COLUMN_4_SLOTS.includes(labware.slot)

        let location: LabwareLocation = { slotName: labware.slot }
        if (isOnTopOfModule) {
          location = { moduleId: labware.slot }
        } else if (isOnAdapter) {
          location = { labwareId: labware.slot }
        } else if (isAddressableAreaName) {
          // TODO(bh, 2024-01-02): check slots against addressable areas via the deck definition
          location = {
            addressableAreaName: labware.slot as AddressableAreaName,
          }
        } else if (labware.slot === 'offDeck') {
          location = 'offDeck'
        }

        const loadLabwareCommands = {
          key: uuid(),
          commandType: 'loadLabware' as const,
          params: {
            displayName:
              labwareNicknamesById[labwareId] ?? def.metadata.displayName,
            labwareId: labwareId,
            loadName,
            namespace: namespace,
            version: version,
            location,
          },
        }

        return [...acc, loadLabwareCommands]
      },
      []
    )

    const loadLiquidCommands = getLoadLiquidCommands(
      ingredients,
      ingredLocations
    )
    const loadModuleCommands = map(
      initialRobotState.modules,
      (
        module: typeof initialRobotState.modules[keyof typeof initialRobotState.modules],
        moduleId: string
      ): LoadModuleCreateCommand => {
        const model = moduleEntities[moduleId].model
        const loadModuleCommand = {
          key: uuid(),
          commandType: 'loadModule' as const,
          params: {
            model: model,
            location: {
              slotName: module.slot === SPAN7_8_10_11_SLOT ? '7' : module.slot,
            },
            moduleId: moduleId,
          },
        }
        return loadModuleCommand
      }
    )

    const labwareDefinitions = getLabwareDefinitionsInUse(
      labwareEntities,
      pipetteEntities,
      labwareDefsByURI
    )
    const loadCommands: CreateCommand[] = [
      ...loadPipetteCommands,
      ...loadModuleCommands,
      ...loadAdapterCommands,
      ...loadLabwareCommands,
      ...loadLiquidCommands,
    ]

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
