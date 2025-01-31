import round from 'lodash/round'
import { useTranslation } from 'react-i18next'
import {
  Box,
  COLORS,
  OVERFLOW_HIDDEN,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  StyledText,
} from '@opentrons/components'
import BOTTOM_LAYER from '../../assets/images/tip_side_bottom_layer.svg'
import MID_LAYER from '../../assets/images/tip_side_mid_layer.svg'
import TOP_LAYER from '../../assets/images/tip_side_top_layer.svg'

const WELL_HEIGHT_PIXELS = 71
const WELL_WIDTH_PIXELS = 70
const PIXEL_DECIMALS = 2

interface TipPositionAllVizProps {
  mmFromBottom: number
  xPosition: number
  wellDepthMm: number
  xWidthMm: number
}

export function TipPositionSideView(
  props: TipPositionAllVizProps
): JSX.Element {
  const { mmFromBottom, xPosition, wellDepthMm, xWidthMm } = props
  const { t } = useTranslation('application')
  const fractionOfWellHeight = mmFromBottom / wellDepthMm
  const pixelsFromBottom =
    fractionOfWellHeight * WELL_HEIGHT_PIXELS - WELL_HEIGHT_PIXELS
  const roundedPixelsFromBottom = round(pixelsFromBottom, PIXEL_DECIMALS)
  const bottomPx = wellDepthMm
    ? roundedPixelsFromBottom * 2
    : mmFromBottom - WELL_HEIGHT_PIXELS

  const xPositionPixels = (WELL_WIDTH_PIXELS / xWidthMm) * xPosition
  const roundedXPositionPixels = round(xPositionPixels, PIXEL_DECIMALS)

  return (
    <Box
      position={POSITION_RELATIVE}
      width="15.8125rem"
      height="18rem"
      overflow={OVERFLOW_HIDDEN}
    >
      <img src={BOTTOM_LAYER} style={{ position: POSITION_ABSOLUTE }} />
      <img
        src={MID_LAYER}
        style={{
          position: POSITION_ABSOLUTE,
          transform: `translate(${roundedXPositionPixels}px)`,
          bottom: `calc(${bottomPx}px + 33px)`,
        }}
      />
      <img src={TOP_LAYER} style={{ position: POSITION_ABSOLUTE }} />
      {wellDepthMm !== null && (
        <Box position={POSITION_ABSOLUTE} bottom="7.3rem" right="2rem">
          <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
            {round(wellDepthMm, 0)}
            {t('units.millimeter')}
          </StyledText>
        </Box>
      )}
      {xWidthMm !== null && (
        <Box position={POSITION_ABSOLUTE} bottom="2rem" right="7rem">
          <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
            {xWidthMm}
            {t('units.millimeter')}
          </StyledText>
        </Box>
      )}
    </Box>
  )
}
