import { useState } from 'react'
import map from 'lodash/map'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  SPACING,
  TOOLTIP_LEFT,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  getCutoutIdForSlotName,
  getDeckDefFromRobotType,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_V1,
  OT2_ROBOT_TYPE,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
} from '@opentrons/shared-data'

import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { TertiaryButton } from '/app/atoms/buttons'
import { StatusLabel } from '/app/atoms/StatusLabel'
import {
  useChainLiveCommands,
  useRunCalibrationStatus,
  useModuleRenderInfoForProtocolById,
  useUnmatchedModulesForProtocol,
} from '/app/resources/runs'
import { ModuleSetupModal } from '/app/organisms/ModuleCard/ModuleSetupModal'
import { ModuleWizardFlows } from '/app/organisms/ModuleWizardFlows'
import {
  getModulePrepCommands,
  getModuleImage,
} from '/app/local-resources/modules'
import { getModuleTooHot } from '/app/transformations/modules'

import { LocationConflictModal } from '/app/organisms/LocationConflictModal'
import { OT2MultipleModulesHelp } from './OT2MultipleModulesHelp'
import { UnMatchedModuleWarning } from './UnMatchedModuleWarning'

import type {
  CutoutConfig,
  DeckDefinition,
  ModuleModel,
} from '@opentrons/shared-data'
import type { AttachedModule } from '/app/redux/modules/types'
import type {
  ProtocolCalibrationStatus,
  ModuleRenderInfoForProtocol,
} from '/app/resources/runs'

interface SetupModulesListProps {
  robotName: string
  runId: string
}

export const SetupModulesList = (props: SetupModulesListProps): JSX.Element => {
  const { robotName, runId } = props
  const moduleRenderInfoForProtocolById = useModuleRenderInfoForProtocolById(
    runId
  )
  const {
    missingModuleIds,
    remainingAttachedModules,
  } = useUnmatchedModulesForProtocol(robotName, runId)

  const isFlex = useIsFlex(robotName)
  const { robotModel } = useRobot(robotName) ?? {}
  const deckDef = getDeckDefFromRobotType(robotModel ?? FLEX_ROBOT_TYPE)

  const calibrationStatus = useRunCalibrationStatus(robotName, runId)

  const moduleModels = map(
    moduleRenderInfoForProtocolById,
    ({ moduleDef }) => moduleDef.model
  )
  const showOT2MoamHelp =
    robotModel === OT2_ROBOT_TYPE &&
    new Set(moduleModels).size !== moduleModels.length
  return (
    <>
      {showOT2MoamHelp ? <OT2MultipleModulesHelp /> : null}
      {remainingAttachedModules.length !== 0 &&
      missingModuleIds.length !== 0 ? (
        <UnMatchedModuleWarning />
      ) : null}

      {map(
        moduleRenderInfoForProtocolById,
        ({
          moduleDef,
          attachedModuleMatch,
          slotName,
          moduleId,
          conflictedFixture,
        }) => {
          // filter out the magnetic block here, because it is handled by the SetupFixturesList
          if (moduleDef.moduleType === MAGNETIC_BLOCK_TYPE) return null
          return (
            <ModulesListItem
              key={`SetupModulesList_${String(
                moduleDef.model
              )}_slot_${slotName}`}
              moduleModel={moduleDef.model}
              displayName={moduleDef.displayName}
              slotName={slotName}
              attachedModuleMatch={attachedModuleMatch}
              heaterShakerModuleFromProtocol={
                moduleRenderInfoForProtocolById[moduleId].moduleDef
                  .moduleType === HEATERSHAKER_MODULE_TYPE
                  ? moduleRenderInfoForProtocolById[moduleId]
                  : null
              }
              isFlex={isFlex}
              calibrationStatus={calibrationStatus}
              conflictedFixture={conflictedFixture}
              deckDef={deckDef}
              robotName={robotName}
            />
          )
        }
      )}
    </>
  )
}

