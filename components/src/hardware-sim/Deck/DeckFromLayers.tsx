import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  FixedBase,
  FixedTrash,
  DoorStops,
  MetalFrame,
  RemovableDeckOutline,
  SlotRidges,
  SlotNumbers,
  CalibrationMarkings,
  RemovalHandle,
  ScrewHoles,
} from './OT2Layers'
import { ALL_OT2_DECK_LAYERS } from './constants'

import type { RobotType } from '@opentrons/shared-data'

export * from './OT2Layers'

export interface DeckFromLayersProps {
  robotType: RobotType
  layerBlocklist: string[]
}

const OT2_LAYER_MAP: {
  [layer in typeof ALL_OT2_DECK_LAYERS[number]]: () => JSX.Element
} = {
  fixedBase: () => <FixedBase />,
  fixedTrash: () => <FixedTrash />,
  doorStops: () => <DoorStops />,
  metalFrame: () => <MetalFrame />,
  removableDeckOutline: () => <RemovableDeckOutline />,
  slotRidges: () => <SlotRidges />,
  slotNumbers: () => <SlotNumbers />,
  calibrationMarkings: () => <CalibrationMarkings />,
  removalHandle: () => <RemovalHandle />,
  screwHoles: () => <ScrewHoles />,
}

/**
 * a component that renders an OT-2 deck from the V3 deck definition layers property
 * takes a robot type prop to protect against an attempted Flex render
 */
export function DeckFromLayers(props: DeckFromLayersProps): JSX.Element | null {
  const { robotType, layerBlocklist = [] } = props

  // early return null if not OT-2
  if (robotType !== OT2_ROBOT_TYPE) return null

  return (
    <g id="deckLayers">
      {ALL_OT2_DECK_LAYERS.filter(layer => !layerBlocklist.includes(layer)).map(
        layer => {
          const LayerComponent = OT2_LAYER_MAP[layer]
          return <LayerComponent key={layer} />
        }
      )}
    </g>
  )
}
