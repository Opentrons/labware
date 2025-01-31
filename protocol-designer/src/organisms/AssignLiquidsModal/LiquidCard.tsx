import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  Btn,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Divider,
  Flex,
  Icon,
  LiquidIcon,
  ListItem,
  SPACING,
  StyledText,
  TEXT_DECORATION_UNDERLINE,
  Tag,
} from '@opentrons/components'

import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { getEnableLiquidClasses } from '../../feature-flags/selectors'
import { removeWellsContents } from '../../labware-ingred/actions'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { getLabwareEntities } from '../../step-forms/selectors'
import * as wellContentsSelectors from '../../top-selectors/well-contents'

import type { SelectedContainerId } from '../../labware-ingred/reducers'
import type { LiquidInfo } from './LiquidToolbox'

interface LiquidCardProps {
  info: LiquidInfo
}

export function LiquidCard(props: LiquidCardProps): JSX.Element {
  const { info } = props
  const { name, color, liquidClassDisplayName, liquidIndex } = info
  const { t } = useTranslation('liquids')
  const dispatch = useDispatch()
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const labwareId = useSelector(labwareIngredSelectors.getSelectedLabwareId)
  const labwareEntities = useSelector(getLabwareEntities)
  const selectedLabwareDef =
    labwareId != null ? labwareEntities[labwareId] : null
  const liquidsWithDescriptions = useSelector(
    labwareIngredSelectors.allIngredientGroupFields
  )
  const orderedWells = selectedLabwareDef?.def.ordering.flat() ?? []
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)
  const wellContents =
    allWellContentsForActiveItem != null && labwareId != null
      ? allWellContentsForActiveItem[labwareId]
      : null
  const liquidsInLabware =
    wellContents != null
      ? Object.values(wellContents).flatMap(content => content.groupIds)
      : null
  const uniqueLiquids = Array.from(new Set(liquidsInLabware))

  const fullWellsByLiquid = uniqueLiquids.reduce<Record<string, string[]>>(
    (acc, liq) => {
      if (allWellContentsForActiveItem != null && labwareId != null) {
        const wellContents = allWellContentsForActiveItem[labwareId] ?? {}
        Object.entries(wellContents).forEach(([wellName, well]) => {
          const { groupIds } = well
          if (groupIds.includes(liq)) {
            if (liq in acc) {
              acc[liq] = [...acc[liq], wellName]
            } else {
              acc[liq] = [wellName]
            }
          }
        })
      }
      return acc
    },
    {}
  )

  const handleClearLiquid = (
    labwareId: SelectedContainerId,
    wells: string[]
  ): void => {
    if (labwareId != null) {
      dispatch(
        removeWellsContents({
          labwareId,
          wells,
        })
      )
    } else {
      console.error('Could not clear selected liquid - no labware ID')
    }
  }

  return (
    <ListItem type="noActive" flexDirection={DIRECTION_COLUMN} key={name}>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing12}
        gridGap={SPACING.spacing4}
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing16}>
          <LiquidIcon color={color} size="medium" />
          <Flex
            flexDirection={DIRECTION_COLUMN}
            width="12.375rem"
            gridGap={SPACING.spacing4}
          >
            <StyledText
              desktopStyle="bodyDefaultSemiBold"
              css={LINE_CLAMP_TEXT_STYLE(3)}
            >
              {name}
            </StyledText>
            {liquidClassDisplayName != null && enableLiquidClasses ? (
              <Tag
                text={liquidClassDisplayName}
                type="default"
                shrinkToContent
              />
            ) : null}
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={LINE_CLAMP_TEXT_STYLE(3)}
            >
              {info.liquidIndex != null
                ? liquidsWithDescriptions[info.liquidIndex].description
                : null}
            </StyledText>
          </Flex>
          <Flex
            cursor={CURSOR_POINTER}
            onClick={() => {
              setIsExpanded(prev => !prev)
            }}
          >
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size="2rem"
            />
          </Flex>
        </Flex>
        <Btn
          onClick={() => {
            if (labwareId != null) {
              handleClearLiquid(labwareId, fullWellsByLiquid[info.liquidIndex])
            }
          }}
          alignSelf={ALIGN_FLEX_END}
        >
          <StyledText
            desktopStyle="bodyDefaultRegular"
            textDecoration={TEXT_DECORATION_UNDERLINE}
          >
            {t('delete')}
          </StyledText>
        </Btn>
      </Flex>
      {isExpanded ? (
        <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
          <Flex gridGap={SPACING.spacing4} color={COLORS.grey60}>
            <StyledText width="50%" desktopStyle="bodyDefaultRegular">
              {t('well')}
            </StyledText>
            <Flex width="50%">
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('microliters')}
              </StyledText>
            </Flex>
          </Flex>
          <Divider borderColor={COLORS.grey35} />
          {info.liquidIndex != null
            ? fullWellsByLiquid[info.liquidIndex]
                .sort((a, b) =>
                  orderedWells.indexOf(b) > orderedWells.indexOf(a) ? -1 : 1
                )
                .map((wellName, wellliquidIndex) => {
                  const volume =
                    wellContents != null
                      ? wellContents[wellName].ingreds[liquidIndex].volume
                      : 0
                  return (
                    <>
                      <WellContents wellName={wellName} volume={volume} />
                      {wellliquidIndex <
                      fullWellsByLiquid[liquidIndex].length - 1 ? (
                        <Divider borderColor={COLORS.grey35} />
                      ) : null}
                    </>
                  )
                })
            : null}
        </Flex>
      ) : null}
    </ListItem>
  )
}

interface WellContentsProps {
  wellName: string
  volume: number
}

function WellContents(props: WellContentsProps): JSX.Element {
  const { wellName, volume } = props
  const { t } = useTranslation('liquids')

  return (
    <Flex gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
      <StyledText width="50%" desktopStyle="bodyDefaultRegular">
        {wellName}
      </StyledText>
      <Flex width="50%">
        <Tag text={`${volume} ${t('microliters')}`} type="default" />
      </Flex>
    </Flex>
  )
}
