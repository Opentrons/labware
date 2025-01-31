import { Fragment, useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DeckFromLayers,
  Flex,
  FlexTrash,
  JUSTIFY_CENTER,
  RobotCoordinateSpaceWithRef,
  SingleSlotFixture,
  SlotLabels,
  SPACING,
  StagingAreaFixture,
  WasteChuteFixture,
  WasteChuteStagingAreaFixture,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getCutoutIdForAddressableArea,
  getDeckDefFromRobotType,
  isAddressableAreaStandardSlot,
  OT2_ROBOT_TYPE,
  STAGING_AREA_CUTOUTS,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import { getRobotType } from '../../file-data/selectors'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import { DeckThumbnailDetails } from './DeckThumbnailDetails'

import type { Dispatch, SetStateAction } from 'react'
import type { StagingAreaLocation, TrashCutoutId } from '@opentrons/components'
import type { CutoutId, DeckSlotId } from '@opentrons/shared-data'
import type { AdditionalEquipmentEntity } from '@opentrons/step-generation'

const RIGHT_COLUMN_FIXTURE_PADDING = 50 // mm
const WASTE_CHUTE_SPACE = 30
const OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST: string[] = [
  'calibrationMarkings',
  'fixedBase',
  'doorStops',
  'metalFrame',
  'removalHandle',
  'removableDeckOutline',
  'screwHoles',
  'fixedTrash',
]

const lightFill = COLORS.grey35
const darkFill = COLORS.grey60

interface DeckThumbnailProps {
  hoverSlot: DeckSlotId | null
  setHoverSlot: Dispatch<SetStateAction<string | null>>
}
export function DeckThumbnail(props: DeckThumbnailProps): JSX.Element {
  const { hoverSlot, setHoverSlot } = props
  const initialDeckSetup = useSelector(getInitialDeckSetup)
  const robotType = useSelector(getRobotType)
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [])
  const trash = Object.values(initialDeckSetup.additionalEquipmentOnDeck).find(
    ae => ae.name === 'trashBin'
  )
  const trashBinFixtures = [
    {
      cutoutId: trash?.location as CutoutId,
      cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
    },
  ]
  const wasteChuteFixtures = Object.values(
    initialDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      WASTE_CHUTE_CUTOUT.includes(aE.location as CutoutId) &&
      aE.name === 'wasteChute'
  )
  const stagingAreaFixtures: AdditionalEquipmentEntity[] = Object.values(
    initialDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      STAGING_AREA_CUTOUTS.includes(aE.location as CutoutId) &&
      aE.name === 'stagingArea'
  )

  const wasteChuteStagingAreaFixtures = Object.values(
    initialDeckSetup.additionalEquipmentOnDeck
  ).filter(
    aE =>
      STAGING_AREA_CUTOUTS.includes(aE.location as CutoutId) &&
      aE.name === 'stagingArea' &&
      aE.location === WASTE_CHUTE_CUTOUT &&
      wasteChuteFixtures.length > 0
  )

  const hasWasteChute =
    wasteChuteFixtures.length > 0 || wasteChuteStagingAreaFixtures.length > 0

  const filteredAddressableAreas = deckDef.locations.addressableAreas.filter(
    aa => isAddressableAreaStandardSlot(aa.id, deckDef)
  )
  const hasRightColumnFixtures =
    stagingAreaFixtures.length + wasteChuteFixtures.length > 0
  return (
    <Flex
      width="100%"
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      backgroundColor={
        robotType === OT2_ROBOT_TYPE ? COLORS.white : COLORS.grey10
      }
      paddingY={robotType === FLEX_ROBOT_TYPE && SPACING.spacing24}
      borderRadius={BORDERS.borderRadius8}
    >
      <RobotCoordinateSpaceWithRef
        height="100%"
        width="100%"
        deckDef={deckDef}
        viewBox={`${deckDef.cornerOffsetFromOrigin[0]} ${
          hasWasteChute
            ? deckDef.cornerOffsetFromOrigin[1] - WASTE_CHUTE_SPACE
            : deckDef.cornerOffsetFromOrigin[1]
        } ${
          hasRightColumnFixtures
            ? deckDef.dimensions[0] + RIGHT_COLUMN_FIXTURE_PADDING
            : deckDef.dimensions[0]
        } ${deckDef.dimensions[1]}`}
        zoomed
      >
        {() => (
          <>
            {robotType === OT2_ROBOT_TYPE ? (
              <DeckFromLayers
                robotType={robotType}
                layerBlocklist={OT2_STANDARD_DECK_VIEW_LAYER_BLOCK_LIST}
              />
            ) : (
              <>
                {filteredAddressableAreas.map(addressableArea => {
                  const cutoutId = getCutoutIdForAddressableArea(
                    addressableArea.id,
                    deckDef.cutoutFixtures
                  )
                  return cutoutId != null ? (
                    <SingleSlotFixture
                      key={addressableArea.id}
                      cutoutId={cutoutId}
                      deckDefinition={deckDef}
                      showExpansion={cutoutId === 'cutoutA1'}
                      fixtureBaseColor={lightFill}
                      slotClipColor={darkFill}
                    />
                  ) : null
                })}
                {stagingAreaFixtures.map(fixture => (
                  <StagingAreaFixture
                    key={fixture.id}
                    cutoutId={fixture.location as StagingAreaLocation}
                    deckDefinition={deckDef}
                    fixtureBaseColor={lightFill}
                    slotClipColor={darkFill}
                  />
                ))}
                {trash != null
                  ? trashBinFixtures.map(({ cutoutId }) =>
                      cutoutId != null ? (
                        <Fragment key={cutoutId}>
                          <SingleSlotFixture
                            cutoutId={cutoutId}
                            deckDefinition={deckDef}
                            slotClipColor={COLORS.transparent}
                            fixtureBaseColor={lightFill}
                          />
                          <FlexTrash
                            robotType={robotType}
                            trashIconColor={lightFill}
                            trashCutoutId={cutoutId as TrashCutoutId}
                            backgroundColor={COLORS.grey50}
                          />
                        </Fragment>
                      ) : null
                    )
                  : null}
                {wasteChuteFixtures.map(fixture => (
                  <WasteChuteFixture
                    key={fixture.id}
                    cutoutId={fixture.location as typeof WASTE_CHUTE_CUTOUT}
                    deckDefinition={deckDef}
                    fixtureBaseColor={lightFill}
                  />
                ))}
                {wasteChuteStagingAreaFixtures.map(fixture => (
                  <WasteChuteStagingAreaFixture
                    key={fixture.id}
                    cutoutId={fixture.location as typeof WASTE_CHUTE_CUTOUT}
                    deckDefinition={deckDef}
                    fixtureBaseColor={lightFill}
                    slotClipColor={darkFill}
                  />
                ))}
              </>
            )}
            <DeckThumbnailDetails
              robotType={robotType}
              hover={hoverSlot}
              setHover={setHoverSlot}
              initialDeckSetup={initialDeckSetup}
              stagingAreaCutoutIds={stagingAreaFixtures.map(
                areas => areas.location as CutoutId
              )}
              {...{
                deckDef,
              }}
            />
            <SlotLabels
              robotType={robotType}
              show4thColumn={stagingAreaFixtures.length > 0}
            />
          </>
        )}
      </RobotCoordinateSpaceWithRef>
    </Flex>
  )
}
