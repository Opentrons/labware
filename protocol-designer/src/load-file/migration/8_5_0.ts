import floor from 'lodash/floor'
import { swatchColors } from '../../organisms/DefineLiquidsModal/swatchColors'
import type {
  LabwareDefinition2,
  LoadLabwareCreateCommand,
  ProtocolFile,
} from '@opentrons/shared-data'
import type { LiquidEntities } from '@opentrons/step-generation'
import type { DesignerApplicationDataV8_5 } from '../../file-data/selectors'
import type { DesignerApplicationData } from './utils/getLoadLiquidCommands'

const getMigratedPositionFromTop = (
  labwareDefinitions: {
    [definitionId: string]: LabwareDefinition2
  },
  loadLabwareCommands: LoadLabwareCreateCommand[],
  labware: string,
  type: 'aspirate' | 'dispense' | 'mix'
): number => {
  const matchingLoadLabware = loadLabwareCommands.find(
    command =>
      command.commandType === 'loadLabware' &&
      command.params.labwareId === labware
  )
  if (matchingLoadLabware == null) {
    console.error(
      `expected to find matching ${type} labware load command but could not with ${type}_labware from form data as ${labware}`
    )
  }
  const labwareUri =
    matchingLoadLabware != null
      ? `${matchingLoadLabware.params.namespace}/${matchingLoadLabware.params.loadName}/${matchingLoadLabware.params.version}`
      : ''

  //    early exit for dispense_labware equaling trashBin or wasteChute
  if (labwareDefinitions[labwareUri] == null) {
    return 0
  }

  const matchingLabwareWellDepth = labwareUri
    ? labwareDefinitions[labwareUri].wells.A1.depth
    : 0

  if (matchingLabwareWellDepth === 0) {
    console.error(
      `error in finding the ${type} labware well depth with labware uri ${labwareUri}`
    )
  }
  return matchingLabwareWellDepth
}

export const migrateFile = (
  appData: ProtocolFile<DesignerApplicationData>
): ProtocolFile<DesignerApplicationDataV8_5> => {
  const { designerApplication, commands, labwareDefinitions, liquids } = appData

  if (designerApplication == null || designerApplication?.data == null) {
    throw Error('The designerApplication key in your file is corrupt.')
  }
  const savedStepForms = designerApplication.data
    ?.savedStepForms as DesignerApplicationData['savedStepForms']

  const ingredients = designerApplication.data.ingredients

  const migratedIngredients: LiquidEntities = Object.entries(
    ingredients
  ).reduce<LiquidEntities>((acc, [id, ingredient]) => {
    acc[id] = {
      displayName: ingredient.name ?? '',
      liquidClass: ingredient.liquidClass,
      description: ingredient.description ?? null,
      liquidGroupId: id,
      pythonName: `liquid_${parseInt(id) + 1}`,
      displayColor: liquids[id].displayColor ?? swatchColors(id),
    }
    return acc
  }, {})

  const loadLabwareCommands = commands.filter(
    (command): command is LoadLabwareCreateCommand =>
      command.commandType === 'loadLabware'
  )

  const savedStepsWithUpdatedMoveLiquidFields = Object.values(
    savedStepForms
  ).reduce((acc, form) => {
    if (form.stepType === 'moveLiquid') {
      const {
        id,
        aspirate_touchTip_mmFromBottom,
        dispense_touchTip_mmFromBottom,
        aspirate_labware,
        dispense_labware,
        ...rest
      } = form
      const matchingAspirateLabwareWellDepth = getMigratedPositionFromTop(
        labwareDefinitions,
        loadLabwareCommands,
        aspirate_labware as string,
        'aspirate'
      )
      const matchingDispenseLabwareWellDepth = getMigratedPositionFromTop(
        labwareDefinitions,
        loadLabwareCommands,
        dispense_labware as string,
        'dispense'
      )

      return {
        ...acc,
        [id]: {
          ...rest,
          id,
          aspirate_labware,
          dispense_labware,
          aspirate_touchTip_mmFromTop:
            aspirate_touchTip_mmFromBottom == null
              ? null
              : floor(
                  aspirate_touchTip_mmFromBottom -
                    matchingAspirateLabwareWellDepth,
                  1
                ),
          dispense_touchTip_mmfromTop:
            dispense_touchTip_mmFromBottom == null
              ? null
              : floor(
                  dispense_touchTip_mmFromBottom -
                    matchingDispenseLabwareWellDepth,
                  1
                ),
        },
      }
    }
    return acc
  }, {})

  const savedStepsWithUpdatedMixFields = Object.values(savedStepForms).reduce(
    (acc, form) => {
      if (form.stepType === 'mix') {
        const { id, mix_touchTip_mmFromBottom, labware, ...rest } = form
        const matchingLabwareWellDepth = getMigratedPositionFromTop(
          labwareDefinitions,
          loadLabwareCommands,
          labware as string,
          'mix'
        )
        return {
          ...acc,
          [id]: {
            ...rest,
            id,
            labware,
            mix_touchTip_mmFromTop:
              mix_touchTip_mmFromBottom == null
                ? null
                : floor(
                    mix_touchTip_mmFromBottom - matchingLabwareWellDepth,
                    1
                  ),
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
        ingredients: migratedIngredients,
        savedStepForms: {
          ...designerApplication.data.savedStepForms,
          ...savedStepsWithUpdatedMoveLiquidFields,
          ...savedStepsWithUpdatedMixFields,
        },
      },
    },
  }
}
