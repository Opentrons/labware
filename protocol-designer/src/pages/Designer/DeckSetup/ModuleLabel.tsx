import { useRef, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { DeckLabelSet } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  FLEX_STANDARD_DECKID,
  HEATERSHAKER_MODULE_TYPE,
  OT2_STANDARD_DECKID,
  TEMPERATURE_MODULE_TYPE,
  getModuleDef2,
} from '@opentrons/shared-data'
import { getRobotType } from '../../../file-data/selectors'
import type { DeckLabelProps } from '@opentrons/components'
import type {
  CoordinateTuple,
  DeckSlotId,
  ModuleModel,
} from '@opentrons/shared-data'

interface ModuleLabelProps {
  moduleModel: ModuleModel
  position: CoordinateTuple
  orientation: 'left' | 'right'
  isSelected: boolean
  isLast: boolean
  slot: DeckSlotId | null
  isZoomed?: boolean
  labwareInfos?: DeckLabelProps[]
  labelName?: string
}
export const ModuleLabel = (props: ModuleLabelProps): JSX.Element => {
  const {
    moduleModel,
    position,
    orientation,
    isSelected,
    isLast,
    labwareInfos = [],
    isZoomed = true,
    labelName,
    slot,
  } = props
  const robotType = useSelector(getRobotType)
  const labelContainerRef = useRef<HTMLDivElement>(null)
  const [labelContainerHeight, setLabelContainerHeight] = useState(12)

  useEffect(() => {
    if (labelContainerRef.current) {
      setLabelContainerHeight(labelContainerRef.current.offsetHeight)
    }
  }, [labwareInfos])

  const def = getModuleDef2(moduleModel)
  const slotTransformKey =
    robotType === FLEX_ROBOT_TYPE ? FLEX_STANDARD_DECKID : OT2_STANDARD_DECKID
  const cornerOffsetsFromSlotFromTransform =
    slot != null && !isZoomed
      ? def?.slotTransforms?.[slotTransformKey]?.[slot]?.cornerOffsetFromSlot
      : null
  const tempAdjustmentX =
    def?.moduleType === TEMPERATURE_MODULE_TYPE && orientation === 'right'
      ? def?.dimensions.xDimension - (def?.dimensions.footprintXDimension ?? 0) // shift depending on side of deck
      : 0
  const tempAdjustmentY = def?.moduleType === TEMPERATURE_MODULE_TYPE ? -1 : 0
  const heaterShakerAdjustmentX =
    def?.moduleType === HEATERSHAKER_MODULE_TYPE && orientation === 'right' // shift depending on side of deck
      ? 7 // TODO(ND: 12/18/2024): investigate further why the module definition does not contain sufficient info to find this offset
      : 0

  return (
    <DeckLabelSet
      ref={labelContainerRef}
      deckLabels={[
        {
          text: labelName ?? def?.displayName,
          isSelected,
          isLast,
          moduleModel: def?.model,
          isZoomed: isZoomed,
        },
        ...labwareInfos,
      ]}
      x={
        position[0] +
        def.cornerOffsetFromSlot.x +
        (cornerOffsetsFromSlotFromTransform?.[0][3] ?? 0) +
        tempAdjustmentX +
        heaterShakerAdjustmentX -
        1
      }
      y={
        position[1] +
        def.cornerOffsetFromSlot.y +
        (cornerOffsetsFromSlotFromTransform?.[1][3] ?? 0) -
        labelContainerHeight +
        tempAdjustmentY
      }
      width={def?.dimensions.xDimension + 2}
      height={def?.dimensions.yDimension + 2}
    />
  )
}
