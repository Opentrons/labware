import { useEffect, useState } from 'react'
import last from 'lodash/last'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import first from 'lodash/first'

import { RUN_STATUS_IDLE, RUN_STATUS_STOPPED } from '@opentrons/api-client'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  OVERFLOW_WRAP_ANYWHERE,
  POSITION_STICKY,
  SPACING,
  truncateString,
  TYPOGRAPHY,
  useConditionalConfirm,
} from '@opentrons/components'
import {
  useProtocolQuery,
  useInstrumentsQuery,
  useDoorQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import {
  getDeckDefFromRobotType,
  getModuleDisplayName,
  getFixtureDisplayName,
} from '@opentrons/shared-data'

import { useRobotType } from '/app/redux-resources/robots'
import {
  useRobotAnalyticsData,
  useTrackProtocolRunEvent,
} from '/app/redux-resources/analytics'
import { useAttachedModules } from '/app/resources/modules'

import { getProtocolModulesInfo } from '/app/transformations/analysis'
import {
  AnalysisFailedModal,
  ProtocolSetupDeckConfiguration,
  ProtocolSetupInstruments,
  ProtocolSetupLabware,
  ProtocolSetupLiquids,
  ProtocolSetupModulesAndDeck,
  ProtocolSetupOffsets,
  ProtocolSetupStep,
  ProtocolSetupStepSkeleton,
  ProtocolSetupTitleSkeleton,
  getUnmatchedModulesForProtocol,
  getIncompleteInstrumentCount,
  ViewOnlyParameters,
} from '/app/organisms/ODD/ProtocolSetup'
import { useLaunchLegacyLPC } from '/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC'
import { ConfirmCancelRunModal } from '/app/organisms/ODD/RunningProtocol'
import { useRunControls } from '/app/organisms/RunTimeControl/hooks'
import { useToaster } from '/app/organisms/ToasterOven'
import { useIsHeaterShakerInProtocol } from '/app/organisms/ModuleCard/hooks'
import { getLocalRobot, getRobotSerialNumber } from '/app/redux/discovery'
import {
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
  ANALYTICS_PROTOCOL_RUN_ACTION,
  useTrackEvent,
} from '/app/redux/analytics'
import { getIsHeaterShakerAttached, useFeatureFlag } from '/app/redux/config'
import { ConfirmAttachedModal } from './ConfirmAttachedModal'
import { ConfirmSetupStepsCompleteModal } from './ConfirmSetupStepsCompleteModal'
import { getLatestCurrentOffsets } from '/app/transformations/runs'
import { CloseButton, PlayButton } from './Buttons'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { getRequiredDeckConfig } from '/app/resources/deck_configuration/utils'
import {
  useNotifyRunQuery,
  useRunStatus,
  useLPCDisabledReason,
  useModuleCalibrationStatus,
  useProtocolAnalysisErrors,
} from '/app/resources/runs'
import { useScrollPosition } from '/app/local-resources/dom-utils'
import {
  getLabwareSetupItemGroups,
  getProtocolUsesGripper,
  useRequiredProtocolHardwareFromAnalysis,
  useMissingProtocolHardwareFromAnalysis,
} from '/app/transformations/commands'

import type { Dispatch, SetStateAction } from 'react'
import type { Run } from '@opentrons/api-client'
import type { CutoutFixtureId, CutoutId } from '@opentrons/shared-data'
import type { OnDeviceRouteParams } from '/app/App/types'
import type { ProtocolModuleInfo } from '/app/transformations/analysis'
import type { SetupScreens } from '/app/organisms/ODD/ProtocolSetup'
import type {
  ProtocolHardware,
  ProtocolFixture,
} from '/app/transformations/commands'

const FETCH_DURATION_MS = 5000

const ANALYSIS_POLL_MS = 5000
interface PrepareToRunProps {
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  confirmAttachment: () => void
  confirmStepsComplete: () => void
  play: () => void
  robotName: string
  runRecord: Run | null
  labwareConfirmed: boolean
  liquidsConfirmed: boolean
  offsetsConfirmed: boolean
}

function PrepareToRun({
  runId,
  setSetupScreen,
  confirmAttachment,
  play,
  robotName,
  runRecord,
  labwareConfirmed,
  liquidsConfirmed,
  offsetsConfirmed,
  confirmStepsComplete,
}: PrepareToRunProps): JSX.Element {
  const { t, i18n } = useTranslation(['protocol_setup', 'shared'])
  const navigate = useNavigate()
  const { makeSnackbar } = useToaster()
  const { scrollRef, isScrolled } = useScrollPosition()

  const protocolId = runRecord?.data?.protocolId ?? null
  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })

  const { data: attachedInstruments } = useInstrumentsQuery()
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name ??
    ''

  const mostRecentAnalysisSummary = last(protocolRecord?.data.analysisSummaries)
  const [
    isPollingForCompletedAnalysis,
    setIsPollingForCompletedAnalysis,
  ] = useState<boolean>(mostRecentAnalysisSummary?.status !== 'completed')

  const {
    data: mostRecentAnalysis = null,
  } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    last(protocolRecord?.data.analysisSummaries)?.id ?? null,
    {
      enabled: protocolRecord != null && isPollingForCompletedAnalysis,
      refetchInterval: ANALYSIS_POLL_MS,
    }
  )

  const runStatus = useRunStatus(runId)
  if (runStatus === RUN_STATUS_STOPPED) {
    navigate('/protocols')
  }

  useEffect(() => {
    if (mostRecentAnalysis?.status === 'completed') {
      setIsPollingForCompletedAnalysis(false)
    } else {
      setIsPollingForCompletedAnalysis(true)
    }
  }, [mostRecentAnalysis?.status])

  const robotType = useRobotType(robotName)

  const onConfirmCancelClose = (): void => {
    setShowConfirmCancelModal(false)
    navigate(-1)
  }

  const protocolHasModules =
    mostRecentAnalysis?.modules != null &&
    mostRecentAnalysis?.modules.length > 0
  const attachedModules =
    useAttachedModules({
      refetchInterval: FETCH_DURATION_MS,
    }) ?? []

  const { requiredProtocolHardware } = useRequiredProtocolHardwareFromAnalysis(
    mostRecentAnalysis
  )

  const requiredFixtures = requiredProtocolHardware.filter(
    (hardware): hardware is ProtocolFixture => {
      return hardware.hardwareType === 'fixture'
    }
  )

  const protocolHasFixtures = requiredFixtures.length > 0

  const isHeaterShakerInProtocol = useIsHeaterShakerInProtocol()

  const deckDef = getDeckDefFromRobotType(robotType)

  const protocolModulesInfo =
    mostRecentAnalysis != null
      ? getProtocolModulesInfo(mostRecentAnalysis, deckDef)
      : []

  const { missingModuleIds } = getUnmatchedModulesForProtocol(
    attachedModules,
    protocolModulesInfo
  )
  const incompleteInstrumentCount: number | null =
    mostRecentAnalysis != null && attachedInstruments != null
      ? getIncompleteInstrumentCount(mostRecentAnalysis, attachedInstruments)
      : null

  const isMissingModules = missingModuleIds.length > 0

  const moduleCalibrationStatus = useModuleCalibrationStatus(robotName, runId)

  const runTimeParameters = mostRecentAnalysis?.runTimeParameters ?? []
  const hasRunTimeParameters = runTimeParameters.length > 0
  const hasCustomRunTimeParameters = runTimeParameters.some(
    parameter =>
      parameter.type === 'csv_file' || parameter.value !== parameter.default
  )

  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState<boolean>(
    false
  )

  const deckConfigCompatibility = useDeckConfigurationCompatibility(
    robotType,
    mostRecentAnalysis
  )

  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)

  const requiredDeckConfigCompatibility = getRequiredDeckConfig(
    deckConfigCompatibility
  )

  // True if any server request is still pending.
  const isLoading =
    mostRecentAnalysis == null ||
    attachedInstruments == null ||
    (protocolHasModules && attachedModules == null)

  const speccedInstrumentCount =
    mostRecentAnalysis !== null
      ? mostRecentAnalysis.pipettes.length +
        (getProtocolUsesGripper(mostRecentAnalysis) ? 1 : 0)
      : 0

  const { missingProtocolHardware } = useMissingProtocolHardwareFromAnalysis(
    robotType,
    mostRecentAnalysis
  )

  const locationConflictSlots = requiredDeckConfigCompatibility.map(
    fixtureCompatibility => {
      const {
        compatibleCutoutFixtureIds,
        cutoutFixtureId,
      } = fixtureCompatibility
      const isCurrentFixtureCompatible =
        cutoutFixtureId != null &&
        compatibleCutoutFixtureIds.includes(cutoutFixtureId)
      return !isCurrentFixtureCompatible && cutoutFixtureId != null
    }
  )
  const isLocationConflict = locationConflictSlots.some(
    conflictSlot => conflictSlot
  )

  const missingPipettes = missingProtocolHardware.filter(
    hardware => hardware.hardwareType === 'pipette'
  )

  const missingGripper = missingProtocolHardware.filter(
    hardware => hardware.hardwareType === 'gripper'
  )

  const missingModules = missingProtocolHardware.filter(
    hardware => hardware.hardwareType === 'module'
  )
  const missingFixtures = missingProtocolHardware.filter(
    (hardware): hardware is ProtocolFixture =>
      hardware.hardwareType === 'fixture'
  )

  let instrumentsDetail
  if (missingPipettes.length > 0 && missingGripper.length > 0) {
    instrumentsDetail = t('missing_instruments', {
      count: missingPipettes.length + missingGripper.length,
    })
  } else if (missingPipettes.length > 0) {
    instrumentsDetail = t('missing_pipettes', { count: missingPipettes.length })
  } else if (missingGripper.length > 0) {
    instrumentsDetail = t('missing_gripper')
  } else if (incompleteInstrumentCount === 0) {
    instrumentsDetail = t('instruments_connected', {
      count: speccedInstrumentCount,
    })
  } else if (
    incompleteInstrumentCount != null &&
    incompleteInstrumentCount > 0
  ) {
    instrumentsDetail = t('instrument_calibrations_missing', {
      count: incompleteInstrumentCount,
    })
  } else {
    instrumentsDetail = null
  }

  const instrumentsStatus =
    incompleteInstrumentCount === 0 ? 'ready' : 'not ready'

  const areModulesReady = !isMissingModules && moduleCalibrationStatus.complete

  const isMissingFixtures = missingFixtures.length > 0

  const areFixturesReady = !isMissingFixtures

  const modulesStatus =
    areModulesReady && areFixturesReady && !isLocationConflict
      ? 'ready'
      : 'not ready'
  // Liquids information
  const liquidsInProtocol = mostRecentAnalysis?.liquids ?? []
  const areLiquidsInProtocol = liquidsInProtocol.length > 0

  const isReadyToRun =
    incompleteInstrumentCount === 0 && areModulesReady && areFixturesReady
  const onPlay = (): void => {
    if (isDoorOpen) {
      makeSnackbar(t('shared:close_robot_door') as string)
    } else {
      if (isReadyToRun) {
        if (
          runStatus === RUN_STATUS_IDLE &&
          !(
            labwareConfirmed &&
            offsetsConfirmed &&
            (liquidsConfirmed || !areLiquidsInProtocol)
          )
        ) {
          confirmStepsComplete()
        } else if (runStatus === RUN_STATUS_IDLE && isHeaterShakerInProtocol) {
          confirmAttachment()
        } else {
          play()
          trackProtocolRunEvent({
            name: ANALYTICS_PROTOCOL_RUN_ACTION.START,
            properties: robotAnalyticsData ?? {},
          })
        }
      } else {
        makeSnackbar(
          i18n.format(t('complete_setup_before_proceeding'), 'capitalize')
        )
      }
    }
  }

  // get display name of first missing module
  const firstMissingModuleId = first(missingModuleIds)
  const firstMissingModuleModel = mostRecentAnalysis?.modules.find(
    module => module.id === firstMissingModuleId
  )?.model
  const firstMissingModuleDisplayName: string =
    firstMissingModuleModel != null
      ? getModuleDisplayName(firstMissingModuleModel)
      : ''

  const getConnectedHardwareText = (
    protocolModulesInfo: ProtocolModuleInfo[],
    requiredFixtures: ProtocolHardware[]
  ): {
    detail: string
    subdetail?: string
  } => {
    if (protocolModulesInfo.length === 0 && requiredFixtures.length === 0) {
      return { detail: t('no_modules_used_in_this_protocol') }
    } else if (
      protocolModulesInfo.length > 0 &&
      requiredFixtures.length === 0
    ) {
      // protocol only uses modules
      return {
        detail: t('modules_connected', {
          count: protocolModulesInfo.length,
        }),
      }
    } else if (
      protocolModulesInfo.length === 0 &&
      requiredFixtures.length > 0
    ) {
      // protocol only uses fixtures
      return {
        detail: t('fixtures_connected', {
          count: requiredFixtures.length,
        }),
      }
    } else {
      // protocol uses fixtures and modules
      return {
        detail: t('fixtures_connected', {
          count: requiredFixtures.length,
        }),
        subdetail: t('modules_connected', {
          count: protocolModulesInfo.length,
        }),
      }
    }
  }

  const missingModulesText =
    missingModuleIds.length === 1
      ? `${t('missing')} ${firstMissingModuleDisplayName}`
      : t('multiple_modules_missing', { count: missingModuleIds.length })

  const missingFixturesText =
    missingFixtures.length === 1
      ? `${t('missing')} ${getFixtureDisplayName(
          missingFixtures[0].cutoutFixtureId
        )}`
      : t('multiple_fixtures_missing', { count: missingFixtures.length })

  const missingMultipleHardwareTypes =
    [missingModules, missingFixtures].filter(
      missingHardwareArr => missingHardwareArr.length > 0
    ).length > 1

  let modulesDetail: string
  let modulesSubDetail: string | null = null
  if (isLocationConflict) {
    modulesDetail = t('location_conflict')
  } else if (missingMultipleHardwareTypes) {
    modulesDetail = t('hardware_missing')
  } else if (missingFixtures.length > 0) {
    modulesDetail = missingFixturesText
  } else if (isMissingModules) {
    modulesDetail = missingModulesText
  } else if (!moduleCalibrationStatus.complete) {
    modulesDetail = t('calibration_required')
  } else {
    // modules and deck are ready
    const hardwareDetail = getConnectedHardwareText(
      protocolModulesInfo,
      requiredFixtures
    )
    modulesDetail = hardwareDetail.detail
    modulesSubDetail = hardwareDetail?.subdetail ?? null
  }

  // Labware information
  const { offDeckItems, onDeckItems } = getLabwareSetupItemGroups(
    mostRecentAnalysis?.commands ?? []
  )
  const onDeckLabwareCount = onDeckItems.length
  const additionalLabwareCount = offDeckItems.length

  const labwareDetail =
    onDeckLabwareCount > 0
      ? t('on-deck_labware', { count: onDeckLabwareCount })
      : null
  const labwareSubDetail =
    additionalLabwareCount > 0
      ? t('additional_labware', { count: additionalLabwareCount })
      : null

  const latestCurrentOffsets = getLatestCurrentOffsets(
    runRecord?.data?.labwareOffsets ?? []
  )

  const { data: doorStatus } = useDoorQuery({
    refetchInterval: FETCH_DURATION_MS,
  })
  const isDoorOpen =
    doorStatus?.data.status === 'open' &&
    doorStatus?.data.doorRequiredClosedForProtocol

  const parametersDetail = hasRunTimeParameters
    ? hasCustomRunTimeParameters
      ? t('custom_values')
      : t('default_values')
    : t('no_parameters_specified')

  return (
    <>
      {/* Empty box to detect scrolling */}
      <Flex ref={scrollRef} />
      {/* Protocol Setup Header */}
      <Flex
        boxShadow={isScrolled ? BORDERS.shadowBig : undefined}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
        padding={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
        position={POSITION_STICKY}
        top={0}
        backgroundColor={COLORS.white}
        overflowY="auto"
        marginX={`-${SPACING.spacing32}`}
      >
        <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing2}
            maxWidth="43rem"
          >
            {!isLoading ? (
              <>
                <LegacyStyledText
                  as="h4"
                  fontWeight={TYPOGRAPHY.fontWeightBold}
                >
                  {t('prepare_to_run')}
                </LegacyStyledText>
                <LegacyStyledText
                  as="h4"
                  color={COLORS.grey50}
                  fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                  overflowWrap={OVERFLOW_WRAP_ANYWHERE}
                >
                  {truncateString(protocolName, 100)}
                </LegacyStyledText>
              </>
            ) : (
              <ProtocolSetupTitleSkeleton />
            )}
          </Flex>
          <Flex gridGap={SPACING.spacing16}>
            <CloseButton
              onClose={
                !isLoading
                  ? () => {
                      setShowConfirmCancelModal(true)
                    }
                  : onConfirmCancelClose
              }
            />
            <PlayButton
              disabled={isLoading}
              onPlay={!isLoading ? onPlay : undefined}
              ready={!isLoading ? isReadyToRun : false}
              isDoorOpen={isDoorOpen}
            />
          </Flex>
        </Flex>
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing8}
      >
        {!isLoading ? (
          <>
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('instruments')
              }}
              title={t('instruments')}
              detail={instrumentsDetail}
              status={instrumentsStatus}
              disabled={speccedInstrumentCount === 0}
            />
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('modules')
              }}
              title={t('deck_hardware')}
              detail={modulesDetail}
              subDetail={modulesSubDetail}
              status={modulesStatus}
              interactionDisabled={
                protocolModulesInfo.length === 0 && !protocolHasFixtures
              }
            />
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('offsets')
              }}
              title={t('labware_position_check')}
              detail={t('recommended')}
              subDetail={
                latestCurrentOffsets.length > 0
                  ? t('offsets_applied', { count: latestCurrentOffsets.length })
                  : null
              }
              status={offsetsConfirmed ? 'ready' : 'general'}
            />
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('view only parameters')
              }}
              title={t('parameters')}
              detail={parametersDetail}
              subDetail={null}
              status="ready"
              interactionDisabled={!hasRunTimeParameters}
            />
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('labware')
              }}
              title={i18n.format(t('labware'), 'capitalize')}
              detail={labwareDetail}
              subDetail={labwareSubDetail}
              status={labwareConfirmed ? 'ready' : 'general'}
              disabled={labwareDetail == null}
            />
            <ProtocolSetupStep
              onClickSetupStep={() => {
                setSetupScreen('liquids')
              }}
              title={i18n.format(t('liquids'), 'capitalize')}
              status={
                liquidsConfirmed || !areLiquidsInProtocol ? 'ready' : 'general'
              }
              detail={
                areLiquidsInProtocol
                  ? t('initial_liquids_num', {
                      count: liquidsInProtocol.length,
                    })
                  : t('liquids_not_in_setup')
              }
              interactionDisabled={!areLiquidsInProtocol}
            />
          </>
        ) : (
          <ProtocolSetupStepSkeleton />
        )}
      </Flex>
      {showConfirmCancelModal ? (
        <ConfirmCancelRunModal
          runId={runId}
          isQuickTransfer={
            protocolRecord?.data.protocolKind === 'quick-transfer'
          }
          setShowConfirmCancelRunModal={setShowConfirmCancelModal}
          isActiveRun={false}
          protocolId={protocolId}
        />
      ) : null}
    </>
  )
}

