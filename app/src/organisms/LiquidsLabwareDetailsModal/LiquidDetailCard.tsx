import { useSelector } from 'react-redux'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  SIZE_1,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { MICRO_LITERS } from '@opentrons/shared-data'
import { Divider } from '/app/atoms/structure'
import {
  useTrackEvent,
  ANALYTICS_HIGHLIGHT_LIQUID_IN_DETAIL_MODAL,
} from '/app/redux/analytics'
import { getIsOnDevice } from '/app/redux/config'
import { getWellRangeForLiquidLabwarePair } from '/app/transformations/analysis'

import type { Dispatch, SetStateAction } from 'react'

export const CARD_OUTLINE_BORDER_STYLE = css`
  border-style: ${BORDERS.styleSolid};
  border-width: 1px;
  border-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius8};
  &:hover {
    border-color: ${COLORS.grey55};
  }
`

const LIQUID_CARD_STYLE = css`
  ${CARD_OUTLINE_BORDER_STYLE}
  &:hover {
    border: 1px solid ${COLORS.grey60};
    border-radius: ${BORDERS.borderRadius8};
    cursor: ${CURSOR_POINTER};
  }
`
const LIQUID_CARD_ODD_STYLE = css`
  border-color: ${COLORS.grey30};
  border: ${SPACING.spacing4} solid ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius12};
`
interface LiquidDetailCardProps {
  liquidId: string
  displayName: string
  description: string | null
  displayColor: string
  volumeByWell: { [well: string]: number }
  setSelectedValue: Dispatch<SetStateAction<string | undefined>>
  selectedValue: string | undefined
  labwareWellOrdering: string[][]
}

