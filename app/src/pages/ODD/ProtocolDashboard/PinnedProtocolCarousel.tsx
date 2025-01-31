import styled from 'styled-components'
import {
  ALIGN_FLEX_START,
  DIRECTION_ROW,
  Flex,
  SPACING,
} from '@opentrons/components'

import { useNotifyAllRunsQuery } from '/app/resources/runs'
import { PinnedProtocol } from './PinnedProtocol'

import type { Dispatch, SetStateAction } from 'react'
import type { ProtocolResource } from '@opentrons/shared-data'
import type { CardSizeType } from './PinnedProtocol'

interface PinnedProtocolCarouselProps {
  pinnedProtocols: ProtocolResource[]
  longPress: Dispatch<SetStateAction<boolean>>
  setShowDeleteConfirmationModal: (showDeleteConfirmationModal: boolean) => void
  setTargetProtocolId: (targetProtocolId: string) => void
  isRequiredCSV?: boolean
}

export function PinnedProtocolCarousel(
  props: PinnedProtocolCarouselProps
): JSX.Element {
  const {
    pinnedProtocols,
    longPress,
    setShowDeleteConfirmationModal,
    setTargetProtocolId,
    isRequiredCSV = false,
  } = props
  const runs = useNotifyAllRunsQuery()
  const cardSize = (): CardSizeType => {
    let size: CardSizeType = 'regular'
    if (pinnedProtocols.length < 3) {
      size = pinnedProtocols.length === 1 ? 'full' : 'half'
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
        {pinnedProtocols.map(protocol => {
          const lastRun = runs.data?.data.find(
            run => run.protocolId === protocol.id
          )?.createdAt
          return (
            <PinnedProtocol
              cardSize={cardSize()}
              key={protocol.key}
              lastRun={lastRun}
              protocol={protocol}
              longPress={longPress}
              setShowDeleteConfirmationModal={setShowDeleteConfirmationModal}
              setTargetProtocolId={setTargetProtocolId}
              isRequiredCSV={isRequiredCSV}
            />
          )
        })}
      </Flex>
    </CarouselWrapper>
  )
}

const CarouselWrapper = styled.div`
  display: flex;
  flex-direction: ${DIRECTION_ROW};
  align-items: ${ALIGN_FLEX_START};
  margin-right: -${SPACING.spacing40};
  margin-left: -${SPACING.spacing40};
  overflow-x: scroll;

  &::-webkit-scrollbar {
    display: none;
  }
`
