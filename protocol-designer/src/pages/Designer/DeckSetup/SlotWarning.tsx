import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { RobotCoordsForeignDiv, TYPOGRAPHY } from '@opentrons/components'
import type { ModuleOrientation } from '@opentrons/shared-data'

interface Props {
  x: number
  y: number
  xDimension: number
  yDimension: number
  orientation: ModuleOrientation
  warningType: 'gen1multichannel' // NOTE: Ian 2019-10-31 if we want more on-deck warnings, expand the type here
}

const OVERHANG = 60

const StyledRect = styled.rect`
  rx: 6;
  fill: transparent;
  stroke: #ccc;
  stroke-width: 2;
  stroke-dasharray: 8 4;
`

export const SlotWarning = (props: Props): JSX.Element => {
  const { x, y, xDimension, yDimension, orientation, warningType } = props
  const rectXOffset = orientation === 'left' ? -OVERHANG : 0
  const textXOffset = orientation === 'left' ? -1 * OVERHANG : xDimension
  const { t } = useTranslation('deck')
  return (
    <g>
      <StyledRect
        x={x + rectXOffset}
        y={y}
        width={xDimension + OVERHANG}
        height={yDimension}
      />
      <RobotCoordsForeignDiv
        x={x + textXOffset}
        y={y}
        outerProps={{
          style: {
            padding: '1.3rem 0.5rem 0 0.5rem',
            fontSize: '0.52rem',
            fontWeight: TYPOGRAPHY.fontWeightSemiBold,
            color: '#9B9B9B',
            lineHeight: 1.25,
          },
        }}
        width={OVERHANG}
        height={yDimension}
      >
        {t(`warning.${warningType}`)}
      </RobotCoordsForeignDiv>
    </g>
  )
}
