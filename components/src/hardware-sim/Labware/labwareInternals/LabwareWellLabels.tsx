import { memo } from 'react'
import { C_BLACK, C_BLUE } from '../../../styles/colors'
import { RobotCoordsText } from '../../Deck'
import { TYPOGRAPHY } from '../../../ui-style-constants'

import type { MemoExoticComponent } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { HighlightedWellLabels } from './types'

// magic layout numbers to make the letters close to the edges of the labware
// evaluate values for inside/outside labware outline when needed
const LETTER_COLUMN_X_ADJUSTMENT = -4
const NUMBER_COLUMN_Y_ADJUSTMENT = 2

interface LabwareWellLabelsProps {
  definition: LabwareDefinition2
  highlightedWellLabels?: HighlightedWellLabels
  wellLabelColor?: string
}

const Labels = (props: {
  definition: LabwareDefinition2
  wells: string[]
  isLetterColumn?: boolean
  highlightedWellLabels?: HighlightedWellLabels
  wellLabelColor?: string
}): JSX.Element => {
  const {
    definition,
    highlightedWellLabels,
    isLetterColumn = false,
    wellLabelColor,
    wells,
  } = props
  const highlightColor = highlightedWellLabels?.color ?? C_BLUE
  const fillColor = wellLabelColor ?? C_BLACK

  // set x and y from a1 well values
  const firstWellName = definition.ordering[0][0]
  const firstWell = definition.wells[firstWellName]

  const xDistanceToWellEdge =
    firstWell.shape === 'circular'
      ? firstWell.diameter / 2
      : firstWell.xDimension / 2

  const yDistanceToWellEdge =
    firstWell.shape === 'circular'
      ? firstWell.diameter / 2
      : firstWell.yDimension / 2

  const firstWellXPosition =
    firstWell.x - xDistanceToWellEdge + LETTER_COLUMN_X_ADJUSTMENT

  const firstWellYPosition =
    firstWell.y + yDistanceToWellEdge + NUMBER_COLUMN_Y_ADJUSTMENT

  return (
    <>
      {wells.map(wellName => {
        const well = definition.wells[wellName]
        return (
          <RobotCoordsText
            key={wellName}
            x={isLetterColumn ? firstWellXPosition : well.x}
            y={isLetterColumn ? well.y : firstWellYPosition}
            style={{
              fontSize: '0.2rem', // LEGACY --fs-micro
              fontWeight: TYPOGRAPHY.fontWeightSemiBold,
              textAnchor: 'middle',
              dominantBaseline: isLetterColumn ? 'middle' : 'auto',
            }}
            fill={
              highlightedWellLabels?.wells.includes(wellName) ?? false
                ? highlightColor
                : fillColor
            }
          >
            {(isLetterColumn ? /[A-Z]+/g : /\d+/g).exec(wellName)}
          </RobotCoordsText>
        )
      })}
    </>
  )
}

export function LabwareWellLabelsComponent(
  props: LabwareWellLabelsProps
): JSX.Element {
  const { definition, highlightedWellLabels, wellLabelColor } = props
  const letterColumn = definition.ordering[0] ?? []
  const numberRow = definition.ordering.map(wellCol => wellCol[0])

  return (
    <g>
      <Labels
        definition={definition}
        wells={letterColumn}
        highlightedWellLabels={highlightedWellLabels}
        wellLabelColor={wellLabelColor}
        isLetterColumn
      />
      <Labels
        definition={definition}
        wells={numberRow}
        highlightedWellLabels={highlightedWellLabels}
        wellLabelColor={wellLabelColor}
      />
    </g>
  )
}

/**
 * for use in Labware.tsx component
 * has ODD-specific styling
 */
export const LabwareWellLabels: MemoExoticComponent<
  typeof LabwareWellLabelsComponent
> = memo(LabwareWellLabelsComponent)
