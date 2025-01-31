import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  ALIGN_FLEX_START,
  BORDERS,
  Chip,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  OVERFLOW_WRAP_ANYWHERE,
  SPACING,
  TYPOGRAPHY,
  useLongPress,
} from '@opentrons/components'

import { LongPressModal } from './LongPressModal'
import { formatTimeWithUtcLabel } from '/app/resources/runs'
import { useUpdatedLastRunTime } from './hooks'

import type { Dispatch, SetStateAction } from 'react'
import type { UseLongPressResult } from '@opentrons/components'
import type { ProtocolResource } from '@opentrons/shared-data'

export type CardSizeType = 'full' | 'half' | 'regular'

const cardStyleBySize: {
  [s in CardSizeType]: {
    fontSize: string
    height: string
    lineHeight: string
    fontWeight: number
    width: string
  }
} = {
  full: {
    fontSize: TYPOGRAPHY.fontSize32,
    height: '11.75rem',
    lineHeight: TYPOGRAPHY.lineHeight42,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    width: '59rem',
  },
  // Note (kk:06/13/2024) height has been updated from 10.75rem because of a protocol with RTP CSV file
  half: {
    fontSize: TYPOGRAPHY.fontSize28,
    height: '13.25rem',
    lineHeight: TYPOGRAPHY.lineHeight36,
    fontWeight: TYPOGRAPHY.fontWeightSemiBold,
    width: '29.25rem',
  },
  regular: {
    fontSize: TYPOGRAPHY.fontSize28,
    height: '13.25rem',
    lineHeight: TYPOGRAPHY.lineHeight36,
    fontWeight: TYPOGRAPHY.fontWeightSemiBold,
    width: '28.375rem',
  },
}

interface PinnedProtocolProps {
  protocol: ProtocolResource
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetProtocolId: (targetProtocolId: string) => void
  cardSize?: CardSizeType
  lastRun?: string
  isRequiredCSV?: boolean
}

export function PinnedProtocol(props: PinnedProtocolProps): JSX.Element {
  const {
    protocol,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetProtocolId,
    lastRun,
    cardSize: size,
    isRequiredCSV = false,
  } = props
  const cardSize = size ?? 'full'
  const navigate = useNavigate()
  const longpress = useLongPress()
  const protocolName = protocol.metadata.protocolName ?? protocol.files[0].name
  const { t } = useTranslation('protocol_info')

  const updatedLastRun = useUpdatedLastRunTime(lastRun)

  // ToDo (kk:06/18/2024) this will be removed later
  const handleProtocolClick = (
    longpress: UseLongPressResult,
    protocolId: string
  ): void => {
    if (!longpress.isLongPressed) {
      navigate(`/protocols/${protocolId}`)
    }
  }
  useEffect(() => {
    if (longpress.isLongPressed) {
      longPress(true)
    }
  }, [longpress.isLongPressed, longPress])

  const pushedBackgroundColor = isRequiredCSV ? COLORS.yellow40 : COLORS.grey50
  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${longpress.isLongPressed ? '' : pushedBackgroundColor};
    }
  `

  return (
    <Flex
      alignItems={ALIGN_FLEX_START}
      backgroundColor={isRequiredCSV ? COLORS.yellow35 : COLORS.grey35}
      borderRadius={BORDERS.borderRadius16}
      css={PUSHED_STATE_STYLE}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing24}
      height={cardStyleBySize[cardSize].height}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      maxWidth={cardStyleBySize[cardSize].width}
      minWidth={cardStyleBySize[cardSize].width}
      onClick={() => {
        handleProtocolClick(longpress, protocol.id)
      }}
      overflowWrap={OVERFLOW_WRAP_ANYWHERE}
      padding={SPACING.spacing24}
      ref={longpress.ref}
      data-testid={`${cardSize}_pinned_protocol_card`}
    >
      <Flex gridGap={SPACING.spacing8} flexDirection={DIRECTION_COLUMN}>
        {isRequiredCSV ? (
          <Chip
            type="warning"
            iconName="ot-alert"
            chipSize="small"
            text={t('requires_csv')}
          />
        ) : null}
        <ProtocolNameText
          cardSize={cardSize}
          fontSize={cardStyleBySize[cardSize].fontSize}
          fontWeight={cardStyleBySize[cardSize].fontWeight}
          lineHeight={cardStyleBySize[cardSize].lineHeight}
        >
          {protocolName}
        </ProtocolNameText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing8}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        width="100%"
        color={COLORS.grey60}
      >
        <LegacyStyledText as="p">
          {t('last_run_time', { time: updatedLastRun })}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('date_added_date', {
            date: formatTimeWithUtcLabel(protocol.createdAt),
          })}
        </LegacyStyledText>
      </Flex>
      {longpress.isLongPressed && (
        <LongPressModal
          longpress={longpress}
          protocolId={protocol.id}
          setTargetProtocolId={setTargetProtocolId}
          setShowDeleteConfirmationModal={setShowDeleteConfirmationModal}
        />
      )}
    </Flex>
  )
}

const ProtocolNameText = styled(LegacyStyledText)`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${(props: { cardSize: CardSizeType }) =>
    props.cardSize === 'full' ? 1 : 2};
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_ANYWHERE};
  font-size: ${(props: { cardSize: CardSizeType }) =>
    cardStyleBySize[props.cardSize].fontSize};
  font-weight: ${(props: { cardSize: CardSizeType }) =>
    cardStyleBySize[props.cardSize].fontWeight};
  line-height: ${(props: { cardSize: CardSizeType }) =>
    cardStyleBySize[props.cardSize].lineHeight};
`
