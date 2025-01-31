import { memo } from 'react'
import { C_BLACK, C_BLUE } from '../../../styles/colors'
import { RobotCoordsText } from '../../Deck'
import { WELL_LABEL_OPTIONS } from '../LabwareRender'
import { COLORS } from '../../../helix-design-system'

import type { MemoExoticComponent } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { WellLabelOption } from '../LabwareRender'
import type { HighlightedWellLabels } from './types'

// magic layout numbers to make the letters close to the edges of the labware
const LETTER_COLUMN_X_INSIDE = 4
const NUMBER_COLUMN_Y_FROM_TOP_INSIDE = 5

const LETTER_COLUMN_X_OUTSIDE = -4
const NUMBER_COLUMN_Y_FROM_TOP_OUTSIDE = -5

export interface WellLabelsProps {
  definition: LabwareDefinition2
  wellLabelOption: WellLabelOption
  highlightedWellLabels?: HighlightedWellLabels
  wellLabelColor?: string
}

const Labels = (props: {
  definition: LabwareDefinition2
  wells: string[]
  wellLabelOption: WellLabelOption
  isLetterColumn?: boolean
  highlightedWellLabels?: HighlightedWellLabels
  wellLabelColor?: string
}): JSX.Element => {
  const { wellLabelOption, highlightedWellLabels, wellLabelColor } = props
  const highlightColor = highlightedWellLabels?.color ?? C_BLUE
  const fillColor = wellLabelColor ?? C_BLACK
  const LETTER_COLUMN_X =
    wellLabelOption === WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE
      ? LETTER_COLUMN_X_INSIDE
      : LETTER_COLUMN_X_OUTSIDE

  const NUMBER_COLUMN_Y_FROM_TOP =
    wellLabelOption === WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE
      ? NUMBER_COLUMN_Y_FROM_TOP_INSIDE
      : NUMBER_COLUMN_Y_FROM_TOP_OUTSIDE

  return (
    <>
      {props.wells.map(wellName => {
        const well = props.definition.wells[wellName]
        return (
          <RobotCoordsText
            key={wellName}
            data-testid={
              wellLabelOption === WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE
                ? 'WellsLabels_show_inside'
                : 'WellsLabels_show_outside'
            }
            x={props.isLetterColumn === true ? LETTER_COLUMN_X : well.x}
            y={
              props.isLetterColumn === true
                ? well.y
                : props.definition.dimensions.yDimension -
                  NUMBER_COLUMN_Y_FROM_TOP
            }
            style={{
              color: COLORS.grey50, // LEGACY --c-font-dark
              fontSize: '0.2rem', // LEGACY --fs-micro
              textAnchor: 'middle',
              dominantBaseline:
                props.isLetterColumn === true ? 'middle' : 'auto',
            }}
            fill={
              highlightedWellLabels?.wells.includes(wellName) ?? false
                ? highlightColor
                : fillColor
            }
            canHighlight={false}
          >
            {(props.isLetterColumn === true ? /[A-Z]+/g : /\d+/g).exec(
              wellName
            )}
          </RobotCoordsText>
        )
      })}
    </>
  )
}

export function WellLabelsComponent(props: WellLabelsProps): JSX.Element {
  const {
    definition,
    wellLabelOption,
    highlightedWellLabels,
    wellLabelColor,
  } = props
  const letterColumn = definition.ordering[0] ?? []
  const numberRow = definition.ordering.map(wellCol => wellCol[0])

  return (
    <g>
      <Labels
        definition={definition}
        wells={letterColumn}
        wellLabelOption={wellLabelOption}
        highlightedWellLabels={highlightedWellLabels}
        wellLabelColor={wellLabelColor}
        isLetterColumn
      />
      <Labels
        definition={definition}
        wells={numberRow}
        wellLabelOption={wellLabelOption}
        highlightedWellLabels={highlightedWellLabels}
        wellLabelColor={wellLabelColor}
      />
    </g>
  )
}

export const WellLabels: MemoExoticComponent<typeof WellLabelsComponent> = memo(
  WellLabelsComponent
)
