import { Trans, useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  DIRECTION_COLUMN,
  Flex,
  LegacyStyledText,
  getLabwareDisplayLocation,
} from '@opentrons/components'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { UnorderedList } from '/app/molecules/UnorderedList'
import {
  applyOffset,
  clearSelectedLabware,
  setFinalPosition,
  setInitialPosition,
} from '/app/redux/protocol-runs/actions'
import { EditOffset } from './EditOffset'
import { PrepareLabware } from './PrepareLabware'
import { PlaceItemInstruction } from './PlaceItemInstruction'
import {
  selectSelectedLwInitialPosition,
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLabwareInfo,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

import type { DisplayLocationParams } from '@opentrons/components'
import type { LoadedPipette } from '@opentrons/shared-data'
import type { State } from '/app/redux/types'
import type {
  LPCWizardState,
  OffsetLocationDetails,
  SelectedLabwareInfo,
} from '/app/redux/protocol-runs'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function CheckItem(props: LPCWizardContentProps): JSX.Element {
  const { runId, commandUtils } = props
  const {
    handleJog,
    handleConfirmLwModulePlacement,
    handleConfirmLwFinalPosition,
    handleResetLwModulesOnDeck,
    toggleRobotMoving,
  } = commandUtils
  const dispatch = useDispatch()

  const isOnDevice = useSelector(getIsOnDevice)
  const { protocolData, labwareDefs } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const { t } = useTranslation(['labware_position_check', 'shared'])
  const { t: commandTextT } = useTranslation('protocol_command_text')

  const pipette = useSelector(selectActivePipette(runId)) as LoadedPipette
  const pipetteId = pipette.id
  const initialPosition = useSelector(selectSelectedLwInitialPosition(runId))
  const isLwTiprack = useSelector(selectIsSelectedLwTipRack(runId))
  const selectedLwInfo = useSelector(
    selectSelectedLabwareInfo(runId)
  ) as SelectedLabwareInfo
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails

  const buildDisplayParams = (): Omit<
    DisplayLocationParams,
    'detailLevel'
  > => ({
    t: commandTextT,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
    location: offsetLocationDetails,
  })

  const slotOnlyDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'slot-only',
    ...buildDisplayParams(),
  })
  const fullDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'full',
    allRunDefs: labwareDefs,
    ...buildDisplayParams(),
  })

  const handlePrepareProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() =>
        handleConfirmLwModulePlacement(offsetLocationDetails, pipetteId)
      )
      .then(position => {
        dispatch(
          setInitialPosition(runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position,
          })
        )
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleJogProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleConfirmLwFinalPosition(offsetLocationDetails, pipette))
      .then(position => {
        dispatch(
          setFinalPosition(runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position,
          })
        )
      })
      // TODO(jh, 01-30-25): This entire sequence of dispatches can be reduced to one dispatch
      //  after the API changes, but should be separate until then. See APPLY_OFFSET comment in LPC reducer.
      .then(() => {
        dispatch(applyOffset(runId, selectedLwInfo.uri))
      })
      .then(() => {
        dispatch(clearSelectedLabware(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleGoBack = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleResetLwModulesOnDeck(offsetLocationDetails))
      .then(() => {
        dispatch(
          setInitialPosition(runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position: null,
          })
        )
      })
      .finally(() => toggleRobotMoving(false))
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} minHeight="29.5rem">
      {initialPosition != null ? (
        <EditOffset
          header={t('check_item_in_location', {
            item: isLwTiprack ? t('tip_rack') : t('labware'),
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
                item_location: isLwTiprack
                  ? t('check_tip_location')
                  : t('check_well_location'),
              }}
              components={{
                block: <LegacyStyledText as="p" />,
                bold: <strong />,
              }}
            />
          }
          handleConfirmPosition={handleJogProceed}
          handleGoBack={handleGoBack}
          handleJog={handleJog}
          {...props}
        />
      ) : (
        <PrepareLabware
          {...props}
          header={t('prepare_item_in_location', {
            item: isLwTiprack ? t('tip_rack') : t('labware'),
            location: slotOnlyDisplayLocation,
          })}
          body={
            <UnorderedList
              items={[
                isOnDevice ? t('clear_all_slots_odd') : t('clear_all_slots'),
                <PlaceItemInstruction
                  key={slotOnlyDisplayLocation}
                  isLwTiprack={isLwTiprack}
                  slotOnlyDisplayLocation={slotOnlyDisplayLocation}
                  fullDisplayLocation={fullDisplayLocation}
                  labwareInfo={selectedLwInfo}
                  {...props}
                />,
              ]}
            />
          }
          confirmPlacement={handlePrepareProceed}
          selectedLwInfo={selectedLwInfo}
        />
      )}
    </Flex>
  )
}