export function LiquidDetailCard(props: LiquidDetailCardProps): JSX.Element {
  const {
    liquidId,
    displayName,
    description,
    displayColor,
    volumeByWell,
    setSelectedValue,
    selectedValue,
    labwareWellOrdering,
  } = props
  const trackEvent = useTrackEvent()
  const isOnDevice = useSelector(getIsOnDevice)

  const ACTIVE_STYLE = css`
    background-color: ${isOnDevice ? COLORS.blue30 : COLORS.blue10};
    border: ${isOnDevice ? SPACING.spacing4 : `1px`} solid ${COLORS.blue50};
    border-radius: ${isOnDevice
      ? BORDERS.borderRadius12
      : BORDERS.borderRadius8};
  `
  const volumePerWellRange = getWellRangeForLiquidLabwarePair(
    volumeByWell,
    labwareWellOrdering
  )

  const handleSelectedValue = (): void => {
    setSelectedValue(liquidId)
    trackEvent({
      name: ANALYTICS_HIGHLIGHT_LIQUID_IN_DETAIL_MODAL,
      properties: {},
    })
  }

  return isOnDevice ? (
    <Box
      css={selectedValue === liquidId ? ACTIVE_STYLE : LIQUID_CARD_ODD_STYLE}
      borderRadius={BORDERS.borderRadius8}
      backgroundColor={COLORS.white}
      onClick={() => {
        setSelectedValue(liquidId)
      }}
      width="19.875rem"
      minHeight="max-content"
      aria-label="liquidBox_odd"
    >
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing16}>
        <Flex
          css={CARD_OUTLINE_BORDER_STYLE}
          padding={SPACING.spacing4}
          height="3rem"
          width="3rem"
          backgroundColor={COLORS.white}
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
        >
          <Icon name="circle" color={displayColor} size="1.4rem" />
        </Flex>
        <LegacyStyledText
          fontSize={TYPOGRAPHY.fontSize22}
          lineHeight={TYPOGRAPHY.lineHeight28}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          marginTop={SPACING.spacing12}
        >
          {displayName}
        </LegacyStyledText>
        <LegacyStyledText
          fontSize={TYPOGRAPHY.fontSize22}
          lineHeight={TYPOGRAPHY.lineHeight28}
          color={COLORS.grey50}
        >
          {description != null ? description : null}
        </LegacyStyledText>
        <Flex
          backgroundColor={`${COLORS.black90}${COLORS.opacity20HexCode}`}
          borderRadius={BORDERS.borderRadius4}
          height="2.75rem"
          padding={`${SPACING.spacing8} ${SPACING.spacing12}`}
          alignItems={TYPOGRAPHY.textAlignCenter}
          marginTop={SPACING.spacing16}
          width="max-content"
        >
          <LegacyStyledText
            fontSize={TYPOGRAPHY.fontSize22}
            lineHeight={TYPOGRAPHY.lineHeight28}
            color={COLORS.black90}
          >
            {Object.values(volumeByWell)
              .reduce((prev, curr) => prev + curr, 0)
              .toFixed(1)}{' '}
            {MICRO_LITERS}
          </LegacyStyledText>
        </Flex>
      </Flex>
      {selectedValue === liquidId ? (
        <>
          <Box borderBottom={`3px solid ${COLORS.grey35}`} />
          <Flex
            padding={SPACING.spacing16}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
          >
            {volumePerWellRange.map((well, index) => {
              return (
                <Flex
                  key={`${well.wellName}_${index}`}
                  flexDirection={DIRECTION_ROW}
                  justifyContent={JUSTIFY_SPACE_BETWEEN}
                  paddingBottom={
                    index !== volumePerWellRange.length - 1
                      ? SPACING.spacing8
                      : '0'
                  }
                >
                  <LegacyStyledText
                    lineHeight={TYPOGRAPHY.lineHeight28}
                    fontSize={TYPOGRAPHY.fontSize22}
                  >
                    {well.wellName}
                  </LegacyStyledText>
                  <LegacyStyledText
                    lineHeight={TYPOGRAPHY.lineHeight28}
                    fontSize={TYPOGRAPHY.fontSize22}
                    color={COLORS.grey60}
                  >
                    {well.volume} {MICRO_LITERS}
                  </LegacyStyledText>
                </Flex>
              )
            })}
          </Flex>
        </>
      ) : null}
    </Box>
  ) : (
    <Box
      css={selectedValue === liquidId ? ACTIVE_STYLE : LIQUID_CARD_STYLE}
      borderRadius={BORDERS.borderRadius8}
      padding={SPACING.spacing16}
      backgroundColor={COLORS.white}
      onClick={handleSelectedValue}
      width="10.3rem"
      minHeight="max-content"
      data-testid="LiquidDetailCard_box"
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Flex
          css={CARD_OUTLINE_BORDER_STYLE}
          padding={SPACING.spacing8}
          height="max-content"
          width="max-content"
          backgroundColor={COLORS.white}
        >
          <Icon name="circle" color={displayColor} size={SIZE_1} />
        </Flex>
        <LegacyStyledText
          as="h3"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          marginTop={SPACING.spacing8}
        >
          {displayName}
        </LegacyStyledText>
        <LegacyStyledText as="p" color={COLORS.grey50}>
          {description != null ? description : null}
        </LegacyStyledText>

        <Flex
          backgroundColor={`${COLORS.black90}${COLORS.opacity20HexCode}`}
          borderRadius={BORDERS.borderRadius8}
          height="max-content"
          width="max-content"
          paddingY={SPACING.spacing4}
          paddingX={SPACING.spacing8}
          marginTop={SPACING.spacing8}
        >
          <LegacyStyledText
            fontSize={TYPOGRAPHY.fontSizeH4}
            lineHeight={TYPOGRAPHY.lineHeight20}
          >
            {Object.values(volumeByWell)
              .reduce((prev, curr) => prev + curr, 0)
              .toFixed(1)}{' '}
            {MICRO_LITERS}
          </LegacyStyledText>
        </Flex>
      </Flex>
      {selectedValue === liquidId ? (
        <>
          <Divider
            marginX="-1rem"
            marginY={SPACING.spacing16}
            color={`${COLORS.black90}${COLORS.opacity20HexCode}`}
          />
          {volumePerWellRange.map((well, index) => {
            return (
              <Flex
                key={`${well.wellName}_${index}`}
                flexDirection={DIRECTION_ROW}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                paddingBottom={
                  index !== volumePerWellRange.length - 1
                    ? SPACING.spacing8
                    : '0'
                }
              >
                <LegacyStyledText
                  as="p"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  marginRight={SPACING.spacing4}
                >
                  {well.wellName}
                </LegacyStyledText>
                <LegacyStyledText
                  as="p"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                >
                  {well.volume.toFixed(1)} {MICRO_LITERS}
                </LegacyStyledText>
              </Flex>
            )
          })}
        </>
      ) : null}
    </Box>
  )
}
