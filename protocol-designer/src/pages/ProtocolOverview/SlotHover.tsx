import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Flex,
  JUSTIFY_CENTER,
  RobotCoordsForeignObject,
  SPACING,
} from '@opentrons/components'
import {
  getCutoutIdForAddressableArea,
  getDeckDefFromRobotType,
  THERMOCYCLER_MODULE_TYPE,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import type {
  CoordinateTuple,
  DeckSlotId,
  AddressableAreaName,
  RobotType,
} from '@opentrons/shared-data'

import type { Dispatch, SetStateAction } from 'react'

interface SlotHoverProps {
  hover: string | null
  setHover: Dispatch<SetStateAction<string | null>>
  slotId: DeckSlotId
  slotPosition: CoordinateTuple | null
  robotType: RobotType
}
const FOURTH_COLUMN_SLOTS = ['A4', 'B4', 'C4', 'D4']

export function SlotHover(props: SlotHoverProps): JSX.Element | null {
  const { hover, setHover, slotId, slotPosition, robotType } = props
  const deckSetup = useSelector(getInitialDeckSetup)
  const { additionalEquipmentOnDeck, modules } = deckSetup
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [])
  const hasTCOnSlot = Object.values(modules).find(
    module => module.slot === slotId && module.type === THERMOCYCLER_MODULE_TYPE
  )
  const tcSlots = robotType === FLEX_ROBOT_TYPE ? ['A1'] : ['8', '10', '11']
  const stagingAreaLocations = Object.values(additionalEquipmentOnDeck)
    .filter(ae => ae.name === 'stagingArea')
    ?.map(ae => ae.location as string)

  const cutoutId =
    getCutoutIdForAddressableArea(
      slotId as AddressableAreaName,
      deckDef.cutoutFixtures
    ) ?? 'cutoutD1'

  //  return null for TC slots
  if (slotPosition === null || (hasTCOnSlot && tcSlots.includes(slotId)))
    return null

  const hoverOpacity = hover != null && hover === slotId ? '1' : '0'
  const slotFill = (
    <Flex
      alignItems={ALIGN_CENTER}
      backgroundColor={`${COLORS.black90}cc`}
      borderRadius={BORDERS.borderRadius4}
      color={COLORS.white}
      gridGap={SPACING.spacing8}
      justifyContent={JUSTIFY_CENTER}
      width="100%"
    />
  )

  if (robotType === FLEX_ROBOT_TYPE) {
    const hasStagingArea = stagingAreaLocations.includes(cutoutId)

    const X_ADJUSTMENT_LEFT_SIDE = -101.5
    const X_ADJUSTMENT = -17
    const X_DIMENSION_MIDDLE_SLOTS = 160.3
    const X_DIMENSION_OUTER_SLOTS = hasStagingArea ? 160.0 : 246.5
    const X_DIMENSION_4TH_COLUMN_SLOTS = 175.0
    const Y_DIMENSION = hasTCOnSlot ? 294.0 : 106.0

    const slotFromCutout = slotId
    const isLeftSideofDeck =
      slotFromCutout === 'A1' ||
      slotFromCutout === 'B1' ||
      slotFromCutout === 'C1' ||
      slotFromCutout === 'D1'
    const xAdjustment = isLeftSideofDeck ? X_ADJUSTMENT_LEFT_SIDE : X_ADJUSTMENT
    const x = slotPosition[0] + xAdjustment

    const yAdjustment = -10
    const y = slotPosition[1] + yAdjustment

    const isMiddleOfDeck =
      slotId === 'A2' || slotId === 'B2' || slotId === 'C2' || slotId === 'D2'

    let xDimension = X_DIMENSION_OUTER_SLOTS
    if (isMiddleOfDeck) {
      xDimension = X_DIMENSION_MIDDLE_SLOTS
    } else if (FOURTH_COLUMN_SLOTS.includes(slotId)) {
      xDimension = X_DIMENSION_4TH_COLUMN_SLOTS
    }
    const yDimension = Y_DIMENSION

    return (
      <RobotCoordsForeignObject
        key="flex_hover"
        width={xDimension}
        height={yDimension}
        x={hasTCOnSlot ? x + 20 : x}
        y={hasTCOnSlot ? y - 70 : y}
        flexProps={{ flex: '1' }}
        foreignObjectProps={{
          opacity: hoverOpacity,
          flex: '1',
          onMouseEnter: () => {
            setHover(slotId)
          },
          onMouseLeave: () => {
            setHover(null)
          },
        }}
      >
        {slotFill}
      </RobotCoordsForeignObject>
    )
  } else {
    const y = slotPosition[1]
    const x = slotPosition[0]

    return (
      <RobotCoordsForeignObject
        key="ot2_hover"
        width={hasTCOnSlot ? 260 : 128}
        height={hasTCOnSlot ? 178 : 85}
        x={x}
        y={hasTCOnSlot ? y - 72 : y}
        flexProps={{ flex: '1' }}
        foreignObjectProps={{
          opacity: hoverOpacity,
          flex: '1',
          onMouseEnter: () => {
            setHover(slotId)
          },
          onMouseLeave: () => {
            setHover(null)
          },
        }}
      >
        {slotFill}
      </RobotCoordsForeignObject>
    )
  }
}
