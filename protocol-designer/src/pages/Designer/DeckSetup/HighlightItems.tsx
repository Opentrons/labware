import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  STANDARD_FLEX_SLOTS,
  STANDARD_OT2_SLOTS,
  THERMOCYCLER_MODULE_TYPE,
  WASTE_CHUTE_CUTOUT,
  getAddressableAreaFromSlotId,
  getPositionFromSlotId,
  inferModuleOrientationFromXCoordinate,
} from '@opentrons/shared-data'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import { getDesignerTab } from '../../../file-data/selectors'
import { LabwareLabel } from '../LabwareLabel'
import { ModuleLabel } from './ModuleLabel'
import { FixtureRender } from './FixtureRender'
import { DeckItemHighlight } from './DeckItemHighlight'
import type { AdditionalEquipmentName } from '@opentrons/step-generation'
import type {
  RobotType,
  DeckDefinition,
  CutoutId,
  AddressableAreaName,
} from '@opentrons/shared-data'
import type { LabwareOnDeck, ModuleOnDeck } from '../../../step-forms'
import type { Fixture } from './constants'

interface HighlightItemsProps {
  deckDef: DeckDefinition
  robotType: RobotType
}

const SLOTS = [
  ...STANDARD_FLEX_SLOTS,
  ...STANDARD_OT2_SLOTS,
  'A4',
  'B4',
  'C4',
  'D4',
  'cutoutD3',
]

