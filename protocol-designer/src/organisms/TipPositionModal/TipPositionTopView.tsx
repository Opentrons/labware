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
import BOTTOM_LAYER from '../../assets/images/tip_top_bottom_layer.svg'
import MID_LAYER from '../../assets/images/tip_top_mid_layer.svg'
import TOP_LAYER from '../../assets/images/tip_top_top_layer.svg'

const WELL_WIDTH_PIXELS = 70
const PIXEL_DECIMALS = 2

interface TipPositionAllVizProps {
  xPosition: number
  xWidthMm: number
  yPosition: number
  yWidthMm: number
}

export function TipPositionTopView(props: TipPositionAllVizProps): JSX.Element {
  const { yPosition, xPosition, yWidthMm, xWidthMm } = props
  const { t } = useTranslation('application')

  const xPx = (WELL_WIDTH_PIXELS / xWidthMm) * xPosition
  const yPx = (WELL_WIDTH_PIXELS / yWidthMm) * yPosition

  const roundedXPx = round(xPx, PIXEL_DECIMALS)
  const roundedYPx = round(yPx, PIXEL_DECIMALS)
  const translateY = roundedYPx < 0 ? Math.abs(roundedYPx) : -roundedYPx
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
          transform: `translate(${roundedXPx}px, ${translateY}px)`,
        }}
      />
      <img src={TOP_LAYER} style={{ position: POSITION_ABSOLUTE }} />
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
