import * as React from 'react'
import {
  // getDeckDefFromRobotType,
  getCutoutFromSlotId,
  getModuleDef2,
  inferModuleOrientationFromXCoordinate,
  // OT2_ROBOT_TYPE,
  STAGING_AREA_LOAD_NAME,
  STANDARD_SLOT_LOAD_NAME,
  TRASH_BIN_LOAD_NAME,
  WASTE_CHUTE_CUTOUT,
  WASTE_CHUTE_LOAD_NAME,
} from '@opentrons/shared-data'
import ot3DeckDefV4 from '@opentrons/shared-data/deck/definitions/4/ot3_standard.json'
import { RobotCoordinateSpace } from '../RobotCoordinateSpace'
import { Module } from '../Module'
import { LabwareRender } from '../Labware'
import { FlexTrash } from '../Deck/FlexTrash'
// import { DeckFromData } from '../Deck/DeckFromData'
import { SlotLabels } from '../Deck'
import { COLORS } from '../../ui-style-constants'

import {
  // EXTENDED_DECK_CONFIG_FIXTURE,
  STANDARD_SLOT_DECK_CONFIG_FIXTURE,
} from './__fixtures__'
import { SingleSlotFixture } from './SingleSlotFixture'
import { StagingAreaFixture } from './StagingAreaFixture'
import { WasteChuteFixture } from './WasteChuteFixture'
// import { WasteChuteStagingAreaFixture } from './WasteChuteStagingAreaFixture'

