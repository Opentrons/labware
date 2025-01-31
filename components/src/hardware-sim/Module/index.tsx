import {
  ABSORBANCE_READER_TYPE,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_MODULE_TYPE,
  OT2_STANDARD_DECKID,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import {
  C_DARK_GRAY,
  C_MED_LIGHT_GRAY,
  SPACING_1,
  JUSTIFY_CENTER,
  DISPLAY_FLEX,
  FONT_WEIGHT_SEMIBOLD,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
} from '../../styles'
import { RobotCoordsForeignObject } from '../Deck'
import { multiplyMatrices } from '../utils'
import { Thermocycler } from './Thermocycler'
import { HeaterShaker } from './HeaterShaker'
import { Temperature } from './Temperature'
import { MagneticBlock } from './MagneticBlock'
import { MagneticModule } from './MagneticModule'
import { PlateReader } from './PlateReader'

import type { ComponentProps, ReactNode } from 'react'
import type {
  ModuleDefinition,
  ThermocyclerModuleModel,
} from '@opentrons/shared-data'

export * from './Thermocycler'

const LABWARE_OFFSET_DISPLAY_THRESHOLD = 2

interface Props {
  x: number
  y: number
  def: ModuleDefinition
  orientation?: 'left' | 'right'
  innerProps?:
    | ComponentProps<typeof Thermocycler>
    | ComponentProps<typeof HeaterShaker>
    | ComponentProps<typeof Temperature>
    | {}
  statusInfo?: ReactNode // contents of small status rectangle, not displayed if absent
  children?: ReactNode // contents to be rendered on top of the labware mating surface of the module
  targetSlotId?: string
  targetDeckId?: string
}

const statusInfoWrapperProps = {
  display: DISPLAY_FLEX,
  alignItems: ALIGN_CENTER,
}
const statusInfoFlexProps = {
  flexDirection: DIRECTION_COLUMN,
  justifyContent: JUSTIFY_CENTER,
  backgroundColor: C_MED_LIGHT_GRAY,
  padding: SPACING_1,
  fontSize: '0.5rem', // NOTE: this text is rendered into an SVG foreignObject, so sizing is non-standard
  fontWeight: FONT_WEIGHT_SEMIBOLD,
  paddingBottom: SPACING_1,
}

export const Module = (props: Props): JSX.Element => {
  const {
    def,
    x,
    y,
    orientation = 'left',
    innerProps = {},
    statusInfo,
    children,
    targetSlotId,
    targetDeckId = OT2_STANDARD_DECKID,
  } = props
  const moduleType = getModuleType(def.model)

  const { x: labwareOffsetX, y: labwareOffsetY } = def.labwareOffset
  const {
    x: translateX,
    y: translateY,
    z: translateZ,
  } = def.cornerOffsetFromSlot
  const {
    xDimension,
    yDimension,
    footprintXDimension,
    footprintYDimension,
    labwareInterfaceXDimension,
    labwareInterfaceYDimension,
  } = def.dimensions

  // apply translation to position module in viewport
  const positionTransform = `translate(${x}, ${y})`

  // apply translation to compensate for the offset of the overall module's
  // left-bottom-front corner, from the footprint's left-bottom-front corner (slot interface)
  let offsetTransform = `translate(${translateX}, ${translateY})`

  let nestedLabwareOffsetX = labwareOffsetX
  let nestedLabwareOffsetY = labwareOffsetY

  // additional transforms to apply to vectors in certain deck/slot combinations
  const transformsForDeckBySlot = def?.slotTransforms?.[targetDeckId]
  const slotTransformsForDeckSlot =
    targetSlotId != null &&
    transformsForDeckBySlot != null &&
    targetSlotId in transformsForDeckBySlot
      ? transformsForDeckBySlot[targetSlotId]
      : null
  const deckSpecificTransforms = slotTransformsForDeckSlot ?? {}
  if (deckSpecificTransforms?.cornerOffsetFromSlot != null) {
    const [
      [slotTranslateX],
      [slotTranslateY],
    ] = multiplyMatrices(deckSpecificTransforms.cornerOffsetFromSlot, [
      [translateX],
      [translateY],
      [translateZ],
      [1],
    ])
    offsetTransform = `translate(${slotTranslateX}, ${slotTranslateY})`
  }
  if (deckSpecificTransforms?.labwareOffset != null) {
    const [
      [slotLabwareOffsetX],
      [slotLabwareOffsetY],
    ] = multiplyMatrices(deckSpecificTransforms.labwareOffset, [
      [labwareOffsetX],
      [labwareOffsetY],
      [1],
      [1],
    ])
    nestedLabwareOffsetX = slotLabwareOffsetX
    nestedLabwareOffsetY = slotLabwareOffsetY
  }

  // find coordinates of center of footprint, fallback to overall center if not defined
  const rotationCenterX = (footprintXDimension ?? xDimension) / 2
  const rotationCenterY = (footprintYDimension ?? yDimension) / 2

  const orientationTransform =
    orientation === 'left' || moduleType === ABSORBANCE_READER_TYPE
      ? 'rotate(0, 0, 0)'
      : `rotate(180, ${rotationCenterX}, ${rotationCenterY})`

  // labwareOffset values are more accurate than our SVG renderings, so ignore any deviations under a certain threshold
  const clampedLabwareOffsetX =
    Math.abs(nestedLabwareOffsetX) > LABWARE_OFFSET_DISPLAY_THRESHOLD
      ? nestedLabwareOffsetX
      : 0
  const clampedLabwareOffsetY =
    Math.abs(nestedLabwareOffsetY) > LABWARE_OFFSET_DISPLAY_THRESHOLD
      ? nestedLabwareOffsetY
      : 0
  // transform to be applied to children which render within the labware interfacing surface of the module
  const childrenTransform = `translate(${clampedLabwareOffsetX}, ${clampedLabwareOffsetY})`

  const renderStatusInfo = (): JSX.Element | null => {
    if (statusInfo == null) return null
    const statusWidth = (labwareInterfaceXDimension ?? xDimension) / 2
    return (
      <RobotCoordsForeignObject
        x={
          orientation === 'left'
            ? labwareOffsetX - statusWidth
            : labwareOffsetX + (labwareInterfaceXDimension ?? xDimension)
        }
        y={labwareOffsetY}
        height={labwareInterfaceYDimension ?? yDimension}
        width={statusWidth}
        foreignObjectProps={statusInfoWrapperProps}
        flexProps={statusInfoFlexProps}
      >
        {statusInfo}
      </RobotCoordsForeignObject>
    )
  }

  let moduleViz: JSX.Element | null = null
  if (moduleType === MAGNETIC_BLOCK_TYPE) {
    moduleViz = <MagneticBlock />
  } else if (moduleType === MAGNETIC_MODULE_TYPE) {
    moduleViz = <MagneticModule />
  } else if (moduleType === THERMOCYCLER_MODULE_TYPE) {
    const thermocyclerProps = {
      lidMotorState: 'open' as const,
      ...innerProps,
      model: def.model as ThermocyclerModuleModel,
    }

    moduleViz = <Thermocycler {...thermocyclerProps} />
  } else if (moduleType === HEATERSHAKER_MODULE_TYPE) {
    moduleViz = (
      <HeaterShaker {...(innerProps as ComponentProps<typeof HeaterShaker>)} />
    )
  } else if (moduleType === TEMPERATURE_MODULE_TYPE) {
    moduleViz = (
      <Temperature {...(innerProps as ComponentProps<typeof Temperature>)} />
    )
  } else if (moduleType === ABSORBANCE_READER_TYPE) {
    moduleViz = <PlateReader />
  }
  return (
    <g transform={positionTransform} data-test={`Module_${moduleType}`}>
      <g transform={orientationTransform}>
        <g transform={offsetTransform} style={{ fill: C_DARK_GRAY }}>
          {moduleViz}
        </g>
      </g>
      {renderStatusInfo()}
      {children != null ? (
        <g transform={childrenTransform}>{children}</g>
      ) : null}
    </g>
  )
}
