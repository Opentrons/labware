import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_WRAP_ANYWHERE,
  SPACING,
  TYPOGRAPHY,
  useLongPress,
  LegacyStyledText,
} from '@opentrons/components'

import { LongPressModal } from './LongPressModal'
import { formatTimeWithUtcLabel } from '/app/resources/runs'

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
    height: '8.875rem',
    lineHeight: TYPOGRAPHY.lineHeight42,
    fontWeight: TYPOGRAPHY.fontWeightBold,
    width: '59rem',
  },
  half: {
    fontSize: TYPOGRAPHY.fontSize28,
    height: '10.75rem',
    lineHeight: TYPOGRAPHY.lineHeight36,
    fontWeight: TYPOGRAPHY.fontWeightSemiBold,
    width: '29.25rem',
  },
  regular: {
    fontSize: TYPOGRAPHY.fontSize28,
    height: '10.75rem',
    lineHeight: TYPOGRAPHY.lineHeight36,
    fontWeight: TYPOGRAPHY.fontWeightSemiBold,
    width: '28.375rem',
  },
}

export function PinnedTransfer(props: {
  transfer: ProtocolResource
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetTransferId: (targetProtocolId: string) => void
  cardSize?: CardSizeType
}): JSX.Element {
  const {
    transfer,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetTransferId,
  } = props
  const cardSize = props.cardSize ?? 'full'
  const navigate = useNavigate()
  const longpress = useLongPress()
  const transferName = transfer.metadata.protocolName ?? transfer.files[0].name

  const handleTransferClick = (
    longpress: UseLongPressResult,
    transferId: string
  ): void => {
    if (!longpress.isLongPressed) {
      navigate(`/quick-transfer/${transferId}`)
    }
  }
  useEffect(() => {
    if (longpress.isLongPressed) {
      longPress(true)
    }
  }, [longpress.isLongPressed, longPress])

  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${longpress.isLongPressed ? '' : COLORS.grey50};
    }
  `

  return (
    <Flex
      alignItems={ALIGN_FLEX_START}
      backgroundColor={COLORS.grey35}
      borderRadius={BORDERS.borderRadius16}
      css={PUSHED_STATE_STYLE}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing24}
      height={cardStyleBySize[cardSize].height}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      maxWidth={cardStyleBySize[cardSize].width}
      minWidth={cardStyleBySize[cardSize].width}
      onClick={() => {
        handleTransferClick(longpress, transfer.id)
      }}
      overflowWrap={OVERFLOW_WRAP_ANYWHERE}
      padding={SPACING.spacing24}
      ref={longpress.ref}
    >
      <TransferNameText
        cardSize={cardSize}
        fontSize={cardStyleBySize[cardSize].fontSize}
        fontWeight={cardStyleBySize[cardSize].fontWeight}
        lineHeight={cardStyleBySize[cardSize].lineHeight}
      >
        {transferName}
      </TransferNameText>
      <Flex
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing8}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        width="100%"
        color={COLORS.grey60}
      >
        <LegacyStyledText as="p">
          {formatTimeWithUtcLabel(transfer.createdAt)}
        </LegacyStyledText>
      </Flex>
      {longpress.isLongPressed && (
        <LongPressModal
          longpress={longpress}
          transferId={transfer.id}
          setTargetTransferId={setTargetTransferId}
          setShowDeleteConfirmationModal={setShowDeleteConfirmationModal}
        />
      )}
    </Flex>
  )
}

const TransferNameText = styled(LegacyStyledText)`
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
