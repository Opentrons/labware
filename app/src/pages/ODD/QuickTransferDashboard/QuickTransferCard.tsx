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
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  NO_WRAP,
  OVERFLOW_HIDDEN,
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
import { deleteProtocol } from '@opentrons/api-client'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'
import { LongPressModal } from './LongPressModal'
import { formatTimeWithUtcLabel } from '/app/resources/runs'

import type { Dispatch, SetStateAction } from 'react'
import type { UseLongPressResult } from '@opentrons/components'
import type { ProtocolResource } from '@opentrons/shared-data'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

const REFETCH_INTERVAL = 5000

export function QuickTransferCard(props: {
  quickTransfer: ProtocolResource
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetTransferId: (targetTransferId: string) => void
}): JSX.Element {
  const {
    quickTransfer,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetTransferId,
  } = props
  const navigate = useNavigate()
  const [showIcon, setShowIcon] = useState<boolean>(false)
  const [
    showFailedAnalysisModal,
    setShowFailedAnalysisModal,
  ] = useState<boolean>(false)
  const { t, i18n } = useTranslation(['quick_transfer', 'branded'])
  const transferName =
    quickTransfer.metadata.protocolName ?? quickTransfer.files[0].name
  const longpress = useLongPress()
  const queryClient = useQueryClient()
  const host = useHost()

  const { id: transferId, analysisSummaries } = quickTransfer
  const {
    data: mostRecentSuccessfulAnalysis,
  } = useMostRecentSuccessfulAnalysisAsDocumentQuery(
    transferId,
    analysisSummaries,
    {
      enabled: quickTransfer != null,
      refetchInterval: analysisData =>
        analysisData == null ? REFETCH_INTERVAL : false,
    }
  )
  const { data: mostRecentAnalysis } = useProtocolAnalysisAsDocumentQuery(
    transferId,
    last(quickTransfer.analysisSummaries)?.id ?? null,
    {
      enabled: quickTransfer != null,
      refetchInterval: analysisData =>
        analysisData == null ? REFETCH_INTERVAL : false,
    }
  )

  const analysisForQuickTransferCard =
    mostRecentSuccessfulAnalysis == null
      ? mostRecentAnalysis
      : mostRecentSuccessfulAnalysis
  const isFailedAnalysis =
    (analysisForQuickTransferCard != null &&
      'result' in analysisForQuickTransferCard &&
      (analysisForQuickTransferCard.result === 'error' ||
        analysisForQuickTransferCard.result === 'not-ok')) ??
    false

  const isPendingAnalysis = analysisForQuickTransferCard == null

  const handleTransferClick = (
    longpress: UseLongPressResult,
    transferId: string
  ): void => {
    if (isFailedAnalysis) {
      setShowFailedAnalysisModal(true)
    } else if (!longpress.isLongPressed) {
      navigate(`/quick-transfer/${transferId}`)
    }
  }

  useEffect(() => {
    if (longpress.isLongPressed) {
      longPress(true)
      setTargetTransferId(quickTransfer.id)
    }
  }, [
    longpress.isLongPressed,
    longPress,
    quickTransfer.id,
    setTargetTransferId,
  ])

  const failedAnalysisHeader: OddModalHeaderBaseProps = {
    title: i18n.format(t('transfer_analysis_failed'), 'capitalize'),
    hasExitIcon: true,
    onClick: () => {
      setShowFailedAnalysisModal(false)
    },
  }

  const handleDeleteTransfer = (): void => {
    if (host != null && quickTransfer.id != null) {
      setShowIcon(true)
      deleteProtocol(host, quickTransfer.id)
        .then(() =>
          queryClient
            .invalidateQueries([host, 'protocols'])
            .catch((e: Error) => {
              console.error(`error invalidating protocols query: ${e.message}`)
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

  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${longpress.isLongPressed
        ? ''
        : isFailedAnalysis
        ? COLORS.red40
        : COLORS.grey50};
    }
  `

  return (
    <Flex
      alignItems={isFailedAnalysis ? ALIGN_END : ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      backgroundColor={isFailedAnalysis ? COLORS.red35 : COLORS.grey35}
      borderRadius={BORDERS.borderRadius16}
      marginBottom={SPACING.spacing8}
      gridGap={SPACING.spacing48}
      onClick={() => {
        handleTransferClick(longpress, quickTransfer.id)
      }}
      padding={SPACING.spacing24}
      ref={longpress.ref}
      css={PUSHED_STATE_STYLE}
    >
      {isPendingAnalysis ? (
        <Icon
          name="ot-spinner"
          aria-label="Transfer is loading"
          spin
          size="2rem"
          marginY="-1.5rem"
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
          <Flex
            color={COLORS.red60}
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing8}
          >
            <Icon
              name="ot-alert"
              size="1.5rem"
              aria-label="failedAnalysis_icon"
            />
            <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
              {i18n.format(t('failed_analysis'), 'capitalize')}
            </LegacyStyledText>
          </Flex>
        ) : null}
        <LegacyStyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          opacity={isPendingAnalysis ? 0.7 : 1}
        >
          {transferName}
        </LegacyStyledText>
      </Flex>
      <Flex width="12.5rem" whiteSpace={NO_WRAP}>
        <LegacyStyledText as="p" color={COLORS.grey60}>
          {formatTimeWithUtcLabel(quickTransfer.createdAt)}
        </LegacyStyledText>
        {longpress.isLongPressed && !isFailedAnalysis && (
          <LongPressModal
            longpress={longpress}
            transferId={quickTransfer.id}
            setTargetTransferId={setTargetTransferId}
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
                  i18nKey={t('error_analyzing', { transferName })}
                  components={{
                    block: (
                      <LegacyStyledText
                        as="p"
                        css={css`
                          display: -webkit-box;
                          -webkit-box-orient: vertical;
                          -webkit-line-clamp: 3;
                          overflow: ${OVERFLOW_HIDDEN};
                          overflow-wrap: ${OVERFLOW_WRAP_BREAK_WORD};
                          height: max-content;
                        `}
                      />
                    ),
                    bold: <strong />,
                  }}
                />

                <LegacyStyledText as="p">
                  {t('branded:delete_transfer_from_app')}
                </LegacyStyledText>
              </Flex>
              <SmallButton
                onClick={handleDeleteTransfer}
                buttonText={t('delete_transfer')}
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
