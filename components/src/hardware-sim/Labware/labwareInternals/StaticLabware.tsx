// Render labware definition to SVG. XY is in robot coordinates.
import { memo, Fragment } from 'react'
import styled from 'styled-components'
import flatMap from 'lodash/flatMap'

import { LabwareOutline } from './LabwareOutline'
import { Well } from './Well'
import { STYLE_BY_WELL_CONTENTS } from './StyledWells'
import { COLORS } from '../../../helix-design-system'

import type { MemoExoticComponent } from 'react'
import type { LabwareDefinition2, LabwareWell } from '@opentrons/shared-data'
import type { WellMouseEvent, WellStroke } from './types'
import type { CSSProperties } from 'styled-components'

export interface StaticLabwareProps {
  /** Labware definition to render */
  definition: LabwareDefinition2
  /** Add thicker blurred blue border to labware, defaults to false */
  highlight?: boolean
  /** adds a drop shadow to the highlight border */
  highlightShadow?: boolean
  /** Optional callback to be executed when entire labware element is clicked */
  onLabwareClick?: () => void
  /** Optional callback to be executed when mouse enters a well element */
  onMouseEnterWell?: (e: WellMouseEvent) => unknown
  /** Optional callback to be executed when mouse leaves a well element */
  onMouseLeaveWell?: (e: WellMouseEvent) => unknown
  fill?: CSSProperties['fill']
  showRadius?: boolean
  wellStroke?: WellStroke
  /** optional show of labware border, defaulted to true */
  showBorder?: boolean
}

const TipDecoration = memo(function TipDecoration(props: {
  well: LabwareWell
}) {
  const { well } = props
  if (well.shape === 'circular') {
    const radius = well.diameter / 2
    return (
      <circle
        {...STYLE_BY_WELL_CONTENTS.tipPresent}
        cx={well.x}
        cy={well.y}
        r={radius - 1}
      />
    )
  }
  return null
})

const LabwareDetailGroup = styled.g`
  fill: none;
  stroke: ${COLORS.black90};
  stroke-width: 1;
`

export function StaticLabwareComponent(props: StaticLabwareProps): JSX.Element {
  const {
    definition,
    highlight,
    highlightShadow,
    onLabwareClick,
    onMouseEnterWell,
    onMouseLeaveWell,
    fill,
    showRadius = true,
    wellStroke = {},
    showBorder = true,
  } = props

  const { isTiprack } = definition.parameters
  return (
    <g onClick={onLabwareClick}>
      {!showBorder ? null : (
        <LabwareDetailGroup>
          <LabwareOutline
            definition={definition}
            highlight={highlight}
            highlightShadow={highlightShadow}
            fill={fill}
            showRadius={showRadius}
          />
        </LabwareDetailGroup>
      )}
      <g>
        {flatMap(
          definition.ordering,
          (row: string[], i: number, c: string[][]) => {
            return row.map(wellName => {
              return (
                <Fragment key={wellName}>
                  <Well
                    wellName={wellName}
                    well={definition.wells[wellName]}
                    onMouseEnterWell={onMouseEnterWell}
                    onMouseLeaveWell={onMouseLeaveWell}
                    {...(isTiprack
                      ? STYLE_BY_WELL_CONTENTS.tipPresent
                      : STYLE_BY_WELL_CONTENTS.defaultWell)}
                    fill={fill}
                    stroke={wellStroke[wellName] ?? undefined}
                  />

                  {isTiprack ? (
                    <TipDecoration well={definition.wells[wellName]} />
                  ) : null}
                </Fragment>
              )
            })
          }
        )}
      </g>
    </g>
  )
}

export const StaticLabware: MemoExoticComponent<
  typeof StaticLabwareComponent
> = memo(StaticLabwareComponent)
