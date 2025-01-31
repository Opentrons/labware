import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  JUSTIFY_CENTER,
  LabwareRender,
  OVERFLOW_AUTO,
  RobotWorkSpace,
  SPACING,
  StyledText,
  WRAP,
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

const OFFDECK_MAP_WIDTH = '41.625rem'
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
  const containerWidth = tab === 'startingDeck' ? '100vw' : '75vh'
  const paddingLeftWithHover =
    hoverSlot == null
      ? `calc((${containerWidth} - (${SPACING.spacing24}  * 2) - ${OFFDECK_MAP_WIDTH}) / 2)`
      : SPACING.spacing24
  const paddingLeft = tab === 'startingDeck' ? paddingLeftWithHover : undefined
  const padding =
    tab === 'protocolSteps'
      ? SPACING.spacing24
      : `${SPACING.spacing24} ${paddingLeft}`
  const stepDetailsContainerWidth = `calc(((${containerWidth} - ${OFFDECK_MAP_WIDTH}) / 2) - (${SPACING.spacing24}  * 3))`

  return (
    <Flex
      backgroundColor={COLORS.white}
      borderRadius={BORDERS.borderRadius8}
      width="100%"
      height="65vh"
      padding={padding}
      gridGap={SPACING.spacing24}
      alignItems={ALIGN_CENTER}
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
        width={OFFDECK_MAP_WIDTH}
        height="100%"
        borderRadius={SPACING.spacing12}
        padding={`${SPACING.spacing16} ${SPACING.spacing40}`}
        backgroundColor={COLORS.grey20}
        overflowY={OVERFLOW_AUTO}
        flexDirection={DIRECTION_COLUMN}
        flex="0 0 auto"
      >
        <Flex
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          color={COLORS.grey60}
          marginBottom={SPACING.spacing40}
        >
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {i18n.format(t('off_deck_labware'), 'upperCase')}
          </StyledText>
        </Flex>

        <Flex flexWrap={WRAP} paddingY={SPACING.spacing32}>
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
                flexDirection={DIRECTION_COLUMN}
                key={lw.id}
                paddingRight={SPACING.spacing32}
                paddingBottom={
                  isLabwareSelectionSelected || highlighted
                    ? '0px'
                    : SPACING.spacing32
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
        </Flex>
      </Flex>
    </Flex>
  )
}
