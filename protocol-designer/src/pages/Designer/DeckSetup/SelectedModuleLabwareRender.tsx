import { LabwareOnDeck as LabwareOnDeckComponent } from '../../../organisms'
import { LabwareRenderOnDeck } from './LabwareRenderOnDeck'
import type { LabwareDefinition2, ModuleModel } from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../../step-forms'

interface SelectedModuleLabwareRenderProps {
  nestedLabwareDef: LabwareDefinition2 | null
  labwareDef: LabwareDefinition2 | null
  moduleModel: ModuleModel | null
  hoveredLabware: string | null
  hoveredLabwareDef: LabwareDefinition2 | null
  labwareOnDeck?: LabwareOnDeck
  nestedLabwareOnDeck?: LabwareOnDeck
}
export function SelectedModuleLabwareRender(
  props: SelectedModuleLabwareRenderProps
): JSX.Element | null {
  const {
    labwareOnDeck,
    labwareDef,
    moduleModel,
    hoveredLabware,
    nestedLabwareDef,
    nestedLabwareOnDeck,
    hoveredLabwareDef,
  } = props
  return (
    <>
      {labwareDef != null && moduleModel != null && hoveredLabware == null ? (
        <LabwareRenderOnDeck labwareDef={labwareDef} x={0} y={0} />
      ) : null}
      {labwareOnDeck != null &&
      moduleModel != null &&
      hoveredLabware == null ? (
        <LabwareOnDeckComponent labwareOnDeck={labwareOnDeck} x={0} y={0} />
      ) : null}
      {nestedLabwareDef != null &&
      moduleModel != null &&
      hoveredLabware == null ? (
        <LabwareRenderOnDeck labwareDef={nestedLabwareDef} x={0} y={0} />
      ) : null}
      {nestedLabwareOnDeck != null &&
      moduleModel != null &&
      hoveredLabware == null ? (
        <LabwareOnDeckComponent
          labwareOnDeck={nestedLabwareOnDeck}
          x={0}
          y={0}
        />
      ) : null}
      {hoveredLabwareDef != null && moduleModel != null ? (
        <LabwareRenderOnDeck labwareDef={hoveredLabwareDef} x={0} y={0} />
      ) : null}
    </>
  )
}
