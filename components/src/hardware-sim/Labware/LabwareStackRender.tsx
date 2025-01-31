import { WellLabels, StaticLabware } from './labwareInternals'
import { LabwareAdapter, labwareAdapterLoadNames } from './LabwareAdapter'
import { COLORS } from '../../helix-design-system'
import { Svg } from '../..'

import type { RefObject } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { HighlightedWellLabels } from './labwareInternals/types'
import type { LabwareAdapterLoadName } from './LabwareAdapter'
import type { WellLabelOption } from '../..'

const HIGHLIGHT_COLOR = COLORS.blue30
const STROKE_WIDTH = 1
const SKEW_ANGLE_DEGREES = 30
const ROTATE_ANGLE_DEGREES = 30
const SKEW_ANGLE_RADIANS = (SKEW_ANGLE_DEGREES * Math.PI) / 180
const ROTATE_ANGLE_RADIANS = (ROTATE_ANGLE_DEGREES * Math.PI) / 180
const COSINE_SKEW_ANGLE = Math.cos(SKEW_ANGLE_RADIANS)
const STACK_SEPARATION_MM = 20

export interface LabwareStackRenderProps {
  /** Labware definitions in stack to render */
  definitionTop: LabwareDefinition2
  /** option to highlight well labels with specified color */
  highlightedWellLabels?: HighlightedWellLabels
  /** highlight top labware */
  highlightTop: boolean
  /** highlight bottom labware if it exists */
  highlightBottom: boolean
  gRef?: RefObject<SVGGElement>
  definitionBottom?: LabwareDefinition2 | null
  shouldRotateAdapterOrientation?: boolean
  /** option to show well labels inside or outside of labware outline */
  wellLabelOption?: WellLabelOption
}

// calculate overall height for viewbox
const getLabwareFaceHeightIso = (definition: LabwareDefinition2): number => {
  const { xDimension, yDimension } = definition.dimensions
  return Math.round(
    xDimension * Math.sin(SKEW_ANGLE_RADIANS) +
      (yDimension / Math.cos(SKEW_ANGLE_RADIANS)) *
        Math.cos(SKEW_ANGLE_RADIANS + ROTATE_ANGLE_RADIANS)
  )
}

const getLabwareHeightIso = (definition: LabwareDefinition2): number => {
  const { zDimension } = definition.dimensions
  return Math.round(getLabwareFaceHeightIso(definition) + zDimension)
}

const getXMinForViewbox = (definition: LabwareDefinition2): number => {
  const { yDimension } = definition.dimensions
  return Math.round(
    (yDimension / Math.cos(SKEW_ANGLE_RADIANS)) *
      Math.cos(Math.PI / 2 - (SKEW_ANGLE_RADIANS + ROTATE_ANGLE_RADIANS))
  )
}

const getLabwareWidthIso = (definition: LabwareDefinition2): number => {
  const { xDimension } = definition.dimensions
  return (
    getXMinForViewbox(definition) + xDimension * Math.cos(ROTATE_ANGLE_RADIANS)
  )
}