interface ModulesListItemProps {
  moduleModel: ModuleModel
  displayName: string
  slotName: string
  attachedModuleMatch: AttachedModule | null
  heaterShakerModuleFromProtocol: ModuleRenderInfoForProtocol | null
  isFlex: boolean
  calibrationStatus: ProtocolCalibrationStatus
  deckDef: DeckDefinition
  conflictedFixture: CutoutConfig | null
  robotName: string
}

export function ModulesListItem({
  moduleModel,
  displayName,
  slotName,
  attachedModuleMatch,
  isFlex,
  calibrationStatus,
  conflictedFixture,
  deckDef,
  robotName,
}: ModulesListItemProps): JSX.Element {
  const { t } = useTranslation(['protocol_setup', 'module_wizard_flows'])
  const moduleConnectionStatus =
    attachedModuleMatch != null
      ? t('module_connected')
      : t('module_not_connected')
  const [showModuleSetupModal, setShowModuleSetupModal] = useState<
    string | null
  >(null)
  const [
    showLocationConflictModal,
    setShowLocationConflictModal,
  ] = useState<boolean>(false)

  const [showModuleWizard, setShowModuleWizard] = useState<boolean>(false)
  const { chainLiveCommands, isCommandMutationLoading } = useChainLiveCommands()
  const [
    prepCommandErrorMessage,
    setPrepCommandErrorMessage,
  ] = useState<string>('')

  const handleCalibrateClick = (): void => {
    if (attachedModuleMatch != null) {
      chainLiveCommands(
        getModulePrepCommands(attachedModuleMatch),
        false
      ).catch((e: Error) => {
        setPrepCommandErrorMessage(e.message)
      })
    }
    setShowModuleWizard(true)
  }

  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: TOOLTIP_LEFT,
  })

  let subText: JSX.Element | null = null
  if (
    moduleModel === HEATERSHAKER_MODULE_V1 ||
    moduleModel === ABSORBANCE_READER_V1
  ) {
    subText = (
      <Btn
        marginLeft={SPACING.spacing20}
        css={css`
          color: ${COLORS.blue50};

          &:hover {
            color: ${COLORS.blue55};
          }
        `}
        marginTop={SPACING.spacing4}
        onClick={() => {
          setShowModuleSetupModal(displayName)
        }}
      >
        <Flex flexDirection={DIRECTION_ROW}>
          <LegacyStyledText as="p">
            {t('view_setup_instructions')}
          </LegacyStyledText>
        </Flex>
      </Btn>
    )
  } else if (moduleModel === MAGNETIC_BLOCK_V1) {
    subText = (
      <LegacyStyledText
        as="p"
        marginLeft={SPACING.spacing20}
        color={COLORS.grey50}
      >
        {t('no_usb_connection_required')}
      </LegacyStyledText>
    )
  }

  const isModuleTooHot =
    attachedModuleMatch != null ? getModuleTooHot(attachedModuleMatch) : false

  let calibrateDisabledReason = t('calibrate_pipette_before_module_calibration')
  if (calibrationStatus.reason === 'attach_pipette_failure_reason') {
    calibrateDisabledReason = t('attach_pipette_before_module_calibration')
  } else if (isModuleTooHot) {
    calibrateDisabledReason = t('module_wizard_flows:module_too_hot')
  }

  let renderModuleStatus: JSX.Element = (
    <StatusLabel
      status={moduleConnectionStatus}
      backgroundColor={COLORS.green30}
      iconColor={COLORS.green60}
      textColor={COLORS.green60}
    />
  )

  if (
    isFlex &&
    attachedModuleMatch != null &&
    attachedModuleMatch.moduleType !== ABSORBANCE_READER_TYPE &&
    attachedModuleMatch.moduleOffset?.last_modified == null
  ) {
    renderModuleStatus = (
      <>
        <TertiaryButton
          {...targetProps}
          onClick={handleCalibrateClick}
          disabled={!calibrationStatus?.complete || isModuleTooHot}
        >
          {t('calibrate_now')}
        </TertiaryButton>
        {(!calibrationStatus?.complete && calibrationStatus?.reason != null) ||
        isModuleTooHot ? (
          <Tooltip tooltipProps={tooltipProps}>
            {calibrateDisabledReason}
          </Tooltip>
        ) : null}
      </>
    )
  } else if (attachedModuleMatch == null) {
    renderModuleStatus = (
      <StatusLabel
        status={moduleConnectionStatus}
        backgroundColor={COLORS.yellow30}
        iconColor={COLORS.yellow60}
        textColor={COLORS.yellow60}
      />
    )
  }

  // convert slot name to cutout id
  const cutoutIdForSlotName = getCutoutIdForSlotName(slotName, deckDef)

  const portDisplay =
    attachedModuleMatch?.usbPort?.hubPort != null
      ? `${attachedModuleMatch.usbPort.port}.${attachedModuleMatch.usbPort.hubPort}`
      : attachedModuleMatch?.usbPort?.port

  return (
    <>
      {showLocationConflictModal && cutoutIdForSlotName != null ? (
        <LocationConflictModal
          onCloseClick={() => {
            setShowLocationConflictModal(false)
          }}
          cutoutId={cutoutIdForSlotName}
          requiredModule={moduleModel}
          deckDef={deckDef}
          robotName={robotName}
        />
      ) : null}
      {showModuleWizard && attachedModuleMatch != null ? (
        <ModuleWizardFlows
          attachedModule={attachedModuleMatch}
          closeFlow={() => {
            setShowModuleWizard(false)
          }}
          isPrepCommandLoading={isCommandMutationLoading}
          prepCommandErrorMessage={
            prepCommandErrorMessage === '' ? undefined : prepCommandErrorMessage
          }
        />
      ) : null}
      <Box
        border={BORDERS.styleSolid}
        borderColor={COLORS.grey30}
        borderWidth="1px"
        borderRadius={BORDERS.borderRadius4}
        padding={SPACING.spacing16}
        backgroundColor={COLORS.white}
      >
        {showModuleSetupModal != null ? (
          <ModuleSetupModal
            close={() => {
              setShowModuleSetupModal(null)
            }}
            moduleDisplayName={showModuleSetupModal}
            isAbsorbanceReader={moduleModel === ABSORBANCE_READER_V1}
          />
        ) : null}
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={JUSTIFY_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex alignItems={JUSTIFY_CENTER} width="45%">
            <img width="60px" height="54px" src={getModuleImage(moduleModel)} />
            <Flex flexDirection={DIRECTION_COLUMN}>
              <LegacyStyledText
                css={TYPOGRAPHY.pSemiBold}
                marginLeft={SPACING.spacing20}
              >
                {displayName}
              </LegacyStyledText>
              {subText}
            </Flex>
          </Flex>
          <Flex
            width="15%"
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <LegacyStyledText as="p">
              {getModuleType(moduleModel) === 'thermocyclerModuleType'
                ? isFlex
                  ? TC_MODULE_LOCATION_OT3
                  : TC_MODULE_LOCATION_OT2
                : slotName}
            </LegacyStyledText>
            {portDisplay != null ? (
              <LegacyStyledText as="p">
                {t('usb_port_number', {
                  port: portDisplay,
                })}
              </LegacyStyledText>
            ) : null}
          </Flex>
          <Flex
            width="15%"
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing10}
          >
            {conflictedFixture != null && isFlex ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing10}
              >
                <StatusLabel
                  status={t('location_conflict')}
                  backgroundColor={COLORS.yellow30}
                  iconColor={COLORS.yellow60}
                  textColor={COLORS.yellow60}
                />
                <TertiaryButton
                  width="max-content"
                  onClick={() => {
                    setShowLocationConflictModal(true)
                  }}
                >
                  <LegacyStyledText as="label" cursor="pointer">
                    {t('resolve')}
                  </LegacyStyledText>
                </TertiaryButton>
              </Flex>
            ) : moduleModel === MAGNETIC_BLOCK_V1 ? (
              <StatusLabel
                status={t('n_a')}
                backgroundColor={COLORS.grey30}
                textColor={COLORS.grey60}
                showIcon={false}
                capitalizeStatus={false}
              />
            ) : (
              renderModuleStatus
            )}
          </Flex>
        </Flex>
      </Box>
    </>
  )
}
