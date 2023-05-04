import {
  useAttachedModules,
  useProtocolDetailsForRun,
  useStoredProtocolAnalysis,
} from '.'
import type { AttachedModule } from '../../../redux/modules/types'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'
import { getProtocolModulesInfo } from '../ProtocolRun/utils/getProtocolModulesInfo'
import type { ProtocolModuleInfo } from '../ProtocolRun/utils/getProtocolModulesInfo'
import {
  checkModuleCompatibility,
  getDeckDefFromRobotType,
} from '@opentrons/shared-data'

export interface ModuleRenderInfoForProtocol extends ProtocolModuleInfo {
  attachedModuleMatch: AttachedModule | null
}

export function useModuleRenderInfoForProtocolById(
  robotName: string,
  runId: string
): {
  [moduleId: string]: ModuleRenderInfoForProtocol
} {
  const { robotType } = useProtocolDetailsForRun(runId)
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)

  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolData = robotProtocolAnalysis ?? storedProtocolAnalysis
  const attachedModules = useAttachedModules()
  if (protocolData == null) return {}

  const deckDef = getDeckDefFromRobotType(robotType)

  const protocolModulesInfo = getProtocolModulesInfo(protocolData, deckDef)

  const protocolModulesInfoInLoadOrder = protocolModulesInfo.sort(
    (modA, modB) => modA.protocolLoadOrder - modB.protocolLoadOrder
  )
  let matchedAmod: AttachedModule[] = []
  const allModuleRenderInfo = protocolModulesInfoInLoadOrder.map(
    protocolMod => {
      const compatibleAttachedModule =
        attachedModules.find(
          attachedMod =>
            checkModuleCompatibility(
              attachedMod.moduleModel,
              protocolMod.moduleDef.model
            ) && !matchedAmod.find(m => m === attachedMod)
        ) ?? null
      if (compatibleAttachedModule !== null) {
        matchedAmod = [...matchedAmod, compatibleAttachedModule]
        return {
          ...protocolMod,
          attachedModuleMatch: compatibleAttachedModule,
        }
      }
      return {
        ...protocolMod,
        attachedModuleMatch: null,
      }
    }
  )

  return allModuleRenderInfo.reduce(
    (acc, moduleInfo) => ({
      ...acc,
      [moduleInfo.moduleId]: moduleInfo,
    }),
    {}
  )
}