export function ProtocolSetup(): JSX.Element {
  const { runId } = useParams<
    keyof OnDeviceRouteParams
  >() as OnDeviceRouteParams
  const isNewLpc = useFeatureFlag('lpcRedesign')
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const { analysisErrors } = useProtocolAnalysisErrors(runId)
  const { t } = useTranslation(['protocol_setup'])
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const robotSerialNumber =
    localRobot?.status != null ? getRobotSerialNumber(localRobot) : null
  const trackEvent = useTrackEvent()
  const { play } = useRunControls(runId)
  const [
    showAnalysisFailedModal,
    setShowAnalysisFailedModal,
  ] = useState<boolean>(true)
  const robotType = useRobotType(robotName)
  const attachedModules =
    useAttachedModules({
      refetchInterval: FETCH_DURATION_MS,
    }) ?? []
  const protocolId = runRecord?.data?.protocolId ?? null
  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })
  const mostRecentAnalysisSummary = last(protocolRecord?.data.analysisSummaries)
  const [
    isPollingForCompletedAnalysis,
    setIsPollingForCompletedAnalysis,
  ] = useState<boolean>(mostRecentAnalysisSummary?.status !== 'completed')

  const {
    data: mostRecentAnalysis = null,
  } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    last(protocolRecord?.data.analysisSummaries)?.id ?? null,
    {
      enabled: protocolRecord != null && isPollingForCompletedAnalysis,
      refetchInterval: ANALYSIS_POLL_MS,
    }
  )

  const areLiquidsInProtocol = (mostRecentAnalysis?.liquids?.length ?? 0) > 0

  useEffect(() => {
    if (mostRecentAnalysis?.status === 'completed') {
      setIsPollingForCompletedAnalysis(false)
    } else {
      setIsPollingForCompletedAnalysis(true)
    }
  }, [mostRecentAnalysis?.status])
  const deckDef = getDeckDefFromRobotType(robotType)

  const protocolModulesInfo =
    mostRecentAnalysis != null
      ? getProtocolModulesInfo(mostRecentAnalysis, deckDef)
      : []

  const { missingModuleIds } = getUnmatchedModulesForProtocol(
    attachedModules,
    protocolModulesInfo
  )
  const isMissingModules = missingModuleIds.length > 0
  const { data: attachedInstruments } = useInstrumentsQuery()

  const incompleteInstrumentCount: number | null =
    mostRecentAnalysis != null && attachedInstruments != null
      ? getIncompleteInstrumentCount(mostRecentAnalysis, attachedInstruments)
      : null
  const lpcDisabledReason = useLPCDisabledReason({
    runId,
    hasMissingModulesForOdd: isMissingModules,
    hasMissingCalForOdd:
      incompleteInstrumentCount != null && incompleteInstrumentCount > 0,
  })
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name ??
    ''

  const { launchLegacyLPC, LegacyLPCWizard } = useLaunchLegacyLPC(
    runId,
    robotType,
    protocolName
  )

  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const robotAnalyticsData = useRobotAnalyticsData(robotName)

  const handleProceedToRunClick = (): void => {
    trackEvent({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: { robotSerialNumber },
    })
    trackProtocolRunEvent({
      name: ANALYTICS_PROTOCOL_RUN_ACTION.START,
      properties: robotAnalyticsData ?? {},
    })
    play()
  }
  const configBypassHeaterShakerAttachmentConfirmation = useSelector(
    getIsHeaterShakerAttached
  )
  const {
    confirm: confirmAttachment,
    showConfirmation: showHSConfirmationModal,
    cancel: cancelExitHSConfirmation,
  } = useConditionalConfirm(
    handleProceedToRunClick,
    !configBypassHeaterShakerAttachmentConfirmation
  )
  const [cutoutId, setCutoutId] = useState<CutoutId | null>(null)
  const [providedFixtureOptions, setProvidedFixtureOptions] = useState<
    CutoutFixtureId[]
  >([])
  // TODO(jh 10-31-24): Refactor the below to utilize useMissingStepsModal.
  const [labwareConfirmed, setLabwareConfirmed] = useState<boolean>(false)
  const [liquidsConfirmed, setLiquidsConfirmed] = useState<boolean>(false)
  const [offsetsConfirmed, setOffsetsConfirmed] = useState<boolean>(false)
  const missingSteps = [
    !offsetsConfirmed ? t('applied_labware_offsets') : null,
    !labwareConfirmed ? t('labware_placement') : null,
    !liquidsConfirmed && areLiquidsInProtocol ? t('liquids') : null,
  ].filter(s => s != null)
  const {
    confirm: confirmMissingSteps,
    showConfirmation: showMissingStepsConfirmation,
    cancel: cancelExitMissingStepsConfirmation,
  } = useConditionalConfirm(
    handleProceedToRunClick,
    !(labwareConfirmed && liquidsConfirmed && offsetsConfirmed)
  )
  const runStatus = useRunStatus(runId)
  const isHeaterShakerInProtocol = useIsHeaterShakerInProtocol()

  // orchestrate setup subpages/components
  const [setupScreen, setSetupScreen] = useState<SetupScreens>('prepare to run')
  const setupComponentByScreen = {
    'prepare to run': (
      <PrepareToRun
        runId={runId}
        setSetupScreen={setSetupScreen}
        confirmAttachment={confirmAttachment}
        confirmStepsComplete={confirmMissingSteps}
        play={play}
        robotName={robotName}
        runRecord={runRecord ?? null}
        labwareConfirmed={labwareConfirmed}
        liquidsConfirmed={liquidsConfirmed}
        offsetsConfirmed={offsetsConfirmed}
      />
    ),
    instruments: (
      <ProtocolSetupInstruments runId={runId} setSetupScreen={setSetupScreen} />
    ),
    modules: (
      <ProtocolSetupModulesAndDeck
        runId={runId}
        setSetupScreen={setSetupScreen}
        setCutoutId={setCutoutId}
        setProvidedFixtureOptions={setProvidedFixtureOptions}
      />
    ),
    offsets: (
      <ProtocolSetupOffsets
        runId={runId}
        setSetupScreen={setSetupScreen}
        lpcDisabledReason={lpcDisabledReason}
        launchLPC={launchLegacyLPC}
        LPCWizard={LegacyLPCWizard}
        isConfirmed={offsetsConfirmed}
        setIsConfirmed={setOffsetsConfirmed}
        isNewLpc={isNewLpc}
      />
    ),
    labware: (
      <ProtocolSetupLabware
        runId={runId}
        setSetupScreen={setSetupScreen}
        isConfirmed={labwareConfirmed}
        setIsConfirmed={setLabwareConfirmed}
      />
    ),
    liquids: (
      <ProtocolSetupLiquids
        runId={runId}
        setSetupScreen={setSetupScreen}
        isConfirmed={liquidsConfirmed}
        setIsConfirmed={setLiquidsConfirmed}
      />
    ),
    'deck configuration': (
      <ProtocolSetupDeckConfiguration
        cutoutId={cutoutId}
        runId={runId}
        setSetupScreen={setSetupScreen}
        providedFixtureOptions={providedFixtureOptions}
      />
    ),
    'view only parameters': (
      <ViewOnlyParameters runId={runId} setSetupScreen={setSetupScreen} />
    ),
  }
  return (
    <>
      {showAnalysisFailedModal &&
      analysisErrors != null &&
      analysisErrors?.length > 0 ? (
        <AnalysisFailedModal
          setShowAnalysisFailedModal={setShowAnalysisFailedModal}
          protocolId={runRecord?.data.protocolId ?? null}
          runId={runId}
          errors={analysisErrors.map(error => error.detail)}
        />
      ) : null}
      {showMissingStepsConfirmation ? (
        <ConfirmSetupStepsCompleteModal
          onCloseClick={cancelExitMissingStepsConfirmation}
          missingSteps={missingSteps}
          onConfirmClick={() => {
            runStatus === RUN_STATUS_IDLE && isHeaterShakerInProtocol
              ? confirmAttachment()
              : handleProceedToRunClick()
          }}
        />
      ) : null}
      {showHSConfirmationModal ? (
        <ConfirmAttachedModal
          onCloseClick={cancelExitHSConfirmation}
          isProceedToRunModal={true}
          onConfirmClick={handleProceedToRunClick}
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={
          setupScreen === 'prepare to run'
            ? `0 ${SPACING.spacing32} ${SPACING.spacing40}`
            : `${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`
        }
      >
        {setupComponentByScreen[setupScreen]}
      </Flex>
    </>
  )
}
