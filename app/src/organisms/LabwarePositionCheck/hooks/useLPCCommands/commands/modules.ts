import {
  ABSORBANCE_READER_TYPE,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import type {
  CompletedProtocolAnalysis,
  CreateCommand,
} from '@opentrons/shared-data'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export function modulePrepCommands(
  offsetLocationDetails: OffsetLocationDetails
): CreateCommand[] {
  const { moduleId, moduleModel } = offsetLocationDetails

  const moduleType =
    (moduleId != null &&
      moduleModel != null &&
      'moduleModel' in location &&
      location.moduleModel != null &&
      getModuleType(moduleModel)) ??
    null

  if (moduleId == null || moduleType == null) {
    return []
  } else {
    switch (moduleType) {
      case THERMOCYCLER_MODULE_TYPE:
        return [
          {
            commandType: 'thermocycler/openLid',
            params: { moduleId },
          },
        ]
      case HEATERSHAKER_MODULE_TYPE:
        return [
          {
            commandType: 'heaterShaker/closeLabwareLatch',
            params: { moduleId },
          },
          {
            commandType: 'heaterShaker/deactivateShaker',
            params: { moduleId },
          },
          {
            commandType: 'heaterShaker/openLabwareLatch',
            params: { moduleId },
          },
        ]
      default:
        return []
    }
  }
}

// The module initialization that must happen before the start of any LPC. This should
// include commands that open lids and place modules in a known state that makes
// each individual LPC straightforward (ex, close the latches on the HS now, so
// we can simply open the latches when prepping for an LPC involving the HS).
export const moduleInitBeforeAnyLPCCommands = (
  analysis: CompletedProtocolAnalysis
): CreateCommand[] => [
  ...thermocyclerInitCommands(analysis),
  ...absorbanceReaderInitCommands(analysis),
  ...heaterShakerInitCommands(analysis),
]

// Not all modules require initialization before each labware LPC.
export const moduleInitDuringLPCCommands = (
  analysis: CompletedProtocolAnalysis
): CreateCommand[] => [...heaterShakerInitCommands(analysis)]

// Not all modules require cleanup after each labware LPC.
export const moduleCleanupDuringLPCCommands = (
  offsetLocationDetails: OffsetLocationDetails
): CreateCommand[] => {
  return [...heaterShakerCleanupCommands(offsetLocationDetails)]
}

const heaterShakerInitCommands = (
  analysis: CompletedProtocolAnalysis
): CreateCommand[] => {
  return analysis.modules
    .filter(mod => getModuleType(mod.model) === HEATERSHAKER_MODULE_TYPE)
    .map(mod => ({
      commandType: 'heaterShaker/closeLabwareLatch',
      params: { moduleId: mod.id },
    }))
}

const absorbanceReaderInitCommands = (
  analysis: CompletedProtocolAnalysis
): CreateCommand[] => {
  // @ts-expect-error Home command does not need params.
  return analysis.modules
    .filter(mod => getModuleType(mod.model) === ABSORBANCE_READER_TYPE)
    .flatMap(mod => [
      {
        commandType: 'home',
        params: {},
      },
      {
        commandType: 'absorbanceReader/openLid',
        params: { moduleId: mod.id },
      },
    ])
}

const thermocyclerInitCommands = (
  analysis: CompletedProtocolAnalysis
): CreateCommand[] => {
  return analysis.modules
    .filter(mod => getModuleType(mod.model) === THERMOCYCLER_MODULE_TYPE)
    .map(mod => ({
      commandType: 'thermocycler/openLid',
      params: { moduleId: mod.id },
    }))
}

const heaterShakerCleanupCommands = (
  offsetLocationDetails: OffsetLocationDetails
): CreateCommand[] => {
  const { moduleId, moduleModel } = offsetLocationDetails

  const moduleType =
    (moduleId != null &&
      moduleModel != null &&
      'moduleModel' in location &&
      location.moduleModel != null &&
      getModuleType(moduleModel)) ??
    null

  return moduleId != null &&
    moduleType != null &&
    moduleType === HEATERSHAKER_MODULE_TYPE
    ? [
        {
          commandType: 'heaterShaker/openLabwareLatch',
          params: { moduleId },
        },
      ]
    : []
}
