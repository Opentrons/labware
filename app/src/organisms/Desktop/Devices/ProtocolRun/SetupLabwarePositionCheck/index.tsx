import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  LegacyStyledText,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  TOOLTIP_LEFT,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import { useProtocolQuery } from '@opentrons/react-api-client'

import { useLPCSuccessToast } from '../../hooks/useLPCSuccessToast'
import { useStoredProtocolAnalysis } from '/app/resources/analysis'
import { CurrentOffsetsTable } from './CurrentOffsetsTable'
import { useLaunchLegacyLPC } from '/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC'
import { getLatestCurrentOffsets } from '/app/transformations/runs'
import {
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
  useLPCDisabledReason,
} from '/app/resources/runs'
import { useRobotType } from '/app/redux-resources/robots'
import type { LabwareOffset } from '@opentrons/api-client'

interface SetupLabwarePositionCheckProps {
  offsetsConfirmed: boolean
  setOffsetsConfirmed: (confirmed: boolean) => void
  robotName: string
  runId: string
  isNewLpc: boolean
}

export function SetupLabwarePositionCheck(
  props: SetupLabwarePositionCheckProps
): JSX.Element {
  const {
    robotName,
    runId,
    setOffsetsConfirmed,
    offsetsConfirmed,
    isNewLpc,
  } = props
  const { t, i18n } = useTranslation('protocol_setup')

  const robotType = useRobotType(robotName)
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const { data: protocolRecord } = useProtocolQuery(
    runRecord?.data.protocolId ?? null,
    {
      staleTime: Infinity,
    }
  )
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name ??
    ''
  const currentOffsets = runRecord?.data?.labwareOffsets ?? []
  const sortedOffsets: LabwareOffset[] =
    currentOffsets.length > 0
      ? currentOffsets
          .map(offset => ({
            ...offset,
            //  convert into date to sort
            createdAt: new Date(offset.createdAt),
          }))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(offset => ({
            ...offset,
            //   convert back into string
            createdAt: offset.createdAt.toISOString(),
          }))
      : []
  const lpcDisabledReason = useLPCDisabledReason({ robotName, runId })
  const robotProtocolAnalysis = useMostRecentCompletedAnalysis(runId)
  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolData = robotProtocolAnalysis ?? storedProtocolAnalysis
  const [runLPCTargetProps, runLPCTooltipProps] = useHoverTooltip({
    placement: TOOLTIP_LEFT,
  })
  const [
    confirmOffsetsTargetProps,
    confirmOffsetsTooltipProps,
  ] = useHoverTooltip({
    placement: TOOLTIP_LEFT,
  })

  const { setIsShowingLPCSuccessToast } = useLPCSuccessToast()

  const { launchLegacyLPC, LegacyLPCWizard } = useLaunchLegacyLPC(
    runId,
    robotType,
    protocolName
  )

  const nonIdentityOffsets = getLatestCurrentOffsets(sortedOffsets)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      marginTop={SPACING.spacing16}
      gridGap={SPACING.spacing16}
    >
      {nonIdentityOffsets.length > 0 ? (
        <CurrentOffsetsTable
          currentOffsets={nonIdentityOffsets}
          commands={protocolData?.commands ?? []}
          labware={protocolData?.labware ?? []}
          modules={protocolData?.modules ?? []}
        />
      ) : (
        <Flex
          paddingY={SPACING.spacing8}
          marginY={SPACING.spacing24}
          backgroundColor={COLORS.grey10}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          borderRadius={BORDERS.borderRadius8}
        >
          <LegacyStyledText as="p">
            {i18n.format(t('no_labware_offset_data'), 'capitalize')}
          </LegacyStyledText>
        </Flex>
      )}
      <Flex justifyContent={JUSTIFY_CENTER} gridGap={SPACING.spacing8}>
        <SecondaryButton
          onClick={() => {
            setOffsetsConfirmed(true)
          }}
          id="LPC_setOffsetsConfirmed"
          padding={`${SPACING.spacing8} ${SPACING.spacing16}`}
          {...confirmOffsetsTargetProps}
          disabled={
            offsetsConfirmed ||
            lpcDisabledReason !== null ||
            nonIdentityOffsets.length === 0
          }
        >
          {t('confirm_offsets')}
        </SecondaryButton>
        {lpcDisabledReason != null || nonIdentityOffsets.length === 0 ? (
          <Tooltip tooltipProps={confirmOffsetsTooltipProps}>
            {lpcDisabledReason ??
              t('run_labware_position_check_to_get_offsets')}
          </Tooltip>
        ) : null}
        <PrimaryButton
          textTransform={TYPOGRAPHY.textTransformCapitalize}
          onClick={() => {
            isNewLpc ? (() => null)() : launchLegacyLPC()
            setIsShowingLPCSuccessToast(false)
          }}
          id="LabwareSetup_checkLabwarePositionsButton"
          {...runLPCTargetProps}
          disabled={lpcDisabledReason !== null}
        >
          {t('run_labware_position_check')}
        </PrimaryButton>
        {lpcDisabledReason !== null ? (
          <Tooltip tooltipProps={runLPCTooltipProps}>
            {lpcDisabledReason}
          </Tooltip>
        ) : null}
      </Flex>
      {isNewLpc ? null : LegacyLPCWizard}
    </Flex>
  )
}