import type {
  DeckConfiguration,
  DeckDefinitionV4,
  FlexSlot,
  LabwareDefinition2,
  LabwareLocation,
  ModuleLocation,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { TrashLocationV4 } from '../Deck/FlexTrash'
import type { StagingAreaLocation } from './StagingAreaFixture'
// import type { WasteChuteLocation } from './WasteChuteFixture'

interface BaseDeckProps {
  robotType: RobotType
  labwareLocations: Array<{
    labwareLocation: LabwareLocation
    definition: LabwareDefinition2
    // generic prop to render self-positioned children for each labware
    labwareChildren?: React.ReactNode
    onLabwareClick?: () => void
  }>
  moduleLocations: Array<{
    moduleModel: ModuleModel
    moduleLocation: ModuleLocation
    nestedLabwareDef?: LabwareDefinition2 | null
    innerProps?: React.ComponentProps<typeof Module>['innerProps']
    // generic prop to render self-positioned children for each module
    moduleChildren?: React.ReactNode
    onLabwareClick?: () => void
  }>
  deckConfig?: DeckConfiguration
  deckLayerBlocklist?: string[]
  showExpansion?: boolean
  lightFill?: string
  darkFill?: string
  children?: React.ReactNode
}

export function BaseDeck(props: BaseDeckProps): JSX.Element {
  const {
    robotType,
    moduleLocations,
    labwareLocations,
    lightFill = COLORS.light1,
    darkFill = COLORS.darkGreyEnabled,
    // deckLayerBlocklist = [],
    // TODO(bh, 2023-10-09): remove deck config fixture for Flex after migration to v4
    // deckConfig = EXTENDED_DECK_CONFIG_FIXTURE,
    deckConfig = STANDARD_SLOT_DECK_CONFIG_FIXTURE,
    showExpansion = true,
    children,
  } = props
  // const deckDef = getDeckDefFromRobotType(robotType)

  // TODO: shift to V4 for OT-2
  // const deckDef =
  //   robotType === OT2_ROBOT_TYPE
  //     ? getDeckDefFromRobotType(robotType)
  //     : ((ot3DeckDefV4 as unknown) as DeckDefinitionV4)
  const deckDef = (ot3DeckDefV4 as unknown) as DeckDefinitionV4

  const singleSlotFixtures = deckConfig.filter(
    fixture => fixture.loadName === STANDARD_SLOT_LOAD_NAME
  )
  const stagingAreaFixtures = deckConfig.filter(
    fixture => fixture.loadName === STAGING_AREA_LOAD_NAME
  )
  const trashBinFixtures = deckConfig.filter(
    fixture => fixture.loadName === TRASH_BIN_LOAD_NAME
  )
  const wasteChuteFixtures = deckConfig.filter(
    fixture =>
      fixture.loadName === WASTE_CHUTE_LOAD_NAME &&
      fixture.fixtureLocation === WASTE_CHUTE_CUTOUT
  )

  return (
    <RobotCoordinateSpace
      viewBox={`${deckDef.cornerOffsetFromOrigin[0]} ${deckDef.cornerOffsetFromOrigin[1]} ${deckDef.dimensions[0]} ${deckDef.dimensions[1]}`}
    >
      {/* {robotType === OT2_ROBOT_TYPE && 'layers' in deckDef ? (
        // TODO: migrate OT-2 to v4 deck definition
        <DeckFromData def={deckDef} layerBlocklist={deckLayerBlocklist} />
      ) : */}
      <>
        {singleSlotFixtures.map(fixture => (
          <SingleSlotFixture
            key={fixture.fixtureId}
            cutoutLocation={fixture.fixtureLocation}
            deckDefinition={deckDef}
            slotClipColor={darkFill}
            fixtureBaseColor={lightFill}
            showExpansion={showExpansion}
          />
        ))}
        {stagingAreaFixtures.map(fixture => (
          <StagingAreaFixture
            key={fixture.fixtureId}
            // TODO(bh, 2023-10-09): typeguard fixture location
            cutoutLocation={fixture.fixtureLocation as StagingAreaLocation}
            deckDefinition={deckDef}
            slotClipColor={darkFill}
            fixtureBaseColor={lightFill}
          />
        ))}
        {trashBinFixtures.map(fixture => (
          <React.Fragment key={fixture.fixtureId}>
            <SingleSlotFixture
              cutoutLocation={fixture.fixtureLocation}
              deckDefinition={deckDef}
              slotClipColor={COLORS.transparent}
              fixtureBaseColor={lightFill}
            />
            <FlexTrash
              deckDefinition={deckDef}
              robotType={robotType}
              trashIconColor={lightFill}
              // TODO(bh, 2023-10-09): typeguard fixture location
              trashLocation={fixture.fixtureLocation as TrashLocationV4}
              backgroundColor={darkFill}
            />
          </React.Fragment>
        ))}
        {wasteChuteFixtures.map(fixture => (
          <WasteChuteFixture
            key={fixture.fixtureId}
            // TODO(bh, 2023-10-09): typeguard fixture location
            cutoutLocation={
              fixture.fixtureLocation as typeof WASTE_CHUTE_CUTOUT
            }
            deckDefinition={deckDef}
            slotClipColor={darkFill}
            fixtureBaseColor={lightFill}
          />
        ))}
      </>
      {moduleLocations.map(
        ({
          moduleModel,
          moduleLocation,
          nestedLabwareDef,
          innerProps,
          moduleChildren,
          onLabwareClick,
        }) => {
          const slotDef = deckDef.locations.addressableAreas.find(
            s => s.id === moduleLocation.slotName
          )

          // early return null if no slot def found
          if (slotDef == null) return null

          const cutoutId = getCutoutFromSlotId(slotDef.id as FlexSlot)
          const cutoutDef = deckDef.locations.cutouts.find(
            cutout => cutout.id === cutoutId
          )

          // early return null if no cutout def found
          if (cutoutDef == null) return null

          const [xCutout, yCutout] = cutoutDef.position ?? []
          const [
            xOffsetFromCutout,
            yOffsetFromCutout,
          ] = slotDef.offsetFromCutoutFixture
          const xCoordinate = xCutout + xOffsetFromCutout
          const yCoordinate = yCutout + yOffsetFromCutout

          const moduleDef = getModuleDef2(moduleModel)
          return slotDef != null ? (
            <Module
              key={`${moduleModel} ${slotDef.id}`}
              def={moduleDef}
              x={xCoordinate}
              y={yCoordinate}
              orientation={inferModuleOrientationFromXCoordinate(xCoordinate)}
              innerProps={innerProps}
            >
              {nestedLabwareDef != null ? (
                <LabwareRender
                  definition={nestedLabwareDef}
                  onLabwareClick={onLabwareClick}
                />
              ) : null}
              {moduleChildren}
            </Module>
          ) : null
        }
      )}
      {labwareLocations.map(
        ({ labwareLocation, definition, labwareChildren, onLabwareClick }) => {
          const slotDef = deckDef.locations.addressableAreas.find(
            s =>
              labwareLocation !== 'offDeck' &&
              'slotName' in labwareLocation &&
              s.id === labwareLocation.slotName
          )

          // early return null if no slot def found
          if (slotDef == null) return null

          const cutoutId = getCutoutFromSlotId(slotDef.id as FlexSlot)
          const cutoutDef = deckDef.locations.cutouts.find(
            cutout => cutout.id === cutoutId
          )

          // early return null if no cutout def found
          if (cutoutDef == null) return null

          const [xCutout, yCutout] = cutoutDef.position ?? []
          const [
            xOffsetFromCutout,
            yOffsetFromCutout,
          ] = slotDef.offsetFromCutoutFixture
          const xCoordinate = xCutout + xOffsetFromCutout
          const yCoordinate = yCutout + yOffsetFromCutout

          return slotDef != null ? (
            <g
              key={slotDef.id}
              transform={`translate(${xCoordinate.toString()},${yCoordinate.toString()})`}
            >
              <LabwareRender
                definition={definition}
                onLabwareClick={onLabwareClick}
              />
              {labwareChildren}
            </g>
          ) : null
        }
      )}
      <SlotLabels robotType={robotType} color={darkFill} />
      {children}
    </RobotCoordinateSpace>
  )
}
