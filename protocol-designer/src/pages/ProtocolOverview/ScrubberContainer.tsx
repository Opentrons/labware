import { useSelector } from 'react-redux'
import flatMap from 'lodash/flatMap'
import { ProtocolTimelineScrubber } from '@opentrons/components'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  getInitialRobotState,
  getRobotStateTimeline,
  getRobotType,
} from '../../file-data/selectors'
import { uuid } from '../../utils'
import {
  getInitialDeckSetup,
  getInvariantContext,
  getLiquidEntities,
} from '../../step-forms/selectors'
import { getLabwareNicknamesById } from '../../ui/labware/selectors'
import { selectors as ingredSelectors } from '../../labware-ingred/selectors'
import { getLoadCommands } from '../../file-data/selectors/utils'
import type {
  AddressableAreaName,
  CompletedProtocolAnalysis,
  LabwareLocation,
  Liquid,
  LoadModuleRunTimeCommand,
  LoadedLabware,
  LoadedModule,
  LoadedPipette,
  RunTimeCommand,
} from '@opentrons/shared-data'

export function ScrubberContainer(): JSX.Element | null {
  const robotType = useSelector(getRobotType)
  const labwareNickNames = useSelector(getLabwareNicknamesById)
  const robotStateTimeline = useSelector(getRobotStateTimeline)
  const initialRobotState = useSelector(getInitialRobotState)
  const liquidEntities = useSelector(getLiquidEntities)
  const ingredientLocations = useSelector(ingredSelectors.getLiquidsByLabwareId)
  const invariantContext = useSelector(getInvariantContext)
  const initialDeckSetup = useSelector(getInitialDeckSetup)

  if (robotType === OT2_ROBOT_TYPE) {
    return null
  }

  const { pipetteEntities, labwareEntities, moduleEntities } = invariantContext
  const {
    pipettes,
    modules,
    labware,
    additionalEquipmentOnDeck,
  } = initialDeckSetup

  const loadCommands = getLoadCommands(
    initialRobotState,
    pipetteEntities,
    moduleEntities,
    labwareEntities,
    labwareNickNames,
    liquidEntities,
    ingredientLocations
  )
  const nonLoadCommands = flatMap(
    robotStateTimeline.timeline,
    timelineFrame => timelineFrame.commands
  )
  const runTimeCommands: RunTimeCommand[] = [
    ...loadCommands,
    ...nonLoadCommands,
  ].map(command => {
    let result
    if (command.commandType === 'loadModule') {
      const loadModuleResult: LoadModuleRunTimeCommand['result'] = {
        moduleId: command.params.moduleId ?? '',
      }
      result = loadModuleResult
    } else if (command.commandType === 'loadLabware') {
      result = {
        labwareId: command.params.labwareId,
        definition: labwareEntities[command.params.labwareId ?? '']?.def,
      }
    } else if (command.commandType === 'loadPipette') {
      result = {
        pipetteId: command.params.pipetteId,
      }
    }
    // @ts-expect-error: TS angry because not all commands have a result but
    // results are added to only commands that need them for the scrubber
    const runTimeCommand: RunTimeCommand = {
      ...command,
      id: uuid(),
      status: 'succeeded',
      createdAt: '',
      startedAt: '',
      completedAt: '',
      result,
    }
    return runTimeCommand
  })

  const loadPipettes: LoadedPipette[] = Object.values(pipettes).map(
    pipette => ({
      id: pipette.id,
      pipetteName: pipette.name,
      mount: pipette.mount,
    })
  )
  const loadModules: LoadedModule[] = Object.values(modules).map(module => ({
    id: module.id,
    model: module.model,
    serialNumber: '1', // TODO: why? seems like we don't need it for command text though
    location: {
      slotName: module.slot,
    },
  }))

  const loadLabware: LoadedLabware[] = Object.values(labware).map(lw => {
    let location: LabwareLocation = { slotName: lw.slot }
    if (lw.slot in modules) {
      location = { moduleId: lw.slot }
    } else if (
      labware[lw.slot] != null &&
      labware[lw.slot].def.allowedRoles?.includes('adapter')
    ) {
      location = { labwareId: lw.slot }
    } else if (lw.slot === 'offDeck') {
      location = 'offDeck'
    } else if (
      Object.values(additionalEquipmentOnDeck).find(
        ae => ae.location === lw.slot
      )
    ) {
      const inWasteChute = Object.values(additionalEquipmentOnDeck).find(
        ae => ae.location === lw.slot && ae.name === 'wasteChute'
      )
      location = {
        addressableAreaName: inWasteChute
          ? 'gripperWasteChute'
          : (lw.slot as AddressableAreaName),
      }
    }

    return {
      id: lw.id,
      loadName: lw.def.parameters.loadName,
      definitionUri: lw.labwareDefURI,
      location,
      displayName: labwareNickNames[lw.id],
    }
  })

  const liquids: Liquid[] = Object.entries(liquidEntities).map(
    ([liquidId, liquidData]) => ({
      id: liquidId,
      displayName: liquidData.displayName ?? 'undefined liquid name',
      description: liquidData.description ?? '',
      displayColor: liquidData.displayColor,
    })
  )

  const analysis: CompletedProtocolAnalysis = {
    id: uuid(),
    result: 'ok',
    pipettes: loadPipettes,
    labware: loadLabware,
    modules: loadModules,
    liquids,
    commands: runTimeCommands,
    errors: [],
    robotType,
  }

  return <ProtocolTimelineScrubber analysis={analysis} height="40vh" />
}
