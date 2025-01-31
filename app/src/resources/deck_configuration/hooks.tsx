import { useState } from 'react'
import { getInitialAndMovedLabwareInSlots } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getAddressableAreasInProtocol,
  getCutoutFixturesForCutoutId,
  getCutoutIdForAddressableArea,
  getDeckDefFromRobotType,
  getLabwareDisplayName,
  SINGLE_CENTER_SLOT_FIXTURE,
  SINGLE_LEFT_CUTOUTS,
  SINGLE_LEFT_SLOT_FIXTURE,
  SINGLE_RIGHT_CUTOUTS,
  SINGLE_RIGHT_SLOT_FIXTURE,
  SINGLE_SLOT_FIXTURES,
} from '@opentrons/shared-data'

import type { ReactNode } from 'react'
import type {
  CompletedProtocolAnalysis,
  CutoutConfigProtocolSpec,
  CutoutFixtureId,
  CutoutId,
  ProtocolAnalysisOutput,
  RobotType,
} from '@opentrons/shared-data'

import { useNotifyDeckConfigurationQuery } from './useNotifyDeckConfigurationQuery'
// TODO: return the arguments or something - don't instantiate ui in helper code like this
/* eslint-disable-next-line opentrons/no-imports-across-applications */
import { AddFixtureModal } from '/app/organisms/DeviceDetailsDeckConfiguration/AddFixtureModal'
import { useUpdateDeckConfigurationMutation } from '@opentrons/react-api-client'

const DECK_CONFIG_REFETCH_INTERVAL = 5000

export interface CutoutConfigAndCompatibility extends CutoutConfigProtocolSpec {
  compatibleCutoutFixtureIds: CutoutFixtureId[]
  // the missing on-deck labware display name for a single slot cutout
  missingLabwareDisplayName: string | null
}
export function useDeckConfigurationCompatibility(
  robotType: RobotType,
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
): CutoutConfigAndCompatibility[] {
  const deckConfig =
    useNotifyDeckConfigurationQuery({
      refetchInterval: DECK_CONFIG_REFETCH_INTERVAL,
    }).data ?? []
  if (robotType !== FLEX_ROBOT_TYPE) return []
  const deckDef = getDeckDefFromRobotType(robotType)
  const allAddressableAreas =
    protocolAnalysis != null
      ? getAddressableAreasInProtocol(protocolAnalysis, deckDef)
      : []
  const labwareInSlots =
    protocolAnalysis != null
      ? getInitialAndMovedLabwareInSlots(protocolAnalysis)
      : []

  return deckConfig.reduce<CutoutConfigAndCompatibility[]>(
    (acc, { cutoutId, cutoutFixtureId }) => {
      const fixturesThatMountToCutoutId = getCutoutFixturesForCutoutId(
        cutoutId,
        deckDef.cutoutFixtures
      )
      const requiredAddressableAreasForCutoutId = allAddressableAreas.filter(
        aa =>
          getCutoutIdForAddressableArea(aa, fixturesThatMountToCutoutId) ===
          cutoutId
      )
      const compatibleCutoutFixtureIds = fixturesThatMountToCutoutId
        .filter(cf =>
          requiredAddressableAreasForCutoutId.every(aa =>
            cf.providesAddressableAreas[cutoutId].includes(aa)
          )
        )
        .map(cf => cf.id)

      // get the on-deck labware name for a missing single-slot addressable area
      const missingSingleSlotLabware =
        cutoutFixtureId != null &&
        // fixture mismatch
        !compatibleCutoutFixtureIds.includes(cutoutFixtureId) &&
        compatibleCutoutFixtureIds[0] != null &&
        // compatible fixture is single-slot
        SINGLE_SLOT_FIXTURES.includes(compatibleCutoutFixtureIds[0])
          ? labwareInSlots.find(
              ({ location }) =>
                // match the addressable area to an on-deck labware
                requiredAddressableAreasForCutoutId[0] === location.slotName
            )
          : null

      const missingLabwareDisplayName =
        missingSingleSlotLabware != null
          ? missingSingleSlotLabware.labwareNickName ??
            getLabwareDisplayName(missingSingleSlotLabware.labwareDef) ??
            null
          : null

      return [
        ...acc,
        {
          cutoutId,
          cutoutFixtureId,
          requiredAddressableAreas: requiredAddressableAreasForCutoutId,
          compatibleCutoutFixtureIds,
          missingLabwareDisplayName,
        },
      ]
    },
    []
  )
}

interface DeckConfigurationEditingTools {
  addFixtureToCutout: (cutoutId: CutoutId) => void
  removeFixtureFromCutout: (
    cutoutId: CutoutId,
    cutoutFixtureId: CutoutFixtureId
  ) => void
  addFixtureModal: ReactNode
}
export function useDeckConfigurationEditingTools(
  isOnDevice: boolean
): DeckConfigurationEditingTools {
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const deckConfig =
    useNotifyDeckConfigurationQuery({
      refetchInterval: DECK_CONFIG_REFETCH_INTERVAL,
    }).data ?? []
  const { updateDeckConfiguration } = useUpdateDeckConfigurationMutation()
  const [targetCutoutId, setTargetCutoutId] = useState<CutoutId | null>(null)

  const addFixtureToCutout = (cutoutId: CutoutId): void => {
    setTargetCutoutId(cutoutId)
  }

  const removeFixtureFromCutout = (
    cutoutId: CutoutId,
    cutoutFixtureId: CutoutFixtureId
  ): void => {
    let replacementFixtureId: CutoutFixtureId = SINGLE_CENTER_SLOT_FIXTURE
    if (SINGLE_RIGHT_CUTOUTS.includes(cutoutId)) {
      replacementFixtureId = SINGLE_RIGHT_SLOT_FIXTURE
    } else if (SINGLE_LEFT_CUTOUTS.includes(cutoutId)) {
      replacementFixtureId = SINGLE_LEFT_SLOT_FIXTURE
    }

    const fixtureGroup =
      deckDef.cutoutFixtures.find(cf => cf.id === cutoutFixtureId)
        ?.fixtureGroup ?? {}

    let newDeckConfig = deckConfig
    if (cutoutId in fixtureGroup) {
      const groupMap =
        fixtureGroup[cutoutId]?.find(group =>
          Object.entries(group).every(([cId, cfId]) =>
            deckConfig.find(
              config =>
                config.cutoutId === cId && config.cutoutFixtureId === cfId
            )
          )
        ) ?? {}
      newDeckConfig = deckConfig.map(cutoutConfig =>
        cutoutConfig.cutoutId in groupMap
          ? {
              ...cutoutConfig,
              cutoutFixtureId: replacementFixtureId,
              opentronsModuleSerialNumber: undefined,
            }
          : cutoutConfig
      )
    } else {
      newDeckConfig = deckConfig.map(cutoutConfig =>
        cutoutConfig.cutoutId === cutoutId
          ? {
              ...cutoutConfig,
              cutoutFixtureId: replacementFixtureId,
              opentronsModuleSerialNumber: undefined,
            }
          : cutoutConfig
      )
    }
    updateDeckConfiguration(newDeckConfig)
  }

  return {
    addFixtureToCutout,
    removeFixtureFromCutout,
    addFixtureModal:
      targetCutoutId != null ? (
        <AddFixtureModal
          cutoutId={targetCutoutId}
          closeModal={() => {
            setTargetCutoutId(null)
          }}
          isOnDevice={isOnDevice}
        />
      ) : null,
  }
}
