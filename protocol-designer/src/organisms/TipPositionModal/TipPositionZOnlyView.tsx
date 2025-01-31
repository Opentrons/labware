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
const PIXEL_DECIMALS = 2

interface TipPositionZOnlyViewProps {
  wellDepthMm: number
  mmFromBottom?: number
  mmFromTop?: number
}

export function TipPositionZOnlyView(
  props: TipPositionZOnlyViewProps
): JSX.Element {
  const { mmFromBottom, mmFromTop, wellDepthMm } = props
  const { t } = useTranslation('application')
  const positionInTube = mmFromBottom ?? mmFromTop ?? 0
  const fractionOfWellHeight = positionInTube / wellDepthMm
  const pixelsFromBottom =
    fractionOfWellHeight * WELL_HEIGHT_PIXELS -
    (mmFromBottom != null ? WELL_HEIGHT_PIXELS : 0)
  const roundedPixelsFromBottom = round(pixelsFromBottom, PIXEL_DECIMALS)

  const bottomPx = roundedPixelsFromBottom * 2

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
    </Box>
  )
}
