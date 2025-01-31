import { useSelector } from 'react-redux'
import { Module } from '@opentrons/components'
import {
  getModuleDef2,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'
import { selectors } from '../../../labware-ingred/selectors'
import { getOnlyLatestDefs } from '../../../labware-defs'
import { getCustomLabwareDefsByURI } from '../../../labware-defs/selectors'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { ModuleLabel } from './ModuleLabel'
import { FixtureRender } from './FixtureRender'
import { SelectedLabwareRender } from './SelectedLabwareRender'
import { SelectedModuleLabwareRender } from './SelectedModuleLabwareRender'
import type {
  CoordinateTuple,
  DeckDefinition,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { DeckLabelProps } from '@opentrons/components'
import type { Fixture } from './constants'

interface SelectedHoveredItemsProps {
  deckDef: DeckDefinition
  robotType: RobotType
  hoveredLabware: string | null
  hoveredModule: ModuleModel | null
  hoveredFixture: Fixture | null
  slotPosition: CoordinateTuple | null
}
export const SelectedHoveredItems = (
  props: SelectedHoveredItemsProps
): JSX.Element => {
  const {
    deckDef,
    robotType,
    hoveredFixture,
    hoveredModule,
    hoveredLabware,
    slotPosition,
  } = props
  const selectedSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const {
    selectedSlot,
    selectedFixture,
    selectedLabwareDefUri,
    selectedModuleModel,
    selectedNestedLabwareDefUri,
  } = selectedSlotInfo
  const customLabwareDefs = useSelector(getCustomLabwareDefsByURI)
  const defs = getOnlyLatestDefs()
  const deckSetup = useSelector(getInitialDeckSetup)
  const { labware, modules } = deckSetup
  const matchingSelectedLabwareOnDeck = Object.values(labware).find(labware => {
    const moduleUnderLabware = Object.values(modules).find(
      mod => mod.id === labware.slot
    )
    const matchingSlot =
      moduleUnderLabware != null ? moduleUnderLabware.slot : labware.slot
    return (
      matchingSlot === selectedSlot.slot &&
      labware.labwareDefURI === selectedLabwareDefUri
    )
  })
  const matchingSelectedNestedLabwareOnDeck = Object.values(labware).find(
    lw => {
      const adapterUnderLabware = Object.values(labware).find(
        lab => lab.id === lw.slot
      )
      if (adapterUnderLabware == null) {
        return
      }
      const moduleUnderLabware = Object.values(modules).find(
        mod => mod.id === adapterUnderLabware.slot
      )
      const matchingSlot =
        moduleUnderLabware != null
          ? moduleUnderLabware.slot
          : adapterUnderLabware.slot
      return (
        lw.labwareDefURI === selectedNestedLabwareDefUri &&
        matchingSlot === selectedSlot.slot
      )
    }
  )
  const selectedLabwareDef =
    selectedLabwareDefUri != null
      ? defs[selectedLabwareDefUri] ?? customLabwareDefs[selectedLabwareDefUri]
      : null
  const selectedNestedLabwareDef =
    selectedNestedLabwareDefUri != null
      ? defs[selectedNestedLabwareDefUri] ??
        customLabwareDefs[selectedNestedLabwareDefUri]
      : null
  const hoveredLabwareDef =
    hoveredLabware != null
      ? defs[hoveredLabware] ?? customLabwareDefs[hoveredLabware] ?? null
      : null

  const orientation =
    slotPosition != null
      ? inferModuleOrientationFromXCoordinate(slotPosition[0])
      : null

  const labwareInfos: DeckLabelProps[] = []

  if (
    selectedLabwareDefUri != null &&
    (hoveredLabware == null || hoveredLabware !== selectedLabwareDefUri)
  ) {
    const def =
      defs[selectedLabwareDefUri] ?? customLabwareDefs[selectedLabwareDefUri]
    const selectedLabwareLabel = {
      text: def.metadata.displayName,
      isSelected: true,
      isLast: hoveredLabware == null && selectedNestedLabwareDefUri == null,
      isZoomed: true,
    }
    labwareInfos.push(selectedLabwareLabel)
  }
  if (selectedNestedLabwareDef != null && hoveredLabware == null) {
    const selectedNestedLabwareLabel = {
      text: selectedNestedLabwareDef.metadata.displayName,
      isSelected: true,
      isLast: hoveredLabware == null,
      isZoomed: true,
    }
    labwareInfos.push(selectedNestedLabwareLabel)
  }
  if (
    (hoveredLabware != null ||
      selectedLabwareDefUri === hoveredLabware ||
      selectedNestedLabwareDefUri === hoveredLabware) &&
    hoveredLabwareDef != null
  ) {
    const hoverLabelLabel = {
      text: hoveredLabwareDef.metadata.displayName,
      isSelected: false,
      isLast: true,
      isZoomed: true,
    }
    labwareInfos.push(hoverLabelLabel)
  }

  return (
    <>
      {selectedFixture != null &&
      selectedSlot.cutout != null &&
      hoveredFixture == null &&
      hoveredModule == null ? (
        <FixtureRender
          fixture={selectedFixture}
          cutout={selectedSlot.cutout}
          robotType={robotType}
          deckDef={deckDef}
        />
      ) : null}
      {selectedModuleModel != null &&
      slotPosition != null &&
      hoveredModule == null &&
      hoveredFixture == null &&
      orientation != null ? (
        <>
          <Module
            key={`${selectedModuleModel}_${selectedSlot.slot}_selected`}
            x={slotPosition[0]}
            y={slotPosition[1]}
            def={getModuleDef2(selectedModuleModel)}
            orientation={orientation}
          >
            <>
              <SelectedModuleLabwareRender
                nestedLabwareDef={selectedNestedLabwareDef}
                labwareOnDeck={matchingSelectedLabwareOnDeck}
                labwareDef={selectedLabwareDef}
                moduleModel={selectedModuleModel}
                hoveredLabware={hoveredLabware}
                hoveredLabwareDef={hoveredLabwareDef}
              />
            </>
          </Module>
          {selectedModuleModel != null ? (
            <ModuleLabel
              isLast={hoveredLabware == null && selectedLabwareDefUri == null}
              moduleModel={selectedModuleModel}
              position={slotPosition}
              orientation={orientation}
              isSelected={true}
              labwareInfos={labwareInfos}
              slot={selectedSlot.slot}
            />
          ) : null}
        </>
      ) : null}
      <SelectedLabwareRender
        labwareOnDeck={matchingSelectedLabwareOnDeck}
        labwareDef={selectedLabwareDef}
        slotPosition={slotPosition}
        moduleModel={selectedModuleModel}
        hoveredLabware={hoveredLabware}
      />
      <SelectedLabwareRender
        labwareOnDeck={matchingSelectedNestedLabwareOnDeck}
        labwareDef={selectedNestedLabwareDef}
        slotPosition={slotPosition}
        moduleModel={selectedModuleModel}
        hoveredLabware={hoveredLabware}
        nestedLabwareInfo={[
          {
            text:
              selectedNestedLabwareDef?.metadata.displayName ?? 'unknown name',
            isSelected: true,
            isLast: true,
            isZoomed: true,
          },
        ]}
      />
    </>
  )
}
