import reduce from 'lodash/reduce'
import omitBy from 'lodash/omitBy'
import mapValues from 'lodash/mapValues'
import { getLabwareDefURI, DEFAULT_LIQUID_COLORS } from '@opentrons/shared-data'
import { COLORS } from '../../helix-design-system'
import type { WellFill } from '../../hardware-sim'
import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  ProtocolAnalysisOutput,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type {
  LabwareEntities,
  LocationLiquidState,
  SingleLabwareLiquidState,
  TimelineFrame,
} from '@opentrons/step-generation'
import type { CommandTextData } from './types'

//  copied from protocol-designer
export interface WellContents {
  groupIds: string[]
  ingreds: LocationLiquidState
  highlighted?: boolean
  selected?: boolean
  maxVolume?: number
  wellName?: string
}

interface WellContentsByLabware {
  [labwareId: string]: ContentsByWell
}

export type ContentsByWell = {
  [wellName: string]: WellContents
} | null

const MIXED_WELL_COLOR = COLORS.grey50

function getAllWellsForLabware(def: LabwareDefinition2): string[] {
  return Object.keys(def.wells)
}

function _wellContentsForWell(
  liquidVolState: LocationLiquidState,
  well: string
): WellContents {
  const ingredGroupIdsWithContent = Object.keys(liquidVolState || {}).filter(
    groupId => liquidVolState[groupId] && liquidVolState[groupId].volume > 0
  )
  return {
    wellName: well,
    groupIds: ingredGroupIdsWithContent,
    ingreds: omitBy(
      liquidVolState,
      ingredData => !ingredData || ingredData.volume <= 0
    ),
  }
}

export function _wellContentsForLabware(
  labwareLiquids: SingleLabwareLiquidState,
  labwareDef: LabwareDefinition2
): ContentsByWell {
  const allWellsForContainer = getAllWellsForLabware(labwareDef)
  return reduce(
    allWellsForContainer,
    (wellAcc, well: string): Record<string, WellContents> => {
      const wellHasContents = labwareLiquids && labwareLiquids[well]
      return {
        ...wellAcc,
        [well]: wellHasContents
          ? _wellContentsForWell(labwareLiquids[well], well)
          : {},
      }
    },
    {}
  )
}

const swatchColors = (ingredGroupId: string): string => {
  const num = Number(ingredGroupId)

  if (!Number.isInteger(num)) {
    if (ingredGroupId !== '__air__') {
      console.warn(
        `swatchColors expected an integer or __air__, got ${ingredGroupId}`
      )
    }

    return 'transparent'
  }

  return DEFAULT_LIQUID_COLORS[num % DEFAULT_LIQUID_COLORS.length]
}

const ingredIdsToColor = (
  groupIds: string[],
  displayColors: string[]
): string | null | undefined => {
  const filteredIngredIds = groupIds.filter(id => id !== '__air__')
  if (filteredIngredIds.length === 0) return null

  if (filteredIngredIds.length === 1) {
    return (
      displayColors[Number(filteredIngredIds[0])] ??
      swatchColors(filteredIngredIds[0])
    )
  }

  return MIXED_WELL_COLOR
}

export const wellFillFromWellContents = (
  wellContents: ContentsByWell,
  displayColors: string[]
): WellFill =>
  reduce(
    wellContents,
    (acc: WellFill, wellContents: WellContents, wellName: string) => {
      const wellFill = ingredIdsToColor(wellContents.groupIds, displayColors)
      return wellFill ? { ...acc, [wellName]: wellFill } : acc
    },
    {}
  )

export function getAllWellContentsForActiveItem(
  labwareEntities: LabwareEntities,
  robotState: TimelineFrame
): WellContentsByLabware | null {
  if (robotState == null) return null

  const liquidState = robotState.liquidState.labware
  const wellContentsByLabwareId = mapValues(
    liquidState,
    (labwareLiquids: SingleLabwareLiquidState, labwareId: string) => {
      if (labwareEntities[labwareId] == null) return null
      return _wellContentsForLabware(
        labwareLiquids,
        labwareEntities[labwareId].def
      )
    }
  )

  return wellContentsByLabwareId
}

// Note: This is an O(n) operation.
export function getLabwareDefinitionsFromCommands(
  commands: RunTimeCommand[]
): LabwareDefinition2[] {
  return commands.reduce<LabwareDefinition2[]>((acc, command) => {
    const isLoadingNewDef =
      command.commandType === 'loadLabware' &&
      !acc.some(
        def =>
          command.result?.definition != null &&
          getLabwareDefURI(def) === getLabwareDefURI(command.result?.definition)
      )

    return isLoadingNewDef && command.result?.definition != null
      ? [...acc, command.result?.definition]
      : acc
  }, [])
}

export function getCommandTextData(
  protocolData: CompletedProtocolAnalysis | ProtocolAnalysisOutput,
  protocolCommands?: RunTimeCommand[]
): CommandTextData {
  const { pipettes, labware, modules, liquids } = protocolData
  const commands =
    'commands' in protocolData ? protocolData.commands : protocolCommands ?? []
  return { commands, pipettes, labware, modules, liquids }
}
