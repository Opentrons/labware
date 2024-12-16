import { useRef, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { DeckLabelSet } from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  getModuleDef2,
} from '@opentrons/shared-data'
import { getRobotType } from '../../../file-data/selectors'
import type { DeckLabelProps } from '@opentrons/components'
import type { CoordinateTuple, ModuleModel } from '@opentrons/shared-data'

interface ModuleLabelProps {
  moduleModel: ModuleModel
  position: CoordinateTuple
  orientation: 'left' | 'right'
  isSelected: boolean
  isLast: boolean
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
  const overhang =
    def?.dimensions.labwareInterfaceXDimension != null
      ? def.dimensions.xDimension - def?.dimensions.labwareInterfaceXDimension
      : 0
  //  TODO(ja 9/6/24): definitely need to refine these overhang values
  let leftOverhang = overhang
  if (def?.moduleType === TEMPERATURE_MODULE_TYPE) {
    leftOverhang = overhang * 2
  } else if (def?.moduleType === HEATERSHAKER_MODULE_TYPE) {
    leftOverhang = overhang + 14
  } else if (def?.moduleType === MAGNETIC_MODULE_TYPE) {
    leftOverhang = overhang + 8
  } else if (
    def?.moduleType === THERMOCYCLER_MODULE_TYPE &&
    !isZoomed &&
    robotType === FLEX_ROBOT_TYPE
  ) {
    leftOverhang = overhang + 20
  }

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
        (orientation === 'right'
          ? position[0] - overhang
          : position[0] - leftOverhang) - def?.cornerOffsetFromSlot.x
      }
      y={position[1] + def?.cornerOffsetFromSlot.y - labelContainerHeight}
      width={def?.dimensions.xDimension + 2}
      height={def?.dimensions.yDimension + 2}
    />
  )
}
