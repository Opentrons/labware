import {
  getPositionFromSlotId,
  OT2_ROBOT_TYPE,
  ot2DeckDefV5,
} from '@opentrons/shared-data'

import { SlotBase } from '../BaseDeck/SlotBase'

import type { SVGProps } from 'react'
import type {
  DeckDefinition,
  DeckSlot,
  RobotType,
} from '@opentrons/shared-data'

interface LegacyDeckSlotLocationProps extends SVGProps<SVGGElement> {
  robotType: RobotType
  slotName: DeckSlot['id']
  slotBaseColor?: SVGProps<SVGPathElement>['fill']
  slotClipColor?: SVGProps<SVGPathElement>['stroke']
}

type AddressableAreaFromDeckDef = typeof ot2DeckDefV5.locations.addressableAreas[number]

// dimensions of the OT-2 fixed trash, not in deck definition
export const OT2_FIXED_TRASH_X_DIMENSION = 172.86
export const OT2_FIXED_TRASH_Y_DIMENSION = 165.86

/**
 * This is a legacy component for rendering an OT-2 deck slot by reference to the V4 deck definition
 */
export function LegacyDeckSlotLocation(
  props: LegacyDeckSlotLocationProps
): JSX.Element | null {
  const {
    robotType,
    slotName,
    slotBaseColor,
    slotClipColor,
    ...restProps
  } = props

  if (robotType !== OT2_ROBOT_TYPE) return null

  const slotDef = ot2DeckDefV5.locations.addressableAreas.find(
    (s: AddressableAreaFromDeckDef) => s.id === slotName
  )
  if (slotDef == null) {
    console.warn(
      `cannot render DeckSlotLocation, no deck slot named: ${slotName} in OT-2 deck definition`
    )
    return null
  }

  const slotPosition = getPositionFromSlotId(
    slotName,
    (ot2DeckDefV5 as unknown) as DeckDefinition
  )

  const isFixedTrash = slotName === 'fixedTrash'

  const [xPosition, yPosition] = slotPosition ?? [0, 0]
  const { xDimension, yDimension } = isFixedTrash
    ? {
        xDimension: OT2_FIXED_TRASH_X_DIMENSION,
        yDimension: OT2_FIXED_TRASH_Y_DIMENSION,
      }
    : slotDef.boundingBox
  const [xOffset, yOffset] = slotDef.offsetFromCutoutFixture

  // adjust the fixed trash position and dimension to fit inside deck SVG
  const fixedTrashPositionAdjustment = isFixedTrash ? 7 : 0
  const fixedTrashDimensionAdjustment = isFixedTrash ? -9 : 0

  const adjustedXPosition = xPosition + fixedTrashPositionAdjustment - xOffset
  const adjustedYPosition = yPosition + fixedTrashPositionAdjustment - yOffset
  const adjustedXDimension = xDimension + fixedTrashDimensionAdjustment
  const adjustedYDimension = yDimension + fixedTrashDimensionAdjustment

  return (
    <g {...restProps}>
      <SlotBase
        fill={slotBaseColor}
        d={`M${adjustedXPosition},${adjustedYPosition}h${adjustedXDimension}v${adjustedYDimension}h${-adjustedXDimension}v${-adjustedYDimension}z`}
      />
    </g>
  )
}
