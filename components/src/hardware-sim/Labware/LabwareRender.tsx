import {
  WellLabels,
  StyledWells,
  FilledWells,
  StrokedWells,
  StaticLabware,
} from './labwareInternals'
import { LabwareAdapter, labwareAdapterLoadNames } from './LabwareAdapter'

import type { CSSProperties } from 'styled-components'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  HighlightedWellLabels,
  WellMouseEvent,
  WellFill,
  WellStroke,
  WellGroup,
} from './labwareInternals/types'

import type { RefObject } from 'react'
import type { LabwareAdapterLoadName } from './LabwareAdapter'

export const WELL_LABEL_OPTIONS = {
  SHOW_LABEL_INSIDE: 'SHOW_LABEL_INSIDE',
  SHOW_LABEL_OUTSIDE: 'SHOW_LABEL_OUTSIDE',
} as const

export type WellLabelOption = keyof typeof WELL_LABEL_OPTIONS

export interface LabwareRenderProps {
  /** Labware definition to render */
  definition: LabwareDefinition2
  /** Opional Prop for labware on heater shakers sitting on right side of the deck */
  shouldRotateAdapterOrientation?: boolean
  /** option to show well labels inside or outside of labware outline */
  wellLabelOption?: WellLabelOption
  /** wells to highlight */
  highlightedWells?: WellGroup | null
  /** option for none highlighted wells to be disabled */
  disabledWells?: WellGroup[]
  missingTips?: WellGroup | null
  /** color to render well labels */
  wellLabelColor?: string
  /** option to highlight well labels with specified color */
  highlightedWellLabels?: HighlightedWellLabels
  selectedWells?: WellGroup | null
  /** CSS color to fill specified wells */
  wellFill?: WellFill
  /** CSS color to stroke specified wells */
  wellStroke?: WellStroke
  /** CSS color to stroke the labware outline */
  labwareStroke?: CSSProperties['stroke']
  /** adds thicker blue border with blur to labware */
  highlight?: boolean
  /** adds a drop shadow to the highlight border */
  highlightShadow?: boolean
  /** Optional callback, called with WellMouseEvent args onMouseEnter */
  onMouseEnterWell?: (e: WellMouseEvent) => unknown
  /** Optional callback, called with WellMouseEvent args onMouseLeave */
  onMouseLeaveWell?: (e: WellMouseEvent) => unknown
  gRef?: RefObject<SVGGElement>
  onLabwareClick?: () => void
  showBorder?: boolean
  strokeColor?: string
}

export const LabwareRender = (props: LabwareRenderProps): JSX.Element => {
  const { gRef, definition } = props

  const cornerOffsetFromSlot = definition.cornerOffsetFromSlot
  const labwareLoadName = definition.parameters.loadName

  if (labwareAdapterLoadNames.includes(labwareLoadName)) {
    const { shouldRotateAdapterOrientation } = props
    const { xDimension, yDimension } = props.definition.dimensions

    return (
      <g
        transform={
          shouldRotateAdapterOrientation
            ? `rotate(180, ${xDimension / 2}, ${yDimension / 2})`
            : 'rotate(0, 0, 0)'
        }
      >
        <g
          transform={
            shouldRotateAdapterOrientation
              ? `translate(${-cornerOffsetFromSlot.x}, ${-cornerOffsetFromSlot.y})`
              : `translate(${cornerOffsetFromSlot.x}, ${cornerOffsetFromSlot.y})`
          }
          ref={gRef}
          onClick={props.onLabwareClick}
        >
          <LabwareAdapter
            labwareLoadName={labwareLoadName as LabwareAdapterLoadName}
            definition={definition}
            highlight={props.highlight}
            highlightShadow={props.highlightShadow}
          />
        </g>
      </g>
    )
  }
  return (
    <g
      transform={`translate(${cornerOffsetFromSlot.x}, ${cornerOffsetFromSlot.y})`}
      ref={gRef}
    >
      <StaticLabware
        showBorder={props.showBorder}
        definition={props.definition}
        onMouseEnterWell={props.onMouseEnterWell}
        onMouseLeaveWell={props.onMouseLeaveWell}
        onLabwareClick={props.onLabwareClick}
        highlight={props.highlight}
        highlightShadow={props.highlightShadow}
        wellStroke={props.wellStroke}
      />
      {props.wellStroke != null ? (
        <StrokedWells
          definition={props.definition}
          strokeByWell={props.wellStroke}
        />
      ) : null}
      {props.wellFill != null ? (
        <FilledWells
          definition={props.definition}
          fillByWell={props.wellFill}
          strokeColor={props.strokeColor}
        />
      ) : null}
      {props.disabledWells != null
        ? props.disabledWells.map((well, index) => (
            <StyledWells
              key={index}
              wellContents="disabledWell"
              definition={props.definition}
              wells={well}
            />
          ))
        : null}
      {props.highlightedWells != null ? (
        <StyledWells
          wellContents="highlightedWell"
          definition={props.definition}
          wells={props.highlightedWells}
        />
      ) : null}
      {props.selectedWells != null ? (
        <StyledWells
          wellContents="selectedWell"
          definition={props.definition}
          wells={props.selectedWells}
        />
      ) : null}
      {props.missingTips != null ? (
        <StyledWells
          wellContents="tipMissing"
          definition={props.definition}
          wells={props.missingTips}
        />
      ) : null}
      {props.wellLabelOption != null &&
      props.definition.metadata.displayCategory !== 'adapter' ? (
        <WellLabels
          definition={props.definition}
          wellLabelOption={props.wellLabelOption}
          wellLabelColor={props.wellLabelColor}
          highlightedWellLabels={props.highlightedWellLabels}
        />
      ) : null}
    </g>
  )
}