export const LabwareStackRender = (
  props: LabwareStackRenderProps
): JSX.Element => {
  const {
    gRef,
    definitionTop,
    definitionBottom,
    highlightTop,
    wellLabelOption,
    shouldRotateAdapterOrientation,
    highlightBottom = false,
  } = props

  const labwareLoadNameTop = definitionTop.parameters.loadName
  const fillColorTop = highlightTop ? HIGHLIGHT_COLOR : COLORS.white
  const fillColorBottom = highlightBottom ? HIGHLIGHT_COLOR : COLORS.white

  // only one labware (top)
  if (
    definitionBottom == null ||
    definitionBottom.parameters.loadName === 'opentrons_flex_96_tiprack_adapter'
  ) {
    const { xDimension, yDimension } = definitionTop.dimensions
    const isTopAdapter = labwareAdapterLoadNames.includes(
      definitionTop.parameters.loadName
    )

    return isTopAdapter ? (
      // adapter render
      <Svg
        viewBox={`0 0 ${xDimension} ${yDimension}`}
        transform={
          shouldRotateAdapterOrientation
            ? `rotate(180, ${xDimension / 2}, ${yDimension / 2})`
            : 'rotate(0, 0, 0)'
        }
        maxWidth="100%"
        maxHeight="100%"
      >
        <LabwareAdapter
          labwareLoadName={labwareLoadNameTop as LabwareAdapterLoadName}
        />
      </Svg>
    ) : (
      // isometric view of labware
      <Svg
        viewBox={`-${getXMinForViewbox(definitionTop)} -${
          definitionTop.dimensions.zDimension
        } ${getLabwareWidthIso(definitionTop)} ${
          getLabwareFaceHeightIso(definitionTop) +
          definitionTop.dimensions.zDimension
        }`}
        transform="scale(1, -1)"
        maxWidth="100%"
        maxHeight="100%"
      >
        <g
          transform={`rotate(${SKEW_ANGLE_DEGREES}) skewX(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
          ref={gRef}
          fill={fillColorTop}
        >
          <StaticLabware
            definition={definitionTop}
            fill={fillColorTop}
            showRadius={false}
          />
          {wellLabelOption != null &&
          definitionTop.metadata.displayCategory !== 'adapter' ? (
            <WellLabels
              definition={definitionTop}
              wellLabelOption={wellLabelOption}
              wellLabelColor={fillColorTop}
              highlightedWellLabels={props.highlightedWellLabels}
            />
          ) : null}
        </g>
        <rect
          width={definitionTop.dimensions.yDimension - STROKE_WIDTH}
          height={definitionTop.dimensions.zDimension - STROKE_WIDTH}
          transform={`rotate(180) skewY(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
          strokeWidth={STROKE_WIDTH}
          stroke={COLORS.black90}
          fill={fillColorTop}
        />
        <rect
          width={definitionTop.dimensions.xDimension - STROKE_WIDTH}
          height={definitionTop.dimensions.zDimension - STROKE_WIDTH}
          transform={`skewY(${SKEW_ANGLE_DEGREES}) scale(${
            COSINE_SKEW_ANGLE ** 2
          }, -${COSINE_SKEW_ANGLE}) `}
          strokeWidth={STROKE_WIDTH}
          stroke={COLORS.black90}
          fill={fillColorTop}
        />
      </Svg>
    )
  }

  const xMinForViewbox = Math.min(
    ...[definitionTop, definitionBottom].map(def => getXMinForViewbox(def))
  )

  const totalAssemblyHeight =
    getLabwareHeightIso(definitionTop) +
    STACK_SEPARATION_MM +
    definitionBottom.dimensions.zDimension

  return (
    <Svg
      viewBox={`-${xMinForViewbox} -${
        definitionBottom.dimensions.zDimension
      } ${getLabwareWidthIso(definitionTop)} ${totalAssemblyHeight}`}
      transform="scale(1, -1)"
      maxWidth="100%"
      maxHeight="100%"
    >
      {/* bottom labware/adapter */}
      {definitionBottom.parameters.loadName ===
      'opentrons_flex_96_tiprack_adapter' ? null : (
        <>
          <g
            transform={`rotate(${SKEW_ANGLE_DEGREES}) skewX(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
            ref={gRef}
            fill={fillColorBottom}
          >
            <StaticLabware
              definition={definitionBottom}
              fill={fillColorBottom}
              showRadius={false}
            />
            {wellLabelOption != null &&
            definitionBottom.metadata.displayCategory !== 'adapter' ? (
              <WellLabels
                definition={definitionTop}
                wellLabelOption={wellLabelOption}
                wellLabelColor={fillColorBottom}
                highlightedWellLabels={props.highlightedWellLabels}
              />
            ) : null}
          </g>
          <rect
            width={definitionBottom.dimensions.yDimension - STROKE_WIDTH}
            height={definitionBottom.dimensions.zDimension - STROKE_WIDTH}
            transform={`rotate(180) skewY(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
            strokeWidth={STROKE_WIDTH}
            stroke={COLORS.black90}
            fill={fillColorBottom}
          />
          <rect
            width={definitionBottom.dimensions.xDimension - STROKE_WIDTH}
            height={definitionBottom.dimensions.zDimension - STROKE_WIDTH}
            transform={`skewY(${SKEW_ANGLE_DEGREES}) scale(${
              COSINE_SKEW_ANGLE ** 2
            }, -${COSINE_SKEW_ANGLE}) `}
            strokeWidth={STROKE_WIDTH}
            stroke={COLORS.black90}
            fill={fillColorBottom}
          />
        </>
      )}
      {/* top labware/adapter */}
      <g
        transform={`translate(0, ${
          definitionTop.dimensions.zDimension + STACK_SEPARATION_MM
        }) rotate(${SKEW_ANGLE_DEGREES}) skewX(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
        ref={gRef}
      >
        <StaticLabware
          definition={definitionTop}
          fill={fillColorTop}
          showRadius={false}
        />
        {wellLabelOption != null &&
        definitionTop.metadata.displayCategory !== 'adapter' ? (
          <WellLabels
            definition={definitionTop}
            wellLabelOption={wellLabelOption}
            wellLabelColor={fillColorTop}
            highlightedWellLabels={props.highlightedWellLabels}
          />
        ) : null}
      </g>
      <rect
        width={definitionTop.dimensions.yDimension - STROKE_WIDTH}
        height={definitionTop.dimensions.zDimension - STROKE_WIDTH}
        transform={`translate(0, ${
          definitionTop.dimensions.zDimension + STACK_SEPARATION_MM
        }) rotate(180) skewY(-${SKEW_ANGLE_DEGREES}) scale(${COSINE_SKEW_ANGLE}, ${COSINE_SKEW_ANGLE})`}
        strokeWidth={STROKE_WIDTH}
        stroke={COLORS.black90}
        fill={fillColorTop}
      />
      <rect
        width={definitionTop.dimensions.xDimension - STROKE_WIDTH}
        height={definitionTop.dimensions.zDimension - STROKE_WIDTH}
        transform={`translate(0, ${
          definitionTop.dimensions.zDimension + STACK_SEPARATION_MM
        }) skewY(${SKEW_ANGLE_DEGREES}) scale(${
          COSINE_SKEW_ANGLE ** 2
        } , -${COSINE_SKEW_ANGLE}) `}
        strokeWidth={STROKE_WIDTH}
        stroke={COLORS.black90}
        fill={fillColorTop}
      />
    </Svg>
  )
}
