import { useMemo } from 'react'

import {
  FLEX_ROBOT_TYPE,
  getDeckDefFromRobotType,
  getFixedTrashLabwareDefinition,
  getModuleDef2,
  getPositionFromSlotId,
  getSimplestDeckConfigForProtocol,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'

import {
  getRunLabwareRenderInfo,
  getRunModuleRenderInfo,
} from '/app/organisms/InterventionModal/utils'
import { getLabwareLocation } from '/app/local-resources/labware'

import type { Run } from '@opentrons/api-client'
import type {
  DeckDefinition,
  ModuleDefinition,
  LabwareDefinition2,
  ModuleModel,
  LabwareLocation,
  CutoutConfigProtocolSpec,
  LoadedLabware,
  RobotType,
  LabwareDefinitionsByUri,
  LoadedModule,
} from '@opentrons/shared-data'
import type { ErrorRecoveryFlowsProps } from '..'
import type { UseFailedLabwareUtilsResult } from './useFailedLabwareUtils'
import type {
  RunLabwareInfo,
  RunModuleInfo,
} from '/app/organisms/InterventionModal/utils'
import type { ERUtilsProps } from './useERUtils'

interface UseDeckMapUtilsProps {
  runId: ErrorRecoveryFlowsProps['runId']
  protocolAnalysis: ErrorRecoveryFlowsProps['protocolAnalysis']
  failedLabwareUtils: UseFailedLabwareUtilsResult
  runLwDefsByUri: ERUtilsProps['runLwDefsByUri']
  runRecord: Run | undefined
}

export interface UseDeckMapUtilsResult {
  deckConfig: CutoutConfigProtocolSpec[]
  modulesOnDeck: RunCurrentModulesOnDeck[]
  labwareOnDeck: RunCurrentLabwareOnDeck[]
  loadedLabware: LoadedLabware[]
  loadedModules: LoadedModule[]
  movedLabwareDef: LabwareDefinition2 | null
  moduleRenderInfo: RunModuleInfo[]
  labwareRenderInfo: RunLabwareInfo[]
  highlightLabwareEventuallyIn: string[]
  kind: 'intervention'
  robotType: RobotType
}
// Returns the utilities needed by the Recovery Deck Map.
export function useDeckMapUtils({
  protocolAnalysis,
  runRecord,
  runId,
  failedLabwareUtils,
  runLwDefsByUri,
}: UseDeckMapUtilsProps): UseDeckMapUtilsResult {
  const robotType = protocolAnalysis?.robotType ?? OT2_ROBOT_TYPE
  const deckConfig = getSimplestDeckConfigForProtocol(protocolAnalysis)
  const deckDef = getDeckDefFromRobotType(robotType)

  // TODO(jh, 11-05-24): Revisit this logic along with deckmap interfaces after deck map redesign.

  const currentModulesInfo = useMemo(
    () =>
      getRunCurrentModulesInfo({
        runRecord,
        deckDef,
        runLwDefsByUri,
      }),
    [runRecord, deckDef, runLwDefsByUri]
  )

  const runCurrentModules = useMemo(
    () =>
      getRunCurrentModulesOnDeck({
        failedLabwareUtils,
        runRecord,
        currentModulesInfo,
      }),
    [runId, protocolAnalysis, runRecord, deckDef, failedLabwareUtils]
  )

  const currentLabwareInfo = useMemo(
    () => getRunCurrentLabwareInfo({ runRecord, runLwDefsByUri }),
    [runRecord, runLwDefsByUri]
  )

  const { updatedModules, remainingLabware } = useMemo(
    () => updateLabwareInModules({ runCurrentModules, currentLabwareInfo }),
    [runCurrentModules, currentLabwareInfo]
  )

  const runCurrentLabware = useMemo(
    () =>
      getRunCurrentLabwareOnDeck({
        failedLabwareUtils,
        runRecord,
        currentLabwareInfo: remainingLabware,
      }),
    [failedLabwareUtils, currentLabwareInfo]
  )

  const movedLabwareDef =
    runLwDefsByUri != null && failedLabwareUtils.failedLabware != null
      ? runLwDefsByUri[failedLabwareUtils.failedLabware.definitionUri]
      : null

  const moduleRenderInfo = useMemo(
    () =>
      runRecord != null && runLwDefsByUri != null
        ? getRunModuleRenderInfo(runRecord.data, deckDef, runLwDefsByUri)
        : [],
    [deckDef, runLwDefsByUri, runRecord]
  )

  const labwareRenderInfo = useMemo(
    () =>
      runRecord != null && runLwDefsByUri != null
        ? getRunLabwareRenderInfo(runRecord.data, runLwDefsByUri, deckDef)
        : [],
    [deckDef, runLwDefsByUri, runRecord]
  )

  return {
    deckConfig,
    modulesOnDeck: updatedModules.map(
      ({ moduleModel, moduleLocation, innerProps, nestedLabwareDef }) => ({
        moduleModel,
        moduleLocation,
        innerProps,
        nestedLabwareDef,
      })
    ),
    labwareOnDeck: runCurrentLabware.map(({ labwareLocation, definition }) => ({
      labwareLocation,
      definition,
    })),
    highlightLabwareEventuallyIn: [...updatedModules, ...runCurrentLabware]
      .map(el => el.highlight)
      .filter(maybeSlot => maybeSlot != null) as string[],
    kind: 'intervention',
    robotType,
    loadedModules: runRecord?.data.modules ?? [],
    loadedLabware: runRecord?.data.labware ?? [],
    movedLabwareDef,
    moduleRenderInfo,
    labwareRenderInfo,
  }
}

interface RunCurrentModulesOnDeck {
  moduleModel: ModuleModel
  moduleLocation: {
    slotName: string
  }
  innerProps:
    | {
        lidMotorState: string
      }
    | {
        lidMotorState?: undefined
      }
  nestedLabwareDef: LabwareDefinition2 | null
}

// Builds the necessary module object expected by BaseDeck.
export function getRunCurrentModulesOnDeck({
  failedLabwareUtils,
  runRecord,
  currentModulesInfo,
}: {
  failedLabwareUtils: UseDeckMapUtilsProps['failedLabwareUtils']
  runRecord: UseDeckMapUtilsProps['runRecord']
  currentModulesInfo: RunCurrentModuleInfo[]
}): Array<RunCurrentModulesOnDeck & { highlight: string | null }> {
  const { failedLabware } = failedLabwareUtils

  return currentModulesInfo.map(
    ({ moduleDef, slotName, nestedLabwareDef, nestedLabwareSlotName }) => ({
      moduleModel: moduleDef.model,
      moduleLocation: { slotName },
      innerProps:
        moduleDef.model === THERMOCYCLER_MODULE_V1
          ? { lidMotorState: 'open' }
          : {},

      nestedLabwareDef,
      highlight: getIsLabwareMatch(
        nestedLabwareSlotName,
        runRecord,
        failedLabware
      )
        ? nestedLabwareSlotName
        : null,
    })
  )
}

interface RunCurrentLabwareOnDeck {
  labwareLocation: LabwareLocation
  definition: LabwareDefinition2
}
// Builds the necessary labware object expected by BaseDeck.
// Note that while this highlights all labware in the failed labware slot, the result is later filtered to render
// only the topmost labware.
export function getRunCurrentLabwareOnDeck({
  currentLabwareInfo,
  runRecord,
  failedLabwareUtils,
}: {
  failedLabwareUtils: UseDeckMapUtilsProps['failedLabwareUtils']
  runRecord: UseDeckMapUtilsProps['runRecord']
  currentLabwareInfo: RunCurrentLabwareInfo[]
}): Array<RunCurrentLabwareOnDeck & { highlight: string | null }> {
  const { failedLabware } = failedLabwareUtils

  return currentLabwareInfo.map(
    ({ slotName, labwareDef, labwareLocation }) => ({
      labwareLocation,
      definition: labwareDef,
      highlight: getIsLabwareMatch(slotName, runRecord, failedLabware)
        ? slotName
        : null,
    })
  )
}

interface RunCurrentModuleInfo {
  moduleId: string
  moduleDef: ModuleDefinition
  nestedLabwareDef: LabwareDefinition2 | null
  nestedLabwareSlotName: string
  slotName: string
}

// Derive the module info necessary to render modules and nested labware on the deck.
export const getRunCurrentModulesInfo = ({
  runRecord,
  deckDef,
  runLwDefsByUri,
}: {
  runRecord: UseDeckMapUtilsProps['runRecord']
  deckDef: DeckDefinition
  runLwDefsByUri: UseDeckMapUtilsProps['runLwDefsByUri']
}): RunCurrentModuleInfo[] => {
  if (runRecord == null) {
    return []
  } else {
    return runRecord.data.modules.reduce<RunCurrentModuleInfo[]>(
      (acc, module) => {
        const moduleDef = getModuleDef2(module.model)

        // Get the labware that is placed on top of the module.
        const nestedLabware = runRecord.data.labware.find(
          lw =>
            typeof lw.location === 'object' &&
            'moduleId' in lw.location &&
            lw.location.moduleId === module.id
        )

        const nestedLabwareDef =
          nestedLabware != null
            ? runLwDefsByUri[nestedLabware.definitionUri]
            : null

        const slotPosition = getPositionFromSlotId(
          module.location.slotName,
          deckDef
        )

        const nestedLwLoc = nestedLabware?.location ?? null
        const [nestedLwSlotName] = getSlotNameAndLwLocFrom(
          nestedLwLoc,
          runRecord,
          false
        )

        if (slotPosition == null) {
          return acc
        } else {
          return [
            ...acc,
            {
              moduleId: module.id,
              moduleDef,
              nestedLabwareDef,
              nestedLabwareSlotName: nestedLwSlotName ?? '',
              slotName: module.location.slotName,
            },
          ]
        }
      },
      []
    )
  }
}

interface RunCurrentLabwareInfo {
  labwareDef: LabwareDefinition2
  labwareLocation: LabwareLocation
  slotName: string
}

// Derive the labware info necessary to render labware on the deck.
export function getRunCurrentLabwareInfo({
  runRecord,
  runLwDefsByUri,
}: {
  runRecord: UseDeckMapUtilsProps['runRecord']
  runLwDefsByUri: UseDeckMapUtilsProps['runLwDefsByUri']
}): RunCurrentLabwareInfo[] {
  if (runRecord == null) {
    return []
  } else {
    const allLabware = runRecord.data.labware.reduce(
      (acc: RunCurrentLabwareInfo[], lw) => {
        const loc = lw.location
        const [slotName, labwareLocation] = getSlotNameAndLwLocFrom(
          loc,
          runRecord,
          true
        ) // Exclude modules since handled separately.
        const labwareDef = getLabwareDefinition(lw, runLwDefsByUri)

        if (slotName == null || labwareLocation == null) {
          return acc
        } else {
          return [
            ...acc,
            {
              labwareDef,
              slotName,
              labwareLocation: labwareLocation,
            },
          ]
        }
      },
      []
    )

    // Group labware by slotName
    const labwareBySlot = allLabware.reduce<
      Record<string, RunCurrentLabwareInfo[]>
    >((acc, labware) => {
      const slot = labware.slotName
      if (!acc[slot]) {
        acc[slot] = []
      }
      acc[slot].push(labware)
      return acc
    }, {})

    // For each slot, return either:
    // 1. The first labware with 'labwareId' in its location if it exists
    // 2. The first labware in the slot if no labware has 'labwareId'
    return Object.values(labwareBySlot).map(slotLabware => {
      const labwareWithId = slotLabware.find(
        lw =>
          typeof lw.labwareLocation !== 'string' &&
          'labwareId' in lw.labwareLocation
      )
      return labwareWithId != null
        ? {
            ...labwareWithId,
            labwareLocation: { slotName: labwareWithId.slotName },
          }
        : slotLabware[0]
    })
  }
}

const getLabwareDefinition = (
  labware: LoadedLabware,
  protocolLabwareDefinitionsByUri: LabwareDefinitionsByUri
): LabwareDefinition2 => {
  if (labware.id === 'fixedTrash') {
    return getFixedTrashLabwareDefinition()
  } else {
    return protocolLabwareDefinitionsByUri[labware.definitionUri]
  }
}

// Get the slotName for on deck labware.
export function getSlotNameAndLwLocFrom(
  location: LabwareLocation | null,
  runRecord: UseDeckMapUtilsProps['runRecord'],
  excludeModules: boolean
): [string | null, LabwareLocation | null] {
  const baseSlot =
    getLabwareLocation({
      location,
      detailLevel: 'slot-only',
      loadedLabwares: runRecord?.data?.labware ?? [],
      loadedModules: runRecord?.data?.modules ?? [],
      robotType: FLEX_ROBOT_TYPE,
    })?.slotName ?? null

  if (location == null || location === 'offDeck') {
    return [null, null]
  } else if ('moduleId' in location) {
    if (excludeModules) {
      return [null, null]
    } else {
      const moduleId = location.moduleId
      return [baseSlot, { moduleId }]
    }
  } else if ('labwareId' in location) {
    const labwareId = location.labwareId
    return [baseSlot, { labwareId }]
  } else if ('addressableAreaName' in location) {
    const addressableAreaName = location.addressableAreaName
    return [baseSlot, { addressableAreaName }]
  } else if ('slotName' in location) {
    const slotName = location.slotName
    return [baseSlot, { slotName }]
  } else {
    return [null, null]
  }
}

// Whether the slotName labware is the same as the pickUpTipLabware.
export function getIsLabwareMatch(
  slotName: string,
  runRecord: UseDeckMapUtilsProps['runRecord'],
  pickUpTipLabware: LoadedLabware | null
): boolean {
  const location = pickUpTipLabware?.location ?? null

  const slotLocation =
    getLabwareLocation({
      location,
      detailLevel: 'slot-only',
      loadedLabwares: runRecord?.data?.labware ?? [],
      loadedModules: runRecord?.data?.modules ?? [],
      robotType: FLEX_ROBOT_TYPE,
    })?.slotName ?? null

  if (location == null) {
    return false
  }
  // This is the "off deck" case, which we do not render (and therefore return false).
  else if (typeof location === 'string') {
    return false
  } else {
    return slotLocation === slotName
  }
}

// If any labware share a slot with a module, the labware should be nested within the module for rendering purposes.
// This prevents issues such as TC nested labware rendering in "B1" instead of the special-cased location.
export function updateLabwareInModules({
  runCurrentModules,
  currentLabwareInfo,
}: {
  runCurrentModules: ReturnType<typeof getRunCurrentModulesOnDeck>
  currentLabwareInfo: ReturnType<typeof getRunCurrentLabwareInfo>
}): {
  updatedModules: ReturnType<typeof getRunCurrentModulesOnDeck>
  remainingLabware: ReturnType<typeof getRunCurrentLabwareInfo>
} {
  const usedSlots = new Set<string>()

  const updatedModules = runCurrentModules.map(moduleInfo => {
    const labwareInSameLoc = currentLabwareInfo.find(
      lw => moduleInfo.moduleLocation.slotName === lw.slotName
    )

    if (labwareInSameLoc != null) {
      usedSlots.add(labwareInSameLoc.slotName)
      return {
        ...moduleInfo,
        nestedLabwareDef: labwareInSameLoc.labwareDef,
      }
    } else {
      return moduleInfo
    }
  })

  const remainingLabware = currentLabwareInfo.filter(
    lw => !usedSlots.has(lw.slotName)
  )

  return { updatedModules, remainingLabware }
}
