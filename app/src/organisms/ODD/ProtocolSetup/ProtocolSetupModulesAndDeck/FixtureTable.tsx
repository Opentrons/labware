import { useState, Fragment } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Chip,
  DeckInfoLabel,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  FLEX_USB_MODULE_ADDRESSABLE_AREAS,
  getCutoutDisplayName,
  getDeckDefFromRobotType,
  getFixtureDisplayName,
  getSimplestDeckConfigForProtocol,
  SINGLE_SLOT_FIXTURES,
  TC_MODULE_LOCATION_OT3,
  THERMOCYCLER_V2_FRONT_FIXTURE,
  THERMOCYCLER_V2_REAR_FIXTURE,
} from '@opentrons/shared-data'

import { SmallButton } from '/app/atoms/buttons'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { getRequiredDeckConfig } from '/app/resources/deck_configuration/utils'
import { LocationConflictModal } from '/app/organisms/LocationConflictModal'
import { getLocalRobot } from '/app/redux/discovery'

import type { Dispatch, SetStateAction } from 'react'
import type {
  CompletedProtocolAnalysis,
  CutoutFixtureId,
  CutoutId,
  DeckDefinition,
  RobotType,
} from '@opentrons/shared-data'
import type { SetupScreens } from '../types'
import type { CutoutConfigAndCompatibility } from '/app/resources/deck_configuration/hooks'

interface FixtureTableProps {
  robotType: RobotType
  mostRecentAnalysis: CompletedProtocolAnalysis | null
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  setCutoutId: (cutoutId: CutoutId) => void
  setProvidedFixtureOptions: (providedFixtureOptions: CutoutFixtureId[]) => void
}

/**
 * Table of all "non-module" fixtures e.g. staging slot, waste chute, trash bin...
 * @param props
 * @returns JSX.Element
 */
export function FixtureTable({
  robotType,
  mostRecentAnalysis,
  setSetupScreen,
  setCutoutId,
  setProvidedFixtureOptions,
}: FixtureTableProps): JSX.Element | null {
  const requiredFixtureDetails = getSimplestDeckConfigForProtocol(
    mostRecentAnalysis
  )
  const deckConfigCompatibility = useDeckConfigurationCompatibility(
    robotType,
    mostRecentAnalysis
  )
  const deckDef = getDeckDefFromRobotType(robotType)
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : ''

  const requiredDeckConfigCompatibility = getRequiredDeckConfig(
    deckConfigCompatibility
  )

  const hasTwoLabwareThermocyclerConflicts =
    requiredDeckConfigCompatibility.some(
      ({ cutoutFixtureId, missingLabwareDisplayName }) =>
        cutoutFixtureId === THERMOCYCLER_V2_FRONT_FIXTURE &&
        missingLabwareDisplayName != null
    ) &&
    requiredDeckConfigCompatibility.some(
      ({ cutoutFixtureId, missingLabwareDisplayName }) =>
        cutoutFixtureId === THERMOCYCLER_V2_REAR_FIXTURE &&
        missingLabwareDisplayName != null
    )

  // if there are two labware conflicts with the thermocycler, don't show the conflict with the thermocycler rear fixture
  const filteredDeckConfigCompatibility = requiredDeckConfigCompatibility.filter(
    ({ cutoutFixtureId }) => {
      return (
        !hasTwoLabwareThermocyclerConflicts ||
        !(cutoutFixtureId === THERMOCYCLER_V2_REAR_FIXTURE)
      )
    }
  )

  // list not configured/conflicted fixtures first
  const sortedDeckConfigCompatibility = filteredDeckConfigCompatibility.sort(
    a =>
      a.cutoutFixtureId != null &&
      a.compatibleCutoutFixtureIds.includes(a.cutoutFixtureId)
        ? 1
        : -1
  )

  return sortedDeckConfigCompatibility.length > 0 ? (
    <>
      {sortedDeckConfigCompatibility.map((fixtureCompatibility, index) => {
        // filter out all fixtures that only provide module addressable areas (e.g. everything but StagingAreaWithMagBlockV1)
        // as they're handled in the Modules Table
        return fixtureCompatibility.requiredAddressableAreas.every(raa =>
          FLEX_USB_MODULE_ADDRESSABLE_AREAS.includes(raa)
        ) ? null : (
          <FixtureTableItem
            key={`FixtureTableItem_${index}`}
            {...fixtureCompatibility}
            lastItem={index === requiredFixtureDetails.length - 1}
            setSetupScreen={setSetupScreen}
            setCutoutId={setCutoutId}
            setProvidedFixtureOptions={setProvidedFixtureOptions}
            deckDef={deckDef}
            robotName={robotName}
          />
        )
      })}
    </>
  ) : null
}

