import styled from 'styled-components'
import {
  ALIGN_FLEX_START,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  Flex,
  OVERFLOW_SCROLL,
  SPACING,
} from '@opentrons/components'

import { PinnedTransfer } from './PinnedTransfer'

import type { Dispatch, SetStateAction } from 'react'
import type { ProtocolResource } from '@opentrons/shared-data'
import type { CardSizeType } from './PinnedTransfer'

export function PinnedTransferCarousel(props: {
  pinnedTransfers: ProtocolResource[]
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetTransferId: (targetTransferId: string) => void
}): JSX.Element {
  const {
    pinnedTransfers,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetTransferId,
  } = props
  const cardSize = (): CardSizeType => {
    let size: CardSizeType = 'regular'
    if (pinnedTransfers.length < 3) {
      size = pinnedTransfers.length === 1 ? 'full' : 'half'
    }
    return size
  }

  return (
    <CarouselWrapper>
      <Flex
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing8}
        marginX={SPACING.spacing40}
      >
        {pinnedTransfers.map(transfer => {
          return (
            <PinnedTransfer
              cardSize={cardSize()}
              key={transfer.key}
              transfer={transfer}
              longPress={longPress}
              setShowDeleteConfirmationModal={setShowDeleteConfirmationModal}
              setTargetTransferId={setTargetTransferId}
            />
          )
        })}
      </Flex>
    </CarouselWrapper>
  )
}

const CarouselWrapper = styled.div`
  display: ${DISPLAY_FLEX};
  flex-direction: ${DIRECTION_ROW};
  align-items: ${ALIGN_FLEX_START};
  margin-right: -${SPACING.spacing40};
  margin-left: -${SPACING.spacing40};
  overflow-x: ${OVERFLOW_SCROLL};

  &::-webkit-scrollbar {
    display: none;
  }
`
