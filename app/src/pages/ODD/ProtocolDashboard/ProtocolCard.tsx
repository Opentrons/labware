import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import last from 'lodash/last'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  ALIGN_END,
  BORDERS,
  Chip,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  LegacyStyledText,
  NO_WRAP,
  OVERFLOW_WRAP_ANYWHERE,
  OVERFLOW_WRAP_BREAK_WORD,
  SPACING,
  TYPOGRAPHY,
  useLongPress,
} from '@opentrons/components'
import {
  useHost,
  useMostRecentSuccessfulAnalysisAsDocumentQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { deleteProtocol, deleteRun, getProtocol } from '@opentrons/api-client'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'
import { LongPressModal } from './LongPressModal'
import { formatTimeWithUtcLabel } from '/app/resources/runs'
import { useUpdatedLastRunTime } from '/app/pages/ODD/ProtocolDashboard/hooks'

import type { Dispatch, SetStateAction } from 'react'
import type { UseLongPressResult } from '@opentrons/components'
import type { ProtocolResource } from '@opentrons/shared-data'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

const REFETCH_INTERVAL = 5000

interface ProtocolCardProps {
  protocol: ProtocolResource
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetProtocolId: (targetProtocolId: string) => void
  lastRun?: string
  setIsRequiredCSV: (isRequiredCSV: boolean) => void
}

export function ProtocolCard(props: ProtocolCardProps): JSX.Element {
  const {
    protocol,
    lastRun,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetProtocolId,
    setIsRequiredCSV,
  } = props
  const navigate = useNavigate()
  const [showIcon, setShowIcon] = useState<boolean>(false)
  const [
    showFailedAnalysisModal,
    setShowFailedAnalysisModal,
  ] = useState<boolean>(false)
  const { t, i18n } = useTranslation(['protocol_info', 'branded'])
  const protocolName = protocol.metadata.protocolName ?? protocol.files[0].name
  const longpress = useLongPress()
  const queryClient = useQueryClient()
  const host = useHost()
  const updatedLastRun = useUpdatedLastRunTime(lastRun)

  const { id: protocolId, analysisSummaries } = protocol
  const {
    data: mostRecentSuccessfulAnalysis,
  } = useMostRecentSuccessfulAnalysisAsDocumentQuery(
    protocolId,
    analysisSummaries,
    {
      enabled: protocol != null,
      refetchInterval: analysisData =>
        analysisData == null ? REFETCH_INTERVAL : false,
    }
  )
  const { data: mostRecentAnalysis } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    last(protocol.analysisSummaries)?.id ?? null,
    {
      enabled: protocol != null,
      refetchInterval: analysisData =>
        analysisData == null ? REFETCH_INTERVAL : false,
    }
  )

  const analysisForProtocolCard =
    mostRecentSuccessfulAnalysis == null
      ? mostRecentAnalysis
      : mostRecentSuccessfulAnalysis
  const isFailedAnalysis =
    (analysisForProtocolCard != null &&
      'result' in analysisForProtocolCard &&
      (analysisForProtocolCard.result === 'error' ||
        analysisForProtocolCard.result === 'not-ok')) ??
    false

  // ToDo (kk:06/25/2024) remove ff when we are ready for freezing the code
  const isRequiredCSV =
    analysisForProtocolCard?.result === 'parameter-value-required'

  const isPendingAnalysis = analysisForProtocolCard == null

  const handleProtocolClick = (
    longpress: UseLongPressResult,
    protocolId: string
  ): void => {
    if (isFailedAnalysis) {
      setShowFailedAnalysisModal(true)
    } else if (!longpress.isLongPressed) {
      navigate(`/protocols/${protocolId}`)
    }
  }

  useEffect(() => {
    if (longpress.isLongPressed) {
      longPress(true)
      setTargetProtocolId(protocol.id)
      setIsRequiredCSV(isRequiredCSV)
    }
  }, [
    longpress.isLongPressed,
    longPress,
    protocol.id,
    setTargetProtocolId,
    isRequiredCSV,
    setIsRequiredCSV,
  ])

  const failedAnalysisHeader: OddModalHeaderBaseProps = {
    title: i18n.format(t('protocol_analysis_failed'), 'capitalize'),
    hasExitIcon: true,
    onClick: () => {
      setShowFailedAnalysisModal(false)
    },
  }

  const handleDeleteProtocol = (): void => {
    if (host != null && protocol.id != null) {
      setShowIcon(true)
      getProtocol(host, protocol.id)
        .then(
          response =>
            response.data.links?.referencingRuns.map(({ id }) => id) ?? []
        )
        .then(referencingRunIds => {
          return Promise.all(
            referencingRunIds?.map(runId => deleteRun(host, runId))
          )
        })
        .then(() => deleteProtocol(host, protocol.id))
        .then(() =>
          queryClient
            .invalidateQueries([host, 'protocols'])
            .catch((e: Error) => {
              console.error(`error invalidating runs query: ${e.message}`)
            })
        )
        .then(() => {
          setShowIcon(false)
        })
        .catch((e: Error) => {
          console.error(`error deleting resources: ${e.message}`)
        })
    } else {
      console.error(
        'could not delete resources because the robot host is unknown'
      )
    }
  }

  let pushedBackgroundColor = 'COLORS.grey50'
  if (isFailedAnalysis) {
    pushedBackgroundColor = COLORS.red40
  } else if (isRequiredCSV) {
    pushedBackgroundColor = COLORS.yellow40
  }

  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${longpress.isLongPressed ? '' : pushedBackgroundColor};
    }
  `

  let protocolCardBackgroundColor = COLORS.grey35
  if (isFailedAnalysis) protocolCardBackgroundColor = COLORS.red35
  if (isRequiredCSV) protocolCardBackgroundColor = COLORS.yellow35

  const textWrap = (updatedLastRun: string): string => {
    return updatedLastRun === 'less than a minute ago' ? 'normal' : 'nowrap'
  }

  return (
    <Flex
      alignItems={isFailedAnalysis || isRequiredCSV ? ALIGN_END : ALIGN_CENTER}
      backgroundColor={protocolCardBackgroundColor}
      borderRadius={BORDERS.borderRadius16}
      marginBottom={SPACING.spacing8}
      gridGap={SPACING.spacing48}
      onClick={() => {
        handleProtocolClick(longpress, protocol.id)
      }}
      padding={SPACING.spacing24}
      ref={longpress.ref}
      css={PUSHED_STATE_STYLE}
      data-testid="protocol_card"
    >
      {isPendingAnalysis ? (
        <Icon
          name="ot-spinner"
          aria-label="Protocol is loading"
          spin
          size="2rem"
          marginY={'-1.5rem'}
          opacity={0.7}
        />
      ) : null}
      <Flex
        width="28.9375rem"
        overflowWrap={OVERFLOW_WRAP_ANYWHERE}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
      >
        {isFailedAnalysis ? (
          <Chip
            type="error"
            text={i18n.format(t('failed_analysis'), 'capitalize')}
            background={false}
          />
        ) : null}
        {isRequiredCSV ? (
          <Chip type="warning" text={t('requires_csv')} background={false} />
        ) : null}
        <LegacyStyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          opacity={isPendingAnalysis ? 0.7 : 1}
        >
          {protocolName}
        </LegacyStyledText>
      </Flex>
      <Flex width="9.25rem">
        <LegacyStyledText
          as="p"
          color={COLORS.grey60}
          whiteSpace={textWrap(updatedLastRun)}
        >
          {updatedLastRun}
        </LegacyStyledText>
      </Flex>
      <Flex width="12.5rem" whiteSpace={NO_WRAP}>
        <LegacyStyledText as="p" color={COLORS.grey60}>
          {formatTimeWithUtcLabel(protocol.createdAt)}
        </LegacyStyledText>
        {longpress.isLongPressed && !isFailedAnalysis && (
          <LongPressModal
            longpress={longpress}
            protocolId={protocol.id}
            setTargetProtocolId={setTargetProtocolId}
            setShowDeleteConfirmationModal={setShowDeleteConfirmationModal}
          />
        )}
        {(showFailedAnalysisModal ||
          (isFailedAnalysis && longpress.isLongPressed)) && (
          <OddModal
            header={failedAnalysisHeader}
            onOutsideClick={() => {
              setShowFailedAnalysisModal(false)
            }}
          >
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing32}
              width="100%"
            >
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing8}
                maxWidth="100%"
                whiteSpace="break-spaces"
              >
                <Trans
                  t={t}
                  i18nKey={t('error_analyzing', { protocolName })}
                  components={{
                    block: (
                      <LegacyStyledText
                        as="p"
                        css={css`
                          display: -webkit-box;
                          -webkit-box-orient: vertical;
                          -webkit-line-clamp: 3;
                          overflow: hidden;
                          overflow-wrap: ${OVERFLOW_WRAP_BREAK_WORD};
                          height: max-content;
                        `}
                      />
                    ),
                    bold: <strong />,
                  }}
                />

                <LegacyStyledText as="p">
                  {t('branded:delete_protocol_from_app')}
                </LegacyStyledText>
              </Flex>
              <SmallButton
                onClick={handleDeleteProtocol}
                buttonText={t('delete_protocol')}
                buttonType="alert"
                iconPlacement={showIcon ? 'startIcon' : undefined}
                iconName={showIcon ? 'ot-spinner' : undefined}
                disabled={showIcon}
              />
            </Flex>
          </OddModal>
        )}
      </Flex>
    </Flex>
  )
}
