import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  ALIGN_START,
  // ALIGN_STRETCH,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  JUSTIFY_CENTER,
  // JUSTIFY_START,
  LabwareRender,
  OVERFLOW_AUTO,
  RobotWorkSpace,
  SPACING,
  StyledText,
  // WRAP,
} from '@opentrons/components'
import * as wellContentsSelectors from '../../../top-selectors/well-contents'
import { selectors } from '../../../labware-ingred/selectors'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import { DeckItemHover } from '../DeckSetup/DeckItemHover'
import { SlotDetailsContainer } from '../../../organisms'
import { wellFillFromWellContents } from '../../../organisms/LabwareOnDeck/utils'
import { getRobotType } from '../../../file-data/selectors'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import { SlotOverflowMenu } from '../DeckSetup/SlotOverflowMenu'
import { HighlightOffdeckSlot } from './HighlightOffdeckSlot'
import type { CoordinateTuple, DeckSlotId } from '@opentrons/shared-data'
import type { DeckSetupTabType } from '../types'

const OFF_DECK_MAP_WIDTH = '41.625rem'
const OFF_DECK_MAP_HEIGHT = '45.5rem'
const ZERO_SLOT_POSITION: CoordinateTuple = [0, 0, 0]
interface OffDeckDetailsProps extends DeckSetupTabType {
  addLabware: () => void
}
export function OffDeckDetails(props: OffDeckDetailsProps): JSX.Element {
  const { addLabware, tab } = props
  const { t, i18n } = useTranslation('starting_deck_state')
  const [hoverSlot, setHoverSlot] = useState<DeckSlotId | null>(null)
  const [menuListId, setShowMenuListForId] = useState<DeckSlotId | null>(null)
  const robotType = useSelector(getRobotType)
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const hoveredDropdownItem = useSelector(getHoveredDropdownItem)
  const selectedDropdownSelection = useSelector(getSelectedDropdownItem)
  const offDeckLabware = Object.values(deckSetup.labware).filter(
    lw => lw.slot === 'offDeck'
  )
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const containerWidth = tab === 'startingDeck' ? '100vw' : '75vw'
  console.log('containerWidth', containerWidth)
  const paddingLeftWithHover =
    hoverSlot == null
      ? `calc((${containerWidth} - (${SPACING.spacing24}  * 2) - ${OFF_DECK_MAP_WIDTH}) / 2)`
      : SPACING.spacing24
  const paddingLeft = tab === 'startingDeck' ? paddingLeftWithHover : undefined
  const padding =
    tab === 'protocolSteps'
      ? SPACING.spacing24
      : `${SPACING.spacing40} ${paddingLeft}`
  const stepDetailsContainerWidth = `calc(((${containerWidth} - ${OFF_DECK_MAP_WIDTH}) / 2) - (${SPACING.spacing24}  * 3))`

  return (
    <Flex
      backgroundColor={COLORS.white}
      borderRadius={BORDERS.borderRadius12}
      width="100%"
      height="100%"
      // height="65vh"
      padding={padding}
      gridGap={SPACING.spacing24}
      alignItems={ALIGN_CENTER}
      id="container"
    >
      {hoverSlot != null ? (
        <Flex width={stepDetailsContainerWidth} height="6.25rem">
          <SlotDetailsContainer
            robotType={robotType}
            slot="offDeck"
            offDeckLabwareId={hoverSlot}
          />
        </Flex>
      ) : null}
      <Flex
        flex="0 0 auto"
        width={OFF_DECK_MAP_WIDTH}
        // height="100%"
        height={OFF_DECK_MAP_HEIGHT}
        alignItems={ALIGN_CENTER}
        borderRadius={SPACING.spacing12}
        padding={`${SPACING.spacing16} ${SPACING.spacing40}`}
        backgroundColor={COLORS.grey20}
        overflowY={OVERFLOW_AUTO}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing40}
        id="grey box"
      >
        <Flex
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          color={COLORS.grey60}
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {i18n.format(t('off_deck_labware'), 'upperCase')}
          </StyledText>
        </Flex>

        {/* <Flex
          flexWrap={WRAP}
          id="wrapper"
          columnGap={SPACING.spacing32}
          rowGap={SPACING.spacing40}
          // gap={`${SPACING.spacing40} ${SPACING.spacing32}`}
          justifyContent={JUSTIFY_START}
          alignItems={ALIGN_STRETCH}
        > */}
        <LabwareWrapper
          // justifyContent={
          //   offDeckLabware.length < 3 ? JUSTIFY_CENTER : JUSTIFY_START
          // }
          id="LabwareWrapper"
        >
          {tab === 'startingDeck' ? (
            <Flex width="9.5625rem" height="6.375rem">
              <EmptySelectorButton
                onClick={addLabware}
                text={t('add_labware')}
                textAlignment="middle"
                iconName="plus"
              />
            </Flex>
          ) : null}
          {offDeckLabware.map(lw => {
            const wellContents = allWellContentsForActiveItem
              ? allWellContentsForActiveItem[lw.id]
              : null
            const definition = lw.def
            const { dimensions } = definition
            const xyzDimensions = {
              xDimension: dimensions.xDimension ?? 0,
              yDimension: dimensions.yDimension ?? 0,
              zDimension: dimensions.zDimension ?? 0,
            }
            const isLabwareSelectionSelected = selectedDropdownSelection.some(
              selected => selected.id === lw.id
            )
            const highlighted = hoveredDropdownItem.id === lw.id
            return (
              <Flex
                id={lw.id}
                flexDirection={DIRECTION_COLUMN}
                key={lw.id}
                // paddingRight={SPACING.spacing32}
                paddingBottom={
                  isLabwareSelectionSelected || highlighted ? '0px' : '0px'
                }
              >
                <RobotWorkSpace
                  key={lw.id}
                  viewBox={`${definition.cornerOffsetFromSlot.x} ${definition.cornerOffsetFromSlot.y} ${dimensions.xDimension} ${dimensions.yDimension}`}
                  width="9.5625rem"
                  height="6.375rem"
                >
                  {() => (
                    <>
                      <LabwareRender
                        definition={definition}
                        wellFill={wellFillFromWellContents(
                          wellContents,
                          liquidDisplayColors
                        )}
                      />

                      <DeckItemHover
                        hover={hoverSlot}
                        setShowMenuListForId={setShowMenuListForId}
                        menuListId={menuListId}
                        setHover={setHoverSlot}
                        slotBoundingBox={xyzDimensions}
                        slotPosition={ZERO_SLOT_POSITION}
                        itemId={lw.id}
                        tab={tab}
                      />
                    </>
                  )}
                </RobotWorkSpace>
                <HighlightOffdeckSlot
                  labwareOnDeck={lw}
                  position={ZERO_SLOT_POSITION}
                />
                {menuListId === lw.id ? (
                  <Flex
                    marginTop={`-${SPACING.spacing32}`}
                    marginLeft="4rem"
                    zIndex={3}
                  >
                    <SlotOverflowMenu
                      location={menuListId}
                      addEquipment={addLabware}
                      setShowMenuList={() => {
                        setShowMenuListForId(null)
                      }}
                      menuListSlotPosition={ZERO_SLOT_POSITION}
                      invertY
                    />
                  </Flex>
                ) : null}
              </Flex>
            )
          })}

          <HighlightOffdeckSlot position={ZERO_SLOT_POSITION} />

          {/* {tab === 'startingDeck' ? (
            <Flex width="9.5625rem" height="6.375rem" id="add button">
              <EmptySelectorButton
                onClick={addLabware}
                text={t('add_labware')}
                textAlignment="middle"
                iconName="plus"
              />
            </Flex>
          ) : null} */}
        </LabwareWrapper>
      </Flex>
    </Flex>
  )
}

// const LabwareWrapper = styled(Flex)`
//   /* flex: 0 0 auto; */
//   flex-wrap: ${WRAP};
//   column-gap: ${SPACING.spacing32};
//   row-gap: ${SPACING.spacing40};
//   justify-content: ${JUSTIFY_CENTER};
//   align-items: ${ALIGN_STRETCH};

//   & > :last-child {
//     justify-content: ${JUSTIFY_START};
//   }
// `

const LabwareWrapper = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5625rem, 1fr));
  row-gap: ${SPACING.spacing40};
  column-gap: ${SPACING.spacing32};
  justify-content: ${JUSTIFY_CENTER}; /* Center the grid within the container */
  align-items: ${ALIGN_START};
  width: 100%;
  // Note(kk: 1/30/2025) this padding is to add space to the right edge and the left edge of the grid
  // this is not a perfect solution, but it works for now
  padding: 0 ${SPACING.spacing24};
`
