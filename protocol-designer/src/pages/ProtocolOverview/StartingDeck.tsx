import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  Box,
  Btn,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  ToggleGroup,
  TYPOGRAPHY,
} from '@opentrons/components'

import { LINK_BUTTON_STYLE } from '../../atoms'
import { SlotDetailsContainer } from '../../organisms'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import { DeckThumbnail } from './DeckThumbnail'
import { OffDeckThumbnail } from './OffdeckThumbnail'

import type { Dispatch, SetStateAction } from 'react'
import type { RobotType } from '@opentrons/shared-data'
import type { DeckSlot } from '../../types'

interface StartingDeckProps {
  robotType: RobotType
  setShowMaterialsListModal: Dispatch<SetStateAction<boolean>>
}

export function StartingDeck({
  robotType,
  setShowMaterialsListModal,
}: StartingDeckProps): JSX.Element {
  const [isOffDeck, setIsOFfDeck] = useState<boolean>(false)

  return (
    <Flex gridGap={SPACING.spacing12} flexDirection={DIRECTION_COLUMN}>
      <StartingDeckHeader
        isOffDeck={isOffDeck}
        setIsOffDeck={setIsOFfDeck}
        setShowMaterialsListModal={setShowMaterialsListModal}
      />
      <StartingDeckBody isOffDeck={isOffDeck} robotType={robotType} />
    </Flex>
  )
}

interface StartingDeckHeaderProps {
  isOffDeck: boolean
  setIsOffDeck: Dispatch<SetStateAction<boolean>>
  setShowMaterialsListModal: Dispatch<SetStateAction<boolean>>
}

function StartingDeckHeader(props: StartingDeckHeaderProps): JSX.Element {
  const { isOffDeck, setIsOffDeck, setShowMaterialsListModal } = props
  const { t } = useTranslation(['protocol_overview', 'starting_deck_state'])
  const onDeckString = t('starting_deck_state:onDeck')
  const offDeckString = t('starting_deck_state:offDeck')
  return (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} alignItems={ALIGN_CENTER}>
      <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
        <StyledText desktopStyle="headingSmallBold">
          {t('starting_deck')}
        </StyledText>
        <Flex padding={SPACING.spacing4}>
          <Btn
            data-testid="Materials_list"
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            onClick={() => {
              setShowMaterialsListModal(true)
            }}
            css={LINK_BUTTON_STYLE}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('protocol_overview:materials_list')}
            </StyledText>
          </Btn>
        </Flex>
      </Flex>
      <ToggleGroup
        selectedValue={isOffDeck ? offDeckString : onDeckString}
        leftText={onDeckString}
        rightText={offDeckString}
        leftClick={() => {
          setIsOffDeck(false)
        }}
        rightClick={() => {
          setIsOffDeck(true)
        }}
      />
    </Flex>
  )
}

interface StartingDeckBodyProps {
  isOffDeck: boolean
  robotType: RobotType
}

function StartingDeckBody(props: StartingDeckBodyProps): JSX.Element {
  const { isOffDeck, robotType } = props
  const [hover, setHover] = useState<DeckSlot | string | null>(null)
  const { labware: labwaresOnDeck } = useSelector(getInitialDeckSetup)
  const isOffDeckHover = hover != null && labwaresOnDeck[hover] != null
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing32}
      alignItems={ALIGN_CENTER}
    >
      {isOffDeck ? (
        <OffDeckThumbnail hover={hover} setHover={setHover} width="100%" />
      ) : (
        <DeckThumbnail hoverSlot={hover} setHoverSlot={setHover} />
      )}
      <Box width="100%" height="12.5rem">
        <SlotDetailsContainer
          robotType={robotType}
          slot={isOffDeckHover ? 'offDeck' : hover}
          offDeckLabwareId={isOffDeckHover ? hover : null}
        />
      </Box>
    </Flex>
  )
}
