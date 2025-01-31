import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  LabwareRender,
  OVERFLOW_SCROLL,
  RobotWorkSpace,
  SPACING,
  StyledText,
  WRAP,
} from '@opentrons/components'
import { selectors } from '../../labware-ingred/selectors'
import * as wellContentsSelectors from '../../top-selectors/well-contents'
import { getRobotType } from '../../file-data/selectors'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import { wellFillFromWellContents } from '../../organisms/LabwareOnDeck/utils'
import { SlotHover } from './SlotHover'

import type { Dispatch, SetStateAction } from 'react'

interface OffDeckThumbnailProps {
  hover: string | null
  setHover: Dispatch<SetStateAction<string | null>>
  width?: string
}
export function OffDeckThumbnail(props: OffDeckThumbnailProps): JSX.Element {
  const { hover, setHover, width = '32.5rem' } = props
  const { t, i18n } = useTranslation('starting_deck_state')
  const robotType = useSelector(getRobotType)
  const deckSetup = useSelector(getInitialDeckSetup)
  const offDeckLabware = Object.values(deckSetup.labware).filter(
    lw => lw.slot === 'offDeck'
  )
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )

  return (
    <Flex
      height="25.25rem"
      width={width}
      justifyContent={offDeckLabware.length === 0 ? JUSTIFY_CENTER : 'auto'}
      backgroundColor={
        offDeckLabware.length === 0 ? COLORS.grey30 : COLORS.grey10
      }
      flexDirection={DIRECTION_COLUMN}
      borderRadius={BORDERS.borderRadius8}
    >
      {offDeckLabware.length === 0 ? (
        <Flex
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          color={COLORS.grey60}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing8}
        >
          <Icon name="ot-alert" size="1rem" />
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('no_offdeck_labware')}
          </StyledText>
        </Flex>
      ) : (
        <>
          <Flex
            justifyContent={JUSTIFY_CENTER}
            width="100%"
            paddingTop={SPACING.spacing16}
            color={COLORS.grey60}
            marginBottom={SPACING.spacing40}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {i18n.format(t('off_deck_labware'), 'upperCase')}
            </StyledText>
          </Flex>

          <Flex
            flexWrap={WRAP}
            gridGap={SPACING.spacing16}
            paddingX={SPACING.spacing16}
            overflowY={OVERFLOW_SCROLL}
          >
            {offDeckLabware.map(lw => {
              const wellContents = allWellContentsForActiveItem
                ? allWellContentsForActiveItem[lw.id]
                : null
              const definition = lw.def
              const { dimensions } = definition
              return (
                <Flex flexDirection={DIRECTION_COLUMN} key={lw.id}>
                  <RobotWorkSpace
                    key={lw.id}
                    viewBox={`${definition.cornerOffsetFromSlot.x} ${definition.cornerOffsetFromSlot.y} ${dimensions.xDimension} ${dimensions.yDimension}`}
                    width="6.875rem"
                    height="3.75rem"
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
                        <SlotHover
                          robotType={robotType}
                          hover={hover}
                          setHover={setHover}
                          slotPosition={[0, 0, 0]}
                          slotId={lw.id}
                        />
                      </>
                    )}
                  </RobotWorkSpace>
                </Flex>
              )
            })}
          </Flex>
        </>
      )}
    </Flex>
  )
}
