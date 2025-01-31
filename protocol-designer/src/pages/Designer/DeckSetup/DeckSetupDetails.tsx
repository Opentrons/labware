import values from 'lodash/values'
import { Fragment, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { Module } from '@opentrons/components'
import { MODULES_WITH_COLLISION_ISSUES } from '@opentrons/step-generation'
import {
  getAddressableAreaFromSlotId,
  getAreSlotsVerticallyAdjacent,
  getLabwareHasQuirk,
  getModuleDef2,
  getPositionFromSlotId,
  inferModuleOrientationFromSlot,
  inferModuleOrientationFromXCoordinate,
  isAddressableAreaStandardSlot,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { getSlotIdsBlockedBySpanningForThermocycler } from '../../../step-forms'
import { selectors } from '../../../labware-ingred/selectors'
import { getStagingAreaAddressableAreas } from '../../../utils'
import { editSlotInfo } from '../../../labware-ingred/actions'
import { getRobotType } from '../../../file-data/selectors'
import { LabwareOnDeck } from '../../../organisms'
import { getSlotInformation } from '../utils'
import { HighlightLabware } from '../HighlightLabware'
import { DeckItemHover } from './DeckItemHover'
import { SlotOverflowMenu } from './SlotOverflowMenu'
import { HoveredItems } from './HoveredItems'
import { SelectedHoveredItems } from './SelectedHoveredItems'
import { getAdjacentLabware } from './utils'
import { SlotWarning } from './SlotWarning'
import { HighlightItems } from './HighlightItems'

import type { ComponentProps, Dispatch, SetStateAction } from 'react'
import type { ThermocyclerVizProps } from '@opentrons/components'
import type {
  ModuleTemporalProperties,
  ThermocyclerModuleState,
} from '@opentrons/step-generation'
import type {
  AddressableArea,
  AddressableAreaName,
  CutoutId,
  DeckDefinition,
  DeckSlotId,
  Dimensions,
  ModuleModel,
} from '@opentrons/shared-data'
import type {
  InitialDeckSetup,
  LabwareOnDeck as LabwareOnDeckType,
  ModuleOnDeck,
} from '../../../step-forms'
import type { DeckSetupTabType } from '../types'
import type { Fixture } from './constants'

interface DeckSetupDetailsProps extends DeckSetupTabType {
  activeDeckSetup: InitialDeckSetup
  addEquipment: (slotId: string) => void
  deckDef: DeckDefinition
  hover: string | null
  hoveredFixture: Fixture | null
  hoveredLabware: string | null
  hoveredModule: ModuleModel | null
  setHover: Dispatch<SetStateAction<string | null>>
  showGen1MultichannelCollisionWarnings: boolean
  stagingAreaCutoutIds: CutoutId[]
  selectedZoomInSlot?: DeckSlotId
}

export function DeckSetupDetails(props: DeckSetupDetailsProps): JSX.Element {
  const {
    activeDeckSetup,
    addEquipment,
    deckDef,
    hover,
    hoveredFixture,
    hoveredLabware,
    hoveredModule,
    selectedZoomInSlot,
    tab,
    setHover,
    showGen1MultichannelCollisionWarnings,
    stagingAreaCutoutIds,
  } = props
  const robotType = useSelector(getRobotType)
  const slotIdsBlockedBySpanning = getSlotIdsBlockedBySpanningForThermocycler(
    activeDeckSetup,
    robotType
  )
  const selectedSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const { selectedSlot } = selectedSlotInfo
  const [menuListId, setShowMenuListForId] = useState<DeckSlotId | null>(null)
  const dispatch = useDispatch<any>()

  const {
    createdLabwareForSlot,
    createdNestedLabwareForSlot,
    createdModuleForSlot,
    preSelectedFixture,
    slotPosition,
  } = getSlotInformation({
    deckSetup: activeDeckSetup,
    slot: selectedZoomInSlot ?? '',
    deckDef,
  })
  //  initiate the slot's info
  useEffect(() => {
    dispatch(
      editSlotInfo({
        createdNestedLabwareForSlot,
        createdLabwareForSlot,
        createdModuleForSlot,
        preSelectedFixture,
      })
    )
  }, [
    createdLabwareForSlot,
    createdNestedLabwareForSlot,
    createdModuleForSlot,
    preSelectedFixture,
  ])

  const allLabware: LabwareOnDeckType[] = Object.keys(
    activeDeckSetup.labware
  ).reduce<LabwareOnDeckType[]>((acc, labwareId) => {
    const labware = activeDeckSetup.labware[labwareId]
    return getLabwareHasQuirk(labware.def, 'fixedTrash')
      ? acc
      : [...acc, labware]
  }, [])

  const allModules: ModuleOnDeck[] = values(activeDeckSetup.modules)
  const menuListSlotPosition = getPositionFromSlotId(menuListId ?? '', deckDef)

  const multichannelWarningSlotIds: AddressableAreaName[] = showGen1MultichannelCollisionWarnings
    ? getSlotsWithCollisions(deckDef, allModules)
    : []

  const adjacentLabware =
    preSelectedFixture != null && selectedSlot.cutout != null
      ? getAdjacentLabware(
          preSelectedFixture,
          selectedSlot.cutout,
          activeDeckSetup.labware
        )
      : null

  return (
    <>
      {/* all modules */}
      {allModules.map(moduleOnDeck => {
        const slotId = moduleOnDeck.slot

        const slotPosition = getPositionFromSlotId(slotId, deckDef)
        if (slotPosition == null) {
          console.warn(`no slot ${slotId} for module ${moduleOnDeck.id}`)
          return null
        }
        const moduleDef = getModuleDef2(moduleOnDeck.model)
        const getModuleInnerProps = (
          moduleState: ModuleTemporalProperties['moduleState']
        ): ComponentProps<typeof Module>['innerProps'] => {
          if (moduleState.type === THERMOCYCLER_MODULE_TYPE) {
            let lidMotorState = 'unknown'
            if (tab === 'startingDeck' || moduleState.lidOpen) {
              lidMotorState = 'open'
            } else if (moduleState.lidOpen === false) {
              lidMotorState = 'closed'
            }
            return {
              lidMotorState,
              blockTargetTemp: moduleState.blockTargetTemp,
            }
          } else if (
            'targetTemperature' in moduleState &&
            moduleState.type === 'temperatureModuleType'
          ) {
            return {
              targetTemperature: moduleState.targetTemperature,
            }
          } else if ('targetTemp' in moduleState) {
            return {
              targetTemp: moduleState.targetTemp,
            }
          }
        }

        const labwareLoadedOnModule = allLabware.find(
          lw => lw.slot === moduleOnDeck.id
        )
        const labwareInterfaceBoundingBox = {
          xDimension: moduleDef.dimensions.labwareInterfaceXDimension ?? 0,
          yDimension: moduleDef.dimensions.labwareInterfaceYDimension ?? 0,
          zDimension: 0,
        }
        const controlSelectDimensions = {
          xDimension: labwareLoadedOnModule?.def.dimensions.xDimension ?? 0,
          yDimension: labwareLoadedOnModule?.def.dimensions.yDimension ?? 0,
          zDimension: labwareLoadedOnModule?.def.dimensions.zDimension ?? 0,
        }
        const isLabwareOccludedByThermocyclerLid =
          moduleOnDeck.type === THERMOCYCLER_MODULE_TYPE &&
          (moduleOnDeck.moduleState as ThermocyclerModuleState).lidOpen !==
            true &&
          tab === 'protocolSteps'

        const tempInnerProps = getModuleInnerProps(moduleOnDeck.moduleState)
        const innerProps =
          moduleOnDeck.type === THERMOCYCLER_MODULE_TYPE
            ? {
                ...tempInnerProps,
                lidMotorState:
                  (tempInnerProps as ThermocyclerVizProps).lidMotorState !==
                  'open'
                    ? 'closed'
                    : 'open',
              }
            : tempInnerProps

        return moduleOnDeck.slot !== selectedSlot.slot ? (
          <Fragment key={moduleOnDeck.id}>
            <Module
              key={moduleOnDeck.id}
              x={slotPosition[0]}
              y={slotPosition[1]}
              def={moduleDef}
              orientation={inferModuleOrientationFromXCoordinate(
                slotPosition[0]
              )}
              innerProps={innerProps}
              targetSlotId={slotId}
              targetDeckId={deckDef.otId}
            >
              {labwareLoadedOnModule != null &&
              !isLabwareOccludedByThermocyclerLid ? (
                <>
                  <LabwareOnDeck
                    x={0}
                    y={0}
                    labwareOnDeck={labwareLoadedOnModule}
                  />
                  <HighlightLabware
                    labwareOnDeck={labwareLoadedOnModule}
                    position={[0, 0, 0]}
                  />
                  <DeckItemHover
                    isSelected={selectedZoomInSlot != null}
                    hover={hover}
                    setHover={setHover}
                    setShowMenuListForId={setShowMenuListForId}
                    menuListId={menuListId}
                    slotBoundingBox={controlSelectDimensions}
                    slotPosition={[0, 0, 0]}
                    itemId={slotId}
                    tab={tab}
                  />
                </>
              ) : null}

              {labwareLoadedOnModule == null ? (
                <>
                  <DeckItemHover
                    isSelected={selectedZoomInSlot != null}
                    hover={hover}
                    setHover={setHover}
                    setShowMenuListForId={setShowMenuListForId}
                    menuListId={menuListId}
                    slotBoundingBox={labwareInterfaceBoundingBox}
                    slotPosition={[0, 0, 0]}
                    itemId={slotId}
                    tab={tab}
                  />
                </>
              ) : null}
            </Module>
          </Fragment>
        ) : null
      })}

      {/* on-deck warnings for OT-2 and GEN1 8-channels only */}
      {multichannelWarningSlotIds.map(slotId => {
        const slotPosition = getPositionFromSlotId(slotId, deckDef)
        const slotBoundingBox = getAddressableAreaFromSlotId(slotId, deckDef)
          ?.boundingBox
        return slotPosition != null && slotBoundingBox != null ? (
          <SlotWarning
            key={slotId}
            warningType="gen1multichannel"
            x={slotPosition[0]}
            y={slotPosition[1]}
            xDimension={slotBoundingBox.xDimension}
            yDimension={slotBoundingBox.yDimension}
            orientation={inferModuleOrientationFromSlot(slotId)}
          />
        ) : null
      })}

      {/* SlotControls for all empty deck */}
      {deckDef.locations.addressableAreas
        .filter(addressableArea => {
          const stagingAreaAddressableAreas = getStagingAreaAddressableAreas(
            stagingAreaCutoutIds
          )
          const addressableAreas =
            isAddressableAreaStandardSlot(addressableArea.id, deckDef) ||
            stagingAreaAddressableAreas.includes(addressableArea.id)
          return (
            addressableAreas &&
            !slotIdsBlockedBySpanning.includes(addressableArea.id)
          )
        })
        .map(addressableArea => {
          return (
            <Fragment key={addressableArea.id}>
              <DeckItemHover
                isSelected={selectedZoomInSlot != null}
                hover={hover}
                setHover={setHover}
                setShowMenuListForId={setShowMenuListForId}
                menuListId={menuListId}
                slotBoundingBox={addressableArea.boundingBox}
                slotPosition={getPositionFromSlotId(
                  addressableArea.id,
                  deckDef
                )}
                itemId={addressableArea.id}
                tab={tab}
              />
            </Fragment>
          )
        })}
      {/* all labware on deck NOT those in modules */}
      {allLabware.map(labware => {
        if (
          labware.slot === 'offDeck' ||
          allModules.some(m => m.id === labware.slot) ||
          allLabware.some(lab => lab.id === labware.slot) ||
          labware.id === adjacentLabware?.id
        )
          return null
        const slotPosition = getPositionFromSlotId(labware.slot, deckDef)
        const slotBoundingBox = getAddressableAreaFromSlotId(
          labware.slot,
          deckDef
        )?.boundingBox
        if (slotPosition == null || slotBoundingBox == null) {
          console.warn(`no slot ${labware.slot} for labware ${labware.id}!`)
          return null
        }
        return labware.slot !== selectedSlot.slot ? (
          <Fragment key={labware.id}>
            <LabwareOnDeck
              x={slotPosition[0]}
              y={slotPosition[1]}
              labwareOnDeck={labware}
            />
            <HighlightLabware labwareOnDeck={labware} position={slotPosition} />
            <DeckItemHover
              isSelected={selectedZoomInSlot != null}
              hover={hover}
              setHover={setHover}
              setShowMenuListForId={setShowMenuListForId}
              menuListId={menuListId}
              slotBoundingBox={slotBoundingBox}
              slotPosition={slotPosition}
              itemId={labware.slot}
              tab={tab}
            />
          </Fragment>
        ) : null
      })}

      {/* all nested labwares on deck  */}
      {allLabware.map(labware => {
        if (
          allModules.some(m => m.id === labware.slot) ||
          labware.slot === 'offDeck'
        )
          return null
        if (
          deckDef.locations.addressableAreas.some(
            addressableArea => addressableArea.id === labware.slot
          )
        ) {
          return null
        }
        const slotForOnTheDeck = allLabware.find(lab => lab.id === labware.slot)
          ?.slot
        const slotForOnMod = allModules.find(mod => mod.id === slotForOnTheDeck)
          ?.slot
        let slotPosition = null
        if (slotForOnMod != null) {
          slotPosition = getPositionFromSlotId(slotForOnMod, deckDef)
        } else if (slotForOnTheDeck != null) {
          slotPosition = getPositionFromSlotId(slotForOnTheDeck, deckDef)
        }
        if (slotPosition == null) {
          console.warn(`no slot ${labware.slot} for labware ${labware.id}!`)
          return null
        }
        const slotBoundingBox: Dimensions = {
          xDimension: labware.def.dimensions.xDimension,
          yDimension: labware.def.dimensions.yDimension,
          zDimension: labware.def.dimensions.zDimension,
        }
        const moduleParent = allModules.find(
          module => module.id === slotForOnTheDeck
        )
        const slotOnDeck =
          moduleParent == null
            ? slotForOnTheDeck
            : allModules.find(module => module.id === slotForOnTheDeck)?.slot
        return (
          <Fragment key={labware.id}>
            <LabwareOnDeck
              x={slotPosition[0]}
              y={slotPosition[1]}
              labwareOnDeck={labware}
            />
            <HighlightLabware labwareOnDeck={labware} position={slotPosition} />
            <DeckItemHover
              isSelected={selectedZoomInSlot != null}
              hover={hover}
              setShowMenuListForId={setShowMenuListForId}
              menuListId={menuListId}
              setHover={setHover}
              slotBoundingBox={slotBoundingBox}
              slotPosition={slotPosition}
              itemId={slotOnDeck ?? ''}
              tab={tab}
            />
          </Fragment>
        )
      })}

      {/* highlight items from Protocol steps */}
      <HighlightItems robotType={robotType} deckDef={deckDef} />

      {/* selected hardware + labware */}
      <SelectedHoveredItems
        deckDef={deckDef}
        robotType={robotType}
        hoveredFixture={hoveredFixture}
        hoveredLabware={hoveredLabware}
        hoveredModule={hoveredModule}
        slotPosition={slotPosition}
      />

      {/* hovered hardware + labware */}
      <HoveredItems
        hoveredSlotPosition={slotPosition}
        deckDef={deckDef}
        robotType={robotType}
        hoveredFixture={hoveredFixture}
        hoveredLabware={hoveredLabware}
        hoveredModule={hoveredModule}
      />

      {/* slot overflow menu */}
      {menuListSlotPosition != null && menuListId != null ? (
        <SlotOverflowMenu
          menuListSlotPosition={menuListSlotPosition}
          location={menuListId}
          addEquipment={addEquipment}
          setShowMenuList={() => {
            setShowMenuListForId(null)
          }}
        />
      ) : null}
    </>
  )
}

const getSlotsWithCollisions = (
  deckDef: DeckDefinition,
  allModules: ModuleOnDeck[]
): AddressableAreaName[] => {
  return deckDef.locations.addressableAreas.reduce(
    (acc: AddressableAreaName[], aa: AddressableArea) => {
      const modulesWithCollisionsOnDeck = allModules.filter(module =>
        MODULES_WITH_COLLISION_ISSUES.includes(module.model)
      )
      if (modulesWithCollisionsOnDeck.length === 0) {
        return acc
      }

      const hasCollision = modulesWithCollisionsOnDeck.some(module =>
        getAreSlotsVerticallyAdjacent(module.slot, aa.id)
      )
      if (hasCollision) {
        return [...acc, aa.id]
      }
      return acc
    },
    []
  )
}