export function HighlightItems(props: HighlightItemsProps): JSX.Element | null {
  const { robotType, deckDef } = props
  const { t } = useTranslation('application')
  const tab = useSelector(getDesignerTab)
  const { labware, modules, additionalEquipmentOnDeck } = useSelector(
    getDeckSetupForActiveItem
  )
  const hoveredItem = useSelector(getHoveredDropdownItem)
  const selectedDropdownItems = useSelector(getSelectedDropdownItem)

  if (
    hoveredItem == null &&
    (selectedDropdownItems == null || selectedDropdownItems.length === 0)
  ) {
    return null
  }

  const hoveredItemLabware: LabwareOnDeck | null =
    hoveredItem?.id != null && labware[hoveredItem.id] != null
      ? labware[hoveredItem.id]
      : null
  const selectedItemLabwares = selectedDropdownItems.filter(
    selected => selected.id != null && labware[selected.id]
  )
  const hoveredItemModule: ModuleOnDeck | null =
    hoveredItem?.id != null && modules[hoveredItem.id] != null
      ? modules[hoveredItem.id]
      : null
  const selectedItemModule = selectedDropdownItems.find(
    selected => selected.id != null && modules[selected.id]
  )
  const hoveredItemTrash: {
    name: AdditionalEquipmentName
    id: string
    location?: string | undefined
  } | null =
    hoveredItem?.id != null && additionalEquipmentOnDeck[hoveredItem.id] != null
      ? additionalEquipmentOnDeck[hoveredItem.id]
      : null
  const selectedItemTrash = selectedDropdownItems.find(
    selected => selected.id != null && additionalEquipmentOnDeck[selected.id]
  )

  const hoveredDeckItem: string | null =
    hoveredItem?.id != null &&
    SLOTS.includes(hoveredItem.id as AddressableAreaName)
      ? hoveredItem.id
      : null
  const selectedItemSlot = selectedDropdownItems.find(
    selected =>
      selected.id != null && SLOTS.includes(selected.id as AddressableAreaName)
  )

  const getLabwareItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredItemLabware != null || selectedItemLabwares.length > 0) {
      const selectedLabwaresOnDeck = selectedItemLabwares
        .map(item => (item?.id != null ? labware[item.id] : null))
        .filter(Boolean)

      const labwaresToRender =
        hoveredItemLabware != null
          ? [hoveredItemLabware]
          : selectedLabwaresOnDeck

      labwaresToRender.forEach((labwareOnDeck, index) => {
        if (!labwareOnDeck) {
          console.warn(
            `labwareOnDeck was null as ${labwareOnDeck}, expected to find a matching entity`
          )
          return
        }

        let labwareSlot = labwareOnDeck.slot
        const hasTC = Object.values(modules).some(
          module => module.type === THERMOCYCLER_MODULE_TYPE
        )

        if (modules[labwareSlot]) {
          labwareSlot = modules[labwareSlot].slot
        } else if (labware[labwareSlot]) {
          const adapter = labware[labwareSlot]
          labwareSlot = modules[adapter.slot]?.slot ?? adapter.slot
        }

        const position = getPositionFromSlotId(labwareSlot, deckDef)
        if (position != null) {
          items.push(
            <LabwareLabel
              key={`${labwareOnDeck.id}_${index}`}
              isSelected={selectedItemLabwares.some(
                selected => selected.id === labwareOnDeck.id
              )}
              isLast={true}
              position={
                hasTC && labwareSlot === 'B1' ? [-20, 282, 0] : position
              }
              labwareDef={labwareOnDeck.def}
              labelText={
                hoveredItemLabware == null
                  ? selectedItemLabwares.find(
                      selected => selected.id === labwareOnDeck.id
                    )?.text ?? ''
                  : hoveredItem.text ?? ''
              }
            />
          )
        }
      })
    }

    return items
  }

  const getModuleItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredItemModule != null || selectedItemModule != null) {
      const selectedModuleOnDeck =
        selectedItemModule?.id != null ? modules[selectedItemModule.id] : null
      const moduleOnDeck = hoveredItemModule ?? selectedModuleOnDeck

      if (!moduleOnDeck) {
        console.warn(
          `moduleOnDeck was null as ${moduleOnDeck}, expected to find a matching entity`
        )
        return items
      }

      const position = getPositionFromSlotId(moduleOnDeck.slot, deckDef)
      if (position != null) {
        items.push(
          <ModuleLabel
            key={`module_${moduleOnDeck.id}`}
            isLast={true}
            isSelected={selectedItemModule != null}
            moduleModel={moduleOnDeck.model}
            position={position}
            orientation={inferModuleOrientationFromXCoordinate(position[0])}
            isZoomed={false}
            labelName={
              selectedItemModule == null
                ? hoveredItem.text ?? ''
                : selectedItemModule.text ?? ''
            }
            slot={moduleOnDeck.slot}
          />
        )
      }
    }

    return items
  }

  const getTrashItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredItemTrash != null || selectedItemTrash != null) {
      const selectedTrashOnDeck =
        selectedItemTrash?.id != null
          ? additionalEquipmentOnDeck[selectedItemTrash.id]
          : null
      const trashOnDeck = hoveredItemTrash ?? selectedTrashOnDeck

      if (!trashOnDeck) {
        console.warn(
          `trashOnDeck was null as ${trashOnDeck}, expected to find a matching entity`
        )
        return []
      }

      if (hoveredItemTrash != null) {
        items.push(
          <FixtureRender
            key={`${hoveredItemTrash.id}_hovered`}
            fixture={hoveredItemTrash.name as Fixture}
            cutout={hoveredItemTrash.location as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: hoveredItem.text ?? '',
                isSelected: false,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      }

      if (selectedTrashOnDeck != null && selectedItemTrash != null) {
        items.push(
          <FixtureRender
            key={`${selectedTrashOnDeck.id}_selected`}
            fixture={selectedTrashOnDeck.name as Fixture}
            cutout={selectedTrashOnDeck.location as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: selectedItemTrash.text ?? '',
                isSelected: true,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      }
    }

    return items
  }

  const getDeckItems = (): JSX.Element[] => {
    const items: JSX.Element[] = []

    if (hoveredDeckItem != null || selectedItemSlot != null) {
      const slot = hoveredDeckItem ?? selectedItemSlot?.id

      if (slot === WASTE_CHUTE_CUTOUT) {
        items.push(
          <FixtureRender
            key={`${slot}_wasteChute_selected`}
            fixture={'wasteChute' as Fixture}
            cutout={WASTE_CHUTE_CUTOUT as CutoutId}
            robotType={robotType}
            deckDef={deckDef}
            showHighlight={true}
            tagInfo={[
              {
                text: t('location'),
                isSelected: true,
                isLast: true,
                isZoomed: false,
              },
            ]}
          />
        )
      } else {
        const addressableArea =
          slot != null && slot !== WASTE_CHUTE_CUTOUT
            ? getAddressableAreaFromSlotId(slot, deckDef)
            : null

        if (!addressableArea) {
          console.warn(
            `addressableArea was null as ${addressableArea}, expected to find a matching entity`
          )
          return []
        }
        items.push(
          <DeckItemHighlight
            tab={tab}
            slotBoundingBox={addressableArea.boundingBox}
            slotPosition={getPositionFromSlotId(addressableArea.id, deckDef)}
            itemId={addressableArea.id}
          />
        )
      }
    }

    return items
  }

  const renderItems = (): JSX.Element[] => {
    return [
      ...getLabwareItems(),
      ...getModuleItems(),
      ...getTrashItems(),
      ...getDeckItems(),
    ]
  }

  return <>{renderItems()}</>
}
