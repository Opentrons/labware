import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getDeckDefFromRobotType,
} from '@opentrons/shared-data'
import { RUN_STATUS_STOPPED } from '@opentrons/api-client'

import { getTopPortalEl } from '/app/App/portal'
import { FloatingActionButton } from '/app/atoms/buttons'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useAttachedModules } from '/app/resources/modules'
import {
  getProtocolModulesInfo,
  getAttachedProtocolModuleMatches,
} from '/app/transformations/analysis'
import {
  useRunStatus,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { getUnmatchedModulesForProtocol } from './utils'
import { SetupInstructionsModal } from './SetupInstructionsModal'
import { FixtureTable } from './FixtureTable'
import { ModuleTable } from './ModuleTable'
import { ModulesAndDeckMapView } from './ModulesAndDeckMapView'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { Dispatch, SetStateAction } from 'react'
import type { CutoutId, CutoutFixtureId } from '@opentrons/shared-data'
import type { SetupScreens } from '../types'

const ATTACHED_MODULE_POLL_MS = 5000
const DECK_CONFIG_POLL_MS = 5000

interface ProtocolSetupModulesAndDeckProps {
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  setCutoutId: (cutoutId: CutoutId) => void
  setProvidedFixtureOptions: (providedFixtureOptions: CutoutFixtureId[]) => void
}

/**
 * an ODD screen on the Protocol Setup page
 */
export function ProtocolSetupModulesAndDeck({
  runId,
  setSetupScreen,
  setCutoutId,
  setProvidedFixtureOptions,
}: ProtocolSetupModulesAndDeckProps): JSX.Element {
  const { i18n, t } = useTranslation('protocol_setup')
  const navigate = useNavigate()
  const runStatus = useRunStatus(runId)
  useEffect(() => {
    if (runStatus === RUN_STATUS_STOPPED) {
      navigate('/protocols')
    }
  }, [runStatus, navigate])
  const [
    showSetupInstructionsModal,
    setShowSetupInstructionsModal,
  ] = useState<boolean>(false)
  const [showMapView, setShowMapView] = useState<boolean>(false)
  const [
    clearModuleMismatchBanner,
    setClearModuleMismatchBanner,
  ] = useState<boolean>(false)
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)

  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const { data: deckConfig = [] } = useNotifyDeckConfigurationQuery({
    refetchInterval: DECK_CONFIG_POLL_MS,
  })
  const attachedModules =
    useAttachedModules({
      refetchInterval: ATTACHED_MODULE_POLL_MS,
    }) ?? []

  const protocolModulesInfo =
    mostRecentAnalysis != null
      ? getProtocolModulesInfo(mostRecentAnalysis, deckDef)
      : []

  const attachedProtocolModuleMatches = getAttachedProtocolModuleMatches(
    attachedModules,
    protocolModulesInfo,
    deckConfig
  )

  const hasModules = attachedProtocolModuleMatches.length > 0

  const {
    missingModuleIds,
    remainingAttachedModules,
  } = getUnmatchedModulesForProtocol(attachedModules, protocolModulesInfo)

  const isModuleMismatch =
    remainingAttachedModules.length > 0 && missingModuleIds.length > 0
  return (
    <>
      {createPortal(
        <>
          {showSetupInstructionsModal ? (
            <SetupInstructionsModal
              setShowSetupInstructionsModal={setShowSetupInstructionsModal}
            />
          ) : null}
        </>,
        getTopPortalEl()
      )}
      <ChildNavigation
        header={t('deck_hardware')}
        onClickBack={() => {
          setSetupScreen('prepare to run')
        }}
        buttonText={i18n.format(t('setup_instructions'), 'titleCase')}
        buttonType="tertiaryLowLight"
        iconName="information"
        iconPlacement="startIcon"
        onClickButton={() => {
          setShowSetupInstructionsModal(true)
        }}
      />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
        marginTop="5.75rem"
        marginBottom={SPACING.spacing80}
      >
        {showMapView ? (
          <Flex height="55vh" justifyContent={JUSTIFY_CENTER}>
            <ModulesAndDeckMapView
              attachedProtocolModuleMatches={attachedProtocolModuleMatches}
              runId={runId}
              protocolAnalysis={mostRecentAnalysis}
            />
          </Flex>
        ) : (
          <>
            {isModuleMismatch && !clearModuleMismatchBanner ? (
              <InlineNotification
                type="alert"
                onCloseClick={e => {
                  e.stopPropagation()
                  setClearModuleMismatchBanner(true)
                }}
                heading={t('extra_module_attached')}
                message={t('module_mismatch_body')}
              />
            ) : null}
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
              <Flex
                color={COLORS.grey60}
                fontSize={TYPOGRAPHY.fontSize22}
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                gridGap={SPACING.spacing24}
                lineHeight={TYPOGRAPHY.lineHeight28}
                paddingX={SPACING.spacing24}
              >
                <LegacyStyledText flex="3.5 0 0">
                  {i18n.format(t('deck_hardware'), 'titleCase')}
                </LegacyStyledText>
                <LegacyStyledText flex="2 0 0">
                  {t('location')}
                </LegacyStyledText>
                <LegacyStyledText flex="4 0 0"> {t('status')}</LegacyStyledText>
              </Flex>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                {hasModules ? (
                  <ModuleTable
                    attachedProtocolModuleMatches={
                      attachedProtocolModuleMatches
                    }
                    deckDef={deckDef}
                    runId={runId}
                  />
                ) : null}
                <FixtureTable
                  robotType={FLEX_ROBOT_TYPE}
                  mostRecentAnalysis={mostRecentAnalysis}
                  setSetupScreen={setSetupScreen}
                  setCutoutId={setCutoutId}
                  setProvidedFixtureOptions={setProvidedFixtureOptions}
                />
              </Flex>
            </Flex>
          </>
        )}
      </Flex>
      <FloatingActionButton
        buttonText={showMapView ? t('list_view') : t('map_view')}
        onClick={() => {
          setShowMapView(mapView => !mapView)
        }}
      />
    </>
  )
}
