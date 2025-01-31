import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Divider,
  Flex,
  MenuItem,
  NO_WRAP,
  POSITION_ABSOLUTE,
  RobotCoordsForeignDiv,
  StyledText,
  useOnClickOutside,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
  getCutoutIdFromAddressableArea,
  getDeckDefFromRobotType,
} from '@opentrons/shared-data'

import { getRobotType } from '../../../file-data/selectors'
import {
  deleteContainer,
  duplicateLabware,
  openIngredientSelector,
} from '../../../labware-ingred/actions'
import { getNextAvailableDeckSlot } from '../../../labware-ingred/utils'
import { deleteModule } from '../../../step-forms/actions'
import {
  ConfirmDeleteStagingAreaModal,
  EditNickNameModal,
} from '../../../organisms'
import { useKitchen } from '../../../organisms/Kitchen/hooks'
import { deleteDeckFixture } from '../../../step-forms/actions/additionalItems'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'

import { getStagingAreaAddressableAreas } from '../../../utils'
import { selectors as labwareIngredSelectors } from '../../../labware-ingred/selectors'

import type { MouseEvent, SetStateAction } from 'react'
import type {
  AddressableAreaName,
  CoordinateTuple,
  CutoutId,
  DeckSlotId,
} from '@opentrons/shared-data'

import type { LabwareOnDeck } from '../../../step-forms'
import type { ThunkDispatch } from '../../../types'

const ROBOT_BOTTOM_HALF_SLOTS = [
  'D1',
  'D2',
  'D3',
  'D4',
  'C1',
  'C2',
  'C3',
  'C4',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
]
const BOTTOM_SLOT_Y_POSITION = -70
const TOP_SLOT_Y_POSITION = 50
const TOP_SLOT_Y_POSITION_ALL_BUTTONS = 110
const TOP_SLOT_Y_POSITION_2_BUTTONS = 35
const STAGING_AREA_SLOTS = ['A4', 'B4', 'C4', 'D4']

