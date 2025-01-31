import { LabwareOnDeck as LabwareOnDeckComponent } from '../../../organisms'
import { LabwareLabel } from '../LabwareLabel'
import { LabwareRenderOnDeck } from './LabwareRenderOnDeck'
import type { DeckLabelProps } from '@opentrons/components'
import type {
  CoordinateTuple,
  LabwareDefinition2,
  ModuleModel,
} from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../../step-forms'

interface SelectedLabwareRenderProps {
  labwareDef: LabwareDefinition2 | null
  slotPosition: CoordinateTuple | null
  moduleModel: ModuleModel | null
  hoveredLabware: string | null
  labwareOnDeck?: LabwareOnDeck
  nestedLabwareInfo?: DeckLabelProps[] | undefined
}
export function SelectedLabwareRender(
  props: SelectedLabwareRenderProps
): JSX.Element | null {
  const {
    labwareOnDeck,
    labwareDef,
    slotPosition,
    moduleModel,
    hoveredLabware,
    nestedLabwareInfo,
  } = props

  return (labwareOnDeck != null || labwareDef != null) &&
    slotPosition != null &&
    moduleModel == null &&
    hoveredLabware == null ? (
    <>
      {labwareDef != null ? (
        <LabwareRenderOnDeck
          labwareDef={labwareDef}
          x={slotPosition[0]}
          y={slotPosition[1]}
        />
      ) : null}
      {labwareOnDeck != null ? (
        <LabwareOnDeckComponent
          x={slotPosition[0]}
          y={slotPosition[1]}
          labwareOnDeck={labwareOnDeck}
        />
      ) : null}
      {labwareDef != null ? (
        <LabwareLabel
          isLast={true}
          isSelected={true}
          labwareDef={labwareDef}
          position={slotPosition}
          nestedLabwareInfo={nestedLabwareInfo}
        />
      ) : null}
    </>
  ) : null
}
