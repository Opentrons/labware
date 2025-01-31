import { Fragment } from 'react'
import { useSelector } from 'react-redux'
import { LabwareRender, Module } from '@opentrons/components'
import {
  getModuleDef2,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'
import { selectors } from '../../../labware-ingred/selectors'
import { getOnlyLatestDefs } from '../../../labware-defs'
import { getCustomLabwareDefsByURI } from '../../../labware-defs/selectors'
import { ModuleLabel } from './ModuleLabel'
import { LabwareLabel } from '../LabwareLabel'
import { FixtureRender } from './FixtureRender'
import type { DeckLabelProps } from '@opentrons/components'
import type {
  CoordinateTuple,
  DeckDefinition,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { Fixture } from './constants'

interface HoveredLabwareProps {
  deckDef: DeckDefinition
  robotType: RobotType
  hoveredLabware: string | null
  hoveredModule: ModuleModel | null
  hoveredFixture: Fixture | null
  hoveredSlotPosition: CoordinateTuple | null
}
export const HoveredItems = (
  props: HoveredLabwareProps
): JSX.Element | null => {
  const {
    deckDef,
    robotType,
    hoveredLabware,
    hoveredModule,
    hoveredFixture,
    hoveredSlotPosition,
  } = props
  const selectedSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const {
    selectedSlot,
    selectedModuleModel,
    selectedLabwareDefUri,
  } = selectedSlotInfo

  const customLabwareDefs = useSelector(getCustomLabwareDefsByURI)
  const defs = getOnlyLatestDefs()

  if (hoveredSlotPosition == null) {
    return null
  }
  const hoveredModuleDef =
    hoveredModule != null ? getModuleDef2(hoveredModule) : hoveredModule
  const hoveredLabwareDef =
    hoveredLabware != null
      ? defs[hoveredLabware] ?? customLabwareDefs[hoveredLabware] ?? null
      : null
  const selectedLabwareDef =
    selectedLabwareDefUri != null
      ? defs[selectedLabwareDefUri] ?? customLabwareDefs[selectedLabwareDefUri]
      : null

  const orientation =
    hoveredSlotPosition != null
      ? inferModuleOrientationFromXCoordinate(hoveredSlotPosition[0])
      : null

  const nestedInfo: DeckLabelProps[] =
    selectedLabwareDef != null &&
    (hoveredLabware == null || hoveredLabware !== selectedLabwareDefUri)
      ? [
          {
            text: selectedLabwareDef.metadata.displayName,
            isLast: false,
            isSelected: true,
            isZoomed: true,
          },
        ]
      : []

  return (
    <>
      {hoveredFixture != null && selectedSlot.cutout != null ? (
        <FixtureRender
          fixture={hoveredFixture}
          cutout={selectedSlot.cutout}
          robotType={robotType}
          deckDef={deckDef}
        />
      ) : null}
      {hoveredModuleDef != null &&
      hoveredSlotPosition != null &&
      orientation != null ? (
        <>
          <Module
            key={`${hoveredModuleDef.model}_${selectedSlot.slot}_hover`}
            x={hoveredSlotPosition[0]}
            y={hoveredSlotPosition[1]}
            def={hoveredModuleDef}
            orientation={orientation}
          />
          {hoveredModule != null ? (
            <ModuleLabel
              moduleModel={hoveredModule}
              position={hoveredSlotPosition}
              orientation={orientation}
              isSelected={false}
              isLast={true}
              slot={selectedSlot.slot}
            />
          ) : null}
        </>
      ) : null}

      {hoveredLabwareDef != null &&
      hoveredSlotPosition != null &&
      hoveredLabware != null &&
      selectedModuleModel == null ? (
        <Fragment key={`${hoveredLabwareDef.parameters.loadName}_hover`}>
          <g
            transform={`translate(${hoveredSlotPosition[0]}, ${hoveredSlotPosition[1]})`}
          >
            <LabwareRender definition={hoveredLabwareDef} />
          </g>
          <LabwareLabel
            isLast={true}
            isSelected={false}
            labwareDef={hoveredLabwareDef}
            position={hoveredSlotPosition}
            nestedLabwareInfo={nestedInfo}
          />
        </Fragment>
      ) : null}
    </>
  )
}