interface SlotOverflowMenuProps {
  //   can be off-deck id or deck slot
  location: DeckSlotId | string
  setShowMenuList: (value: SetStateAction<boolean>) => void
  addEquipment: (slotId: string) => void
  menuListSlotPosition?: CoordinateTuple
  invertY?: true
}
export function SlotOverflowMenu(
  props: SlotOverflowMenuProps
): JSX.Element | null {
  const {
    location,
    setShowMenuList,
    addEquipment,
    menuListSlotPosition,
    invertY = false,
  } = props
  const { t } = useTranslation('starting_deck_state')
  const navigate = useNavigate()
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const [showDeleteLabwareModal, setShowDeleteLabwareModal] = useState<boolean>(
    false
  )
  const [showNickNameModal, setShowNickNameModal] = useState<boolean>(false)
  const overflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      if (showNickNameModal || showDeleteLabwareModal) return
      setShowMenuList(false)
    },
  })
  const deckSetup = useSelector(getDeckSetupForActiveItem)

  const liquidLocations = useSelector(
    labwareIngredSelectors.getLiquidsByLabwareId
  )

  const robotType = useSelector(getRobotType)

  const { makeSnackbar } = useKitchen()

  const {
    labware: deckSetupLabware,
    modules: deckSetupModules,
    additionalEquipmentOnDeck,
  } = deckSetup

  const isOffDeckLocation = deckSetupLabware[location] != null

  const moduleOnSlot = Object.values(deckSetupModules).find(
    module => module.slot === location
  )
  const labwareOnSlot = Object.values(deckSetupLabware).find(lw =>
    isOffDeckLocation
      ? lw.id === location
      : lw.slot === location || lw.slot === moduleOnSlot?.id
  )
  const isSpace =
    getNextAvailableDeckSlot(deckSetup, robotType, labwareOnSlot?.def) != null

  const isLabwareTiprack = labwareOnSlot?.def.parameters.isTiprack ?? false
  const isLabwareAnAdapter =
    labwareOnSlot?.def.allowedRoles?.includes('adapter') ?? false

  const isTiprackAdapter =
    labwareOnSlot?.def.parameters.quirks?.includes(
      'tiprackAdapterFor96Channel'
    ) ?? false

  const nestedLabwareOnSlot = Object.values(deckSetupLabware).find(
    lw => lw.slot === labwareOnSlot?.id
  )

  const fixturesOnSlot = Object.values(additionalEquipmentOnDeck).filter(
    ae => ae.location?.split('cutout')[1] === location
  )
  const stagingAreaCutout = fixturesOnSlot.find(
    fixture => fixture.name === 'stagingArea'
  )?.location

  let matchingLabware: LabwareOnDeck | null = null
  if (stagingAreaCutout != null) {
    const stagingAreaAddressableAreaName = getStagingAreaAddressableAreas([
      stagingAreaCutout,
    ] as CutoutId[])
    matchingLabware =
      Object.values(deckSetupLabware).find(
        lw => lw.slot === stagingAreaAddressableAreaName[0]
      ) ?? null
  }

  const hasNoItems =
    moduleOnSlot == null && labwareOnSlot == null && fixturesOnSlot.length === 0

  const isStagingSlot = FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS.includes(
    location as AddressableAreaName
  )

  const handleDuplicate = (): void => {
    if (!isSpace) {
      makeSnackbar(t('deck_slots_full') as string)
      return
    }

    if (
      labwareOnSlot != null &&
      !isLabwareAnAdapter &&
      nestedLabwareOnSlot == null
    ) {
      dispatch(duplicateLabware(labwareOnSlot.id))
    } else if (nestedLabwareOnSlot != null) {
      dispatch(duplicateLabware(nestedLabwareOnSlot.id))
    }
    setShowMenuList(false)
  }

  const handleClear = (): void => {
    //  clear module from slot
    if (moduleOnSlot != null) {
      dispatch(deleteModule(moduleOnSlot.id))
    }
    //  clear fixture(s) from slot
    if (fixturesOnSlot.length > 0) {
      fixturesOnSlot.forEach(fixture => dispatch(deleteDeckFixture(fixture.id)))
    }
    //  clear labware from slot
    if (labwareOnSlot != null) {
      dispatch(deleteContainer({ labwareId: labwareOnSlot.id }))
    }
    //  clear nested labware from slot
    if (nestedLabwareOnSlot != null) {
      dispatch(deleteContainer({ labwareId: nestedLabwareOnSlot.id }))
    }
    // clear labware on staging area 4th column slot
    if (matchingLabware != null) {
      dispatch(deleteContainer({ labwareId: matchingLabware.id }))
    }
    // delete staging slot if addressable area is on staging slot
    if (isStagingSlot) {
      const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
      const cutoutId = getCutoutIdFromAddressableArea(location, deckDef)
      const stagingAreaEquipmentId = Object.values(
        additionalEquipmentOnDeck
      ).find(({ location }) => location === cutoutId)?.id
      if (stagingAreaEquipmentId != null) {
        dispatch(deleteDeckFixture(stagingAreaEquipmentId))
      } else {
        console.error(
          `could not find equipment id for entity in ${location} with cutout id ${cutoutId}`
        )
      }
    }
  }

  const showDuplicateBtn =
    (labwareOnSlot != null &&
      !isLabwareAnAdapter &&
      nestedLabwareOnSlot == null) ||
    nestedLabwareOnSlot != null

  const canRenameLabwareAndEditLiquids =
    (labwareOnSlot != null &&
      !isLabwareAnAdapter &&
      !isLabwareTiprack &&
      !isTiprackAdapter &&
      nestedLabwareOnSlot == null) ||
    (nestedLabwareOnSlot != null && !isTiprackAdapter)

  let position = ROBOT_BOTTOM_HALF_SLOTS.includes(location)
    ? BOTTOM_SLOT_Y_POSITION
    : TOP_SLOT_Y_POSITION

  if (showDuplicateBtn && !ROBOT_BOTTOM_HALF_SLOTS.includes(location)) {
    position += canRenameLabwareAndEditLiquids
      ? TOP_SLOT_Y_POSITION_ALL_BUTTONS
      : TOP_SLOT_Y_POSITION_2_BUTTONS
  }

  let nickNameId = labwareOnSlot?.id
  if (nestedLabwareOnSlot != null) {
    nickNameId = nestedLabwareOnSlot.id
  } else if (isOffDeckLocation) {
    nickNameId = location
  }

  const selectionHasLiquids =
    nickNameId != null &&
    liquidLocations[nickNameId] != null &&
    Object.keys(liquidLocations[nickNameId]).length > 0

  const slotOverflowBody = (
    <>
      {showNickNameModal && nickNameId != null ? (
        <EditNickNameModal
          labwareId={nickNameId}
          onClose={() => {
            setShowNickNameModal(false)
            setShowMenuList(false)
          }}
        />
      ) : null}
      {showDeleteLabwareModal ? (
        <ConfirmDeleteStagingAreaModal
          onClose={() => {
            setShowDeleteLabwareModal(false)
            setShowMenuList(false)
          }}
          onConfirm={() => {
            handleClear()
            setShowDeleteLabwareModal(false)
            setShowMenuList(false)
          }}
        />
      ) : null}
      <Flex
        whiteSpace={NO_WRAP}
        ref={overflowWrapperRef}
        borderRadius={BORDERS.borderRadius8}
        boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
        backgroundColor={COLORS.white}
        flexDirection={DIRECTION_COLUMN}
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <MenuItem
          onClick={() => {
            addEquipment(location)
            setShowMenuList(false)
          }}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {hasNoItems
              ? t(isOffDeckLocation ? 'add_labware' : 'add_hw_lw')
              : t(isOffDeckLocation ? 'edit_labware' : 'edit_hw_lw')}
          </StyledText>
        </MenuItem>
        {canRenameLabwareAndEditLiquids ? (
          <MenuItem
            onClick={(e: MouseEvent) => {
              setShowNickNameModal(true)
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('rename_lab')}
            </StyledText>
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            if (nestedLabwareOnSlot != null) {
              dispatch(openIngredientSelector(nestedLabwareOnSlot.id))
            } else if (labwareOnSlot != null) {
              dispatch(openIngredientSelector(labwareOnSlot.id))
            }
            navigate('/liquids')
          }}
          disabled={!canRenameLabwareAndEditLiquids}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {selectionHasLiquids ? t('edit_liquid') : t('add_liquid')}
          </StyledText>
        </MenuItem>
        {showDuplicateBtn ? (
          <MenuItem onClick={handleDuplicate}>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('duplicate')}
            </StyledText>
          </MenuItem>
        ) : null}
        <Divider marginY="0" />
        <MenuItem
          disabled={hasNoItems && !isStagingSlot}
          onClick={(e: MouseEvent) => {
            if (matchingLabware != null) {
              setShowDeleteLabwareModal(true)
              e.preventDefault()
              e.stopPropagation()
            } else {
              handleClear()
              setShowMenuList(false)
            }
          }}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {t(isOffDeckLocation ? 'clear_labware' : 'clear_slot')}
          </StyledText>
        </MenuItem>
      </Flex>
    </>
  )

  return menuListSlotPosition != null ? (
    <RobotCoordsForeignDiv
      x={
        menuListSlotPosition[0] +
        (STAGING_AREA_SLOTS.includes(location) ? -100 : 50)
      }
      y={menuListSlotPosition[1] - position}
      width="10.75rem"
      height="11.25rem"
      innerDivProps={{
        style: {
          position: POSITION_ABSOLUTE,
          transform: `rotate(180deg) scaleX(-1) ${invertY ? 'scaleY(-1)' : ''}`,
        },
      }}
    >
      {slotOverflowBody}
    </RobotCoordsForeignDiv>
  ) : (
    slotOverflowBody
  )
}