interface FixtureTableItemProps extends CutoutConfigAndCompatibility {
  lastItem: boolean
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  setCutoutId: (cutoutId: CutoutId) => void
  setProvidedFixtureOptions: (providedFixtureOptions: CutoutFixtureId[]) => void
  deckDef: DeckDefinition
  robotName: string
}

function FixtureTableItem({
  cutoutId,
  cutoutFixtureId,
  compatibleCutoutFixtureIds,
  missingLabwareDisplayName,
  lastItem,
  setSetupScreen,
  setCutoutId,
  setProvidedFixtureOptions,
  deckDef,
  robotName,
}: FixtureTableItemProps): JSX.Element {
  const { t, i18n } = useTranslation('protocol_setup')

  const [
    showLocationConflictModal,
    setShowLocationConflictModal,
  ] = useState<boolean>(false)

  const isCurrentFixtureCompatible =
    cutoutFixtureId != null &&
    compatibleCutoutFixtureIds.includes(cutoutFixtureId)
  const isRequiredSingleSlotMissing = missingLabwareDisplayName != null

  const isThermocyclerCurrentFixture =
    cutoutFixtureId === THERMOCYCLER_V2_FRONT_FIXTURE ||
    cutoutFixtureId === THERMOCYCLER_V2_REAR_FIXTURE

  let chipLabel: JSX.Element
  if (!isCurrentFixtureCompatible) {
    const isConflictingFixtureConfigured =
      cutoutFixtureId != null && !SINGLE_SLOT_FIXTURES.includes(cutoutFixtureId)
    chipLabel = (
      <>
        <Chip
          text={
            isConflictingFixtureConfigured
              ? i18n.format(t('location_conflict'), 'capitalize')
              : i18n.format(t('not_configured'), 'capitalize')
          }
          type="warning"
          background={false}
          iconName="connection-status"
        />
        <SmallButton
          buttonCategory="rounded"
          buttonText={
            isConflictingFixtureConfigured ? t('resolve') : t('configure')
          }
          onClick={
            isConflictingFixtureConfigured
              ? () => {
                  setShowLocationConflictModal(true)
                }
              : () => {
                  setCutoutId(cutoutId)
                  setProvidedFixtureOptions(compatibleCutoutFixtureIds)
                  setSetupScreen('deck configuration')
                }
          }
        />
      </>
    )
  } else {
    chipLabel = (
      <Chip
        text={i18n.format(t('configured'), 'capitalize')}
        type="success"
        background={false}
        iconName="connection-status"
      />
    )
  }
  return (
    <Fragment key={cutoutId}>
      {showLocationConflictModal ? (
        <LocationConflictModal
          onCloseClick={() => {
            setShowLocationConflictModal(false)
          }}
          cutoutId={cutoutId}
          requiredFixtureId={compatibleCutoutFixtureIds[0]}
          isOnDevice={true}
          missingLabwareDisplayName={missingLabwareDisplayName}
          deckDef={deckDef}
          robotName={robotName}
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_ROW}
        alignItems={ALIGN_CENTER}
        backgroundColor={
          isCurrentFixtureCompatible ? COLORS.green35 : COLORS.yellow35
        }
        borderRadius={BORDERS.borderRadius8}
        gridGap={SPACING.spacing24}
        padding={`${SPACING.spacing16} ${SPACING.spacing24}`}
        marginBottom={lastItem ? SPACING.spacing68 : 'none'}
      >
        <Flex flex="3.5 0 0" alignItems={ALIGN_CENTER}>
          <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {cutoutFixtureId != null &&
            (isCurrentFixtureCompatible || isRequiredSingleSlotMissing)
              ? getFixtureDisplayName(cutoutFixtureId)
              : getFixtureDisplayName(compatibleCutoutFixtureIds?.[0])}
          </LegacyStyledText>
        </Flex>
        <Flex flex="2 0 0" alignItems={ALIGN_CENTER}>
          <DeckInfoLabel
            deckLabel={
              isThermocyclerCurrentFixture && isRequiredSingleSlotMissing
                ? TC_MODULE_LOCATION_OT3
                : getCutoutDisplayName(cutoutId)
            }
          />
        </Flex>
        <Flex
          flex="4 0 0"
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          {chipLabel}
        </Flex>
      </Flex>
    </Fragment>
  )
}
