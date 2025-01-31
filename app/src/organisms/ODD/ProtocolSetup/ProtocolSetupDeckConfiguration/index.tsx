import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import {
  BaseDeck,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  FLEX_SINGLE_SLOT_BY_CUTOUT_ID,
  MAGNETIC_BLOCK_V1_FIXTURE,
  MODULE_FIXTURES_BY_MODEL,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
  THERMOCYCLER_V2_REAR_FIXTURE,
  getSimplestDeckConfigForProtocol,
} from '@opentrons/shared-data'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { AddFixtureModal } from '../../../DeviceDetailsDeckConfiguration/AddFixtureModal'
import { DeckConfigurationDiscardChangesModal } from '../../../DeviceDetailsDeckConfiguration/DeckConfigurationDiscardChangesModal'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { getTopPortalEl } from '/app/App/portal'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { Dispatch, SetStateAction } from 'react'
import type {
  CutoutFixtureId,
  CutoutId,
  ModuleModel,
} from '@opentrons/shared-data'
import type { ModuleOnDeck } from '@opentrons/components'
import type { SetupScreens } from '../types'

interface ProtocolSetupDeckConfigurationProps {
  cutoutId: CutoutId | null
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  providedFixtureOptions: CutoutFixtureId[]
}

export function ProtocolSetupDeckConfiguration({
  cutoutId,
  runId,
  setSetupScreen,
  providedFixtureOptions,
}: ProtocolSetupDeckConfigurationProps): JSX.Element {
  const { i18n, t } = useTranslation([
    'protocol_setup',
    'devices_landing',
    'shared',
  ])

  const [showConfigurationModal, setShowConfigurationModal] = useState<boolean>(
    true
  )
  const [showDiscardChangeModal, setShowDiscardChangeModal] = useState<boolean>(
    false
  )

  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const deckConfig = useNotifyDeckConfigurationQuery()?.data ?? []

  const simplestDeckConfig = getSimplestDeckConfigForProtocol(
    mostRecentAnalysis
  ).map(({ cutoutId, cutoutFixtureId }) => ({ cutoutId, cutoutFixtureId }))

  const targetCutoutConfig = simplestDeckConfig.find(
    deck => deck.cutoutId === cutoutId
  )

  const mergedDeckConfig = deckConfig.map(config =>
    targetCutoutConfig != null &&
    config.cutoutId === targetCutoutConfig.cutoutId
      ? targetCutoutConfig
      : config
  )

  const modulesOnDeck = mergedDeckConfig.reduce<ModuleOnDeck[]>(
    (acc, cutoutConfig) => {
      const matchingFixtureIdsAndModel = Object.entries(
        MODULE_FIXTURES_BY_MODEL
      ).find(([_moduleModel, moduleFixtureIds]) =>
        moduleFixtureIds.includes(cutoutConfig.cutoutFixtureId)
      )
      if (
        matchingFixtureIdsAndModel != null &&
        cutoutConfig.cutoutFixtureId !== THERMOCYCLER_V2_REAR_FIXTURE
      ) {
        const [matchingModel] = matchingFixtureIdsAndModel
        return [
          ...acc,
          {
            moduleModel: matchingModel as ModuleModel,
            moduleLocation: {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[cutoutConfig.cutoutId],
            },
          },
        ]
      } else if (
        cutoutConfig.cutoutFixtureId ===
        STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE
      ) {
        return [
          ...acc,
          {
            moduleModel: MAGNETIC_BLOCK_V1_FIXTURE,
            moduleLocation: {
              slotName: FLEX_SINGLE_SLOT_BY_CUTOUT_ID[cutoutConfig.cutoutId],
            },
          },
        ]
      }
      return acc
    },
    []
  )

  const handleClickConfirm = (): void => {
    setSetupScreen('modules')
  }

  return (
    <>
      {createPortal(
        <>
          {showDiscardChangeModal ? (
            <DeckConfigurationDiscardChangesModal
              setShowConfirmationModal={setShowDiscardChangeModal}
            />
          ) : null}
          {showConfigurationModal && cutoutId != null ? (
            <AddFixtureModal
              cutoutId={cutoutId}
              closeModal={() => {
                setShowConfigurationModal(false)
              }}
              providedFixtureOptions={providedFixtureOptions}
              isOnDevice
            />
          ) : null}
        </>,
        getTopPortalEl()
      )}
      <Flex flexDirection={DIRECTION_COLUMN}>
        <ChildNavigation
          header={t('devices_landing:deck_configuration')}
          buttonText={i18n.format(t('shared:save'), 'capitalize')}
          onClickButton={handleClickConfirm}
        />
        <Flex
          marginTop="4rem"
          paddingX={SPACING.spacing40}
          justifyContent={JUSTIFY_CENTER}
          height="28.4375rem"
        >
          <BaseDeck
            deckConfig={mergedDeckConfig}
            robotType={FLEX_ROBOT_TYPE}
            modulesOnDeck={modulesOnDeck}
          />
        </Flex>
      </Flex>
    </>
  )
}
