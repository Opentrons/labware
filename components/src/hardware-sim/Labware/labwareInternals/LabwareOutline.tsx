import { SLOT_RENDER_WIDTH, SLOT_RENDER_HEIGHT } from '@opentrons/shared-data'
import { COLORS } from '../../../helix-design-system'

import type { SVGProps } from 'react'
import type { CSSProperties } from 'styled-components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface LabwareOutlineProps {
  /** Labware definition to outline */
  definition?: LabwareDefinition2
  /** x dimension in mm of this labware, used if definition doesn't supply dimensions, defaults to 127.76 */
  width?: number
  /** y dimension in mm of this labware, used if definition doesn't supply dimensions, defaults to 85.48 */
  height?: number
  /** if this labware is a tip rack, darken background and lighten borderx dimension in mm of this labware, used if definition doesn't supply dimensions, defaults to false */
  isTiprack?: boolean
  /** adds thicker blue border with blur to labware, defaults to false */
  highlight?: boolean
  /** adds a drop shadow to the highlight border */
  highlightShadow?: boolean
  /** [legacy] override the border color */
  stroke?: CSSProperties['stroke']
  fill?: CSSProperties['fill']
  showRadius?: boolean
}

const OUTLINE_THICKNESS_MM = 1

export function LabwareOutline(props: LabwareOutlineProps): JSX.Element {
  const {
    definition,
    width = SLOT_RENDER_WIDTH,
    height = SLOT_RENDER_HEIGHT,
    isTiprack = false,
    highlight = false,
    highlightShadow = false,
    stroke,
    fill,
    showRadius = true,
  } = props
  const {
    parameters = { isTiprack },
    dimensions = { xDimension: width, yDimension: height },
  } = definition ?? {}

  let backgroundFill
  if (fill != null) {
    backgroundFill = fill
  } else {
    backgroundFill = parameters.isTiprack ? '#CCCCCC' : COLORS.white
  }
  return (
    <>
      {highlight ? (
        <>
          <defs>
            <filter id="feOffset" filterUnits="objectBoundingBox">
              {/* *
               * TODO(bh, 2024-08-23): layer drop shadow filters to mimic CSS box shadow - may need to evaluate performance
               * https://stackoverflow.com/questions/22486039/css3-filter-drop-shadow-spread-property-alternatives
               * */}
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={COLORS.blue50}
              />
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="1.75"
                floodColor={COLORS.blue50}
              />
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="1"
                floodColor={COLORS.blue50}
              />
            </filter>
          </defs>
          <LabwareBorder
            borderThickness={2.2 * OUTLINE_THICKNESS_MM}
            xDimension={dimensions.xDimension}
            yDimension={dimensions.yDimension}
            filter={highlightShadow ? 'url(#feOffset)' : ''}
            stroke={COLORS.blue50}
            rx="8"
            ry="8"
            showRadius={showRadius}
            fill={backgroundFill}
          />
        </>
      ) : (
        <LabwareBorder
          borderThickness={OUTLINE_THICKNESS_MM}
          xDimension={dimensions.xDimension}
          yDimension={dimensions.yDimension}
          stroke={stroke ?? (parameters.isTiprack ? '#979797' : COLORS.black90)}
          fill={backgroundFill}
          showRadius={showRadius}
        />
      )}
    </>
  )
}

interface LabwareBorderProps extends SVGProps<SVGRectElement> {
  borderThickness: number
  xDimension: number
  yDimension: number
  showRadius?: boolean
}
function LabwareBorder(props: LabwareBorderProps): JSX.Element {
  const {
    borderThickness,
    xDimension,
    yDimension,
    showRadius = true,
    ...svgProps
  } = props
  return (
    <rect
      x={borderThickness}
      y={borderThickness}
      strokeWidth={2 * borderThickness}
      width={xDimension - 2 * borderThickness}
      height={yDimension - 2 * borderThickness}
      rx={showRadius ? 6 * borderThickness : 0}
      {...svgProps}
    />
  )
}
