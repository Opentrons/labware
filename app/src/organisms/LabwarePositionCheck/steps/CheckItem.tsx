import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import isEqual from 'lodash/isEqual'
import { Trans, useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import {
  RobotMotionLoader,
  PrepareSpace,
  JogToWell,
} from '/app/organisms/LabwarePositionCheck/shared'
import {
  FLEX_ROBOT_TYPE,
  getIsTiprack,
  getLabwareDefURI,
  getLabwareDisplayName,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'
import { getItemLabwareDef } from '/app/organisms/LabwarePositionCheck/utils'
import { getLabwareDisplayLocation } from '/app/local-resources/labware'
import { UnorderedList } from '/app/molecules/UnorderedList'
import { getCurrentOffsetForLabwareInLocation } from '/app/transformations/analysis'
import { getIsOnDevice } from '/app/redux/config'
import {
  setFinalPosition,
  setInitialPosition,
} from '/app/organisms/LabwarePositionCheck/redux/actions'

import type { PipetteName } from '@opentrons/shared-data'
import type { CheckPositionsStep, LPCStepProps } from '../types'

export function CheckItem(
  props: LPCStepProps<CheckPositionsStep>
): JSX.Element {
  const {
    step,
    protocolData,
    state,
    dispatch,
    proceed,
    existingOffsets,
    labwareDefs,
    commandUtils,
  } = props
  const { labwareId, pipetteId, moduleId, adapterId, location } = step
  const {
    handleJog,
    handlePrepModules,
    handleConfirmLwModulePlacement,
    handleConfirmLwFinalPosition,
    handleResetLwModulesOnDeck,
    isRobotMoving,
  } = commandUtils
  const { workingOffsets } = state
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const isOnDevice = useSelector(getIsOnDevice)
  const labwareDef = getItemLabwareDef({
    labwareId,
    loadedLabware: protocolData.labware,
    labwareDefs,
  })
  const pipette = protocolData.pipettes.find(
    pipette => pipette.id === pipetteId
  )
  const adapterDisplayName =
    adapterId != null
      ? getItemLabwareDef({
          labwareId: adapterId,
          loadedLabware: protocolData.labware,
          labwareDefs,
        })?.metadata.displayName
      : ''

  const pipetteName = pipette?.pipetteName as PipetteName

  const initialPosition = workingOffsets.find(
    o =>
      o.labwareId === labwareId &&
      isEqual(o.location, location) &&
      o.initialPosition != null
  )?.initialPosition

  useEffect(() => {
    handlePrepModules({ step, initialPosition })
  }, [moduleId])

  const handleDispatchConfirmInitialPlacement = (): void => {
    void handleConfirmLwModulePlacement({ step }).then(position => {
      dispatch(
        setInitialPosition({
          labwareId,
          location,
          position,
        })
      )
    })
  }

  const handleDispatchConfirmFinalPlacement = (): void => {
    void handleConfirmLwFinalPosition({
      step,
      onSuccess: proceed,
      pipette,
    }).then(position => {
      dispatch(
        setFinalPosition({
          labwareId,
          location,
          position,
        })
      )
    })
  }

  const handleDispatchResetLwModulesOnDeck = (): void => {
    void handleResetLwModulesOnDeck({ step }).then(() => {
      dispatch(
        setInitialPosition({
          labwareId,
          location,
          position: null,
        })
      )
    })
  }

  // TOME TODO: Error instead of returning null.
  // if (pipetteName == null || labwareDef == null || pipetteMount == null)
  //   return null

  const isTiprack = getIsTiprack(labwareDef)
  const displayLocation = getLabwareDisplayLocation({
    location,
    allRunDefs: labwareDefs,
    detailLevel: 'full',
    t,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
  })
  const slotOnlyDisplayLocation = getLabwareDisplayLocation({
    location,
    detailLevel: 'slot-only',
    t,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
  })

  const labwareDisplayName = getLabwareDisplayName(labwareDef)

  let placeItemInstruction: JSX.Element = (
    <Trans
      t={t}
      i18nKey="place_labware_in_location"
      tOptions={{ labware: labwareDisplayName, location: displayLocation }}
      components={{
        bold: (
          <LegacyStyledText
            as="span"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          />
        ),
      }}
    />
  )

  if (isTiprack) {
    placeItemInstruction = (
      <Trans
        t={t}
        i18nKey="place_a_full_tip_rack_in_location"
        tOptions={{ tip_rack: labwareDisplayName, location: displayLocation }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  } else if (adapterId != null) {
    placeItemInstruction = (
      <Trans
        t={t}
        i18nKey="place_labware_in_adapter_in_location"
        tOptions={{
          adapter: adapterDisplayName,
          labware: labwareDisplayName,
          location: slotOnlyDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  }

  const existingOffset =
    getCurrentOffsetForLabwareInLocation(
      existingOffsets,
      getLabwareDefURI(labwareDef),
      location
    )?.vector ?? IDENTITY_VECTOR

  if (isRobotMoving)
    return (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  return (
    <Flex flexDirection={DIRECTION_COLUMN} minHeight="29.5rem">
      {initialPosition != null ? (
        <JogToWell
          header={t('check_item_in_location', {
            item: isTiprack ? t('tip_rack') : t('labware'),
            location: slotOnlyDisplayLocation,
          })}
          body={
            <Trans
              t={t}
              i18nKey={
                isOnDevice
                  ? 'ensure_nozzle_position_odd'
                  : 'ensure_nozzle_position_desktop'
              }
              values={{
                tip_type: t('calibration_probe'),
                item_location: isTiprack
                  ? t('check_tip_location')
                  : t('check_well_location'),
              }}
              components={{
                block: <LegacyStyledText as="p" />,
                bold: <strong />,
              }}
            />
          }
          labwareDef={labwareDef}
          pipetteName={pipetteName}
          handleConfirmPosition={handleDispatchConfirmFinalPlacement}
          handleGoBack={handleDispatchResetLwModulesOnDeck}
          handleJog={handleJog}
          initialPosition={initialPosition}
          existingOffset={existingOffset}
          {...props}
        />
      ) : (
        <PrepareSpace
          header={t('prepare_item_in_location', {
            item: isTiprack ? t('tip_rack') : t('labware'),
            location: slotOnlyDisplayLocation,
          })}
          body={
            <UnorderedList
              items={[
                isOnDevice ? t('clear_all_slots_odd') : t('clear_all_slots'),
                placeItemInstruction,
              ]}
            />
          }
          labwareDef={labwareDef}
          confirmPlacement={handleDispatchConfirmInitialPlacement}
          location={step.location}
          {...props}
        />
      )}
    </Flex>
  )
}
