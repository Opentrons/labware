import {
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
  SINGLE_SLOT_FIXTURES,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_ONLY_FIXTURES,
  WASTE_CHUTE_STAGING_AREA_FIXTURES,
  THERMOCYCLER_V2_FRONT_FIXTURE,
  HEATERSHAKER_MODULE_V1_FIXTURE,
  TEMPERATURE_MODULE_V2_FIXTURE,
  MAGNETIC_BLOCK_V1_FIXTURE,
  ABSORBANCE_READER_V1_FIXTURE,
  FLEX_STACKER_V1_FIXTURE,
  FLEX_STACKER_FIXTURES,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
  THERMOCYCLER_MODULE_CUTOUTS,
} from '@opentrons/shared-data'

import { COLORS } from '../../helix-design-system'
import { SingleSlotFixture } from '../BaseDeck/SingleSlotFixture'
import { SlotLabels } from '../Deck'
import { RobotCoordinateSpace } from '../RobotCoordinateSpace'
import { EmptyConfigFixture } from './EmptyConfigFixture'
import { StagingAreaConfigFixture } from './StagingAreaConfigFixture'
import { TrashBinConfigFixture } from './TrashBinConfigFixture'
import { WasteChuteConfigFixture } from './WasteChuteConfigFixture'
import { StaticFixture } from './StaticFixture'
import { TemperatureModuleFixture } from './TemperatureModuleFixture'
import { HeaterShakerFixture } from './HeaterShakerFixture'
import { MagneticBlockFixture } from './MagneticBlockFixture'
import { ThermocyclerFixture } from './ThermocyclerFixture'
import { AbsorbanceReaderFixture } from './AbsorbanceReaderFixture'
import { FlexStackerFixture } from './FlexStackerFixture'

import type { ReactNode } from 'react'
import type {
  CutoutFixtureId,
  CutoutId,
  DeckConfiguration,
} from '@opentrons/shared-data'

export * from './constants'

interface DeckConfiguratorProps {
  deckConfig: DeckConfiguration
  handleClickAdd: (cutoutId: CutoutId) => void
  handleClickRemove: (
    cutoutId: CutoutId,
    cutoutFixtureId: CutoutFixtureId
  ) => void
  lightFill?: string
  darkFill?: string
  editableCutoutIds?: CutoutId[]
  showExpansion?: boolean
  children?: ReactNode
  additionalStaticFixtures?: Array<{ location: CutoutId; label: string }>
  height?: string
  selectedCutoutId?: CutoutId
}

export function DeckConfigurator(props: DeckConfiguratorProps): JSX.Element {
  const {
    deckConfig,
    handleClickAdd,
    handleClickRemove,
    additionalStaticFixtures,
    children,
    selectedCutoutId,
    lightFill = COLORS.grey35,
    darkFill = COLORS.black90,
    editableCutoutIds = deckConfig.map(({ cutoutId }) => cutoutId),
    showExpansion = true,
    height = '455px',
  } = props
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)

  const stagingAreaFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === STAGING_AREA_RIGHT_SLOT_FIXTURE
  )
  const wasteChuteFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) =>
      cutoutFixtureId != null &&
      WASTE_CHUTE_ONLY_FIXTURES.includes(cutoutFixtureId)
  )
  const wasteChuteStagingAreaFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) =>
      cutoutFixtureId != null &&
      WASTE_CHUTE_STAGING_AREA_FIXTURES.includes(cutoutFixtureId)
  )
  const emptyCutouts = deckConfig.filter(
    ({ cutoutFixtureId, cutoutId }) =>
      editableCutoutIds.includes(cutoutId) &&
      cutoutFixtureId != null &&
      SINGLE_SLOT_FIXTURES.includes(cutoutFixtureId)
  )
  const trashBinFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === TRASH_BIN_ADAPTER_FIXTURE
  )
  const thermocyclerFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === THERMOCYCLER_V2_FRONT_FIXTURE
  )
  const heaterShakerFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === HEATERSHAKER_MODULE_V1_FIXTURE
  )
  const temperatureModuleFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === TEMPERATURE_MODULE_V2_FIXTURE
  )
  const magneticBlockFixtures = deckConfig.filter(({ cutoutFixtureId }) =>
    ([
      MAGNETIC_BLOCK_V1_FIXTURE,
      STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
    ] as CutoutFixtureId[]).includes(cutoutFixtureId)
  )
  const absorbanceReaderFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) => cutoutFixtureId === ABSORBANCE_READER_V1_FIXTURE
  )
  const magneticBlockStagingAreaFixtures = deckConfig.filter(
    ({ cutoutFixtureId }) =>
      cutoutFixtureId === STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE
  )
  const flexStackerFixtures = deckConfig.filter(({ cutoutFixtureId }) =>
    FLEX_STACKER_FIXTURES.includes(cutoutFixtureId)
  )

  return (
    <RobotCoordinateSpace
      height={height}
      viewBox={`${deckDef.cornerOffsetFromOrigin[0]} ${deckDef.cornerOffsetFromOrigin[1]} ${deckDef.dimensions[0]} ${deckDef.dimensions[1]}`}
    >
      {deckDef.locations.cutouts.map(cutout => (
        // give the outside of the base fixture svgs a stroke for extra spacing
        <g key={cutout.id} stroke={COLORS.white} strokeWidth="4">
          <SingleSlotFixture
            cutoutId={cutout.id}
            deckDefinition={deckDef}
            slotClipColor={COLORS.transparent}
            fixtureBaseColor={lightFill}
            showExpansion={showExpansion}
          />
        </g>
      ))}
      {stagingAreaFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <StagingAreaConfigFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {emptyCutouts.map(({ cutoutId }) => (
        <EmptyConfigFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickAdd={handleClickAdd}
          fixtureLocation={cutoutId}
        />
      ))}
      {wasteChuteFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <WasteChuteConfigFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {wasteChuteStagingAreaFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <WasteChuteConfigFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
          hasStagingAreas
        />
      ))}
      {trashBinFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <TrashBinConfigFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {temperatureModuleFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <TemperatureModuleFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {heaterShakerFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <HeaterShakerFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {magneticBlockFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <MagneticBlockFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
          hasStagingArea={
            cutoutFixtureId === STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE
          }
        />
      ))}
      {thermocyclerFixtures.map(({ cutoutId, cutoutFixtureId }) => {
        return (
          <ThermocyclerFixture
            key={cutoutId}
            deckDefinition={deckDef}
            handleClickRemove={
              editableCutoutIds.includes(cutoutId)
                ? handleClickRemove
                : undefined
            }
            fixtureLocation={cutoutId}
            cutoutFixtureId={cutoutFixtureId}
            selected={
              selectedCutoutId != null &&
              THERMOCYCLER_MODULE_CUTOUTS.includes(selectedCutoutId) &&
              THERMOCYCLER_MODULE_CUTOUTS.includes(cutoutId)
            }
          />
        )
      })}
      {absorbanceReaderFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <AbsorbanceReaderFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {flexStackerFixtures.map(({ cutoutId, cutoutFixtureId }) => (
        <FlexStackerFixture
          key={cutoutId}
          deckDefinition={deckDef}
          handleClickRemove={
            editableCutoutIds.includes(cutoutId) ? handleClickRemove : undefined
          }
          fixtureLocation={cutoutId}
          cutoutFixtureId={cutoutFixtureId}
          hasWasteChute={cutoutFixtureId !== FLEX_STACKER_V1_FIXTURE}
          selected={cutoutId === selectedCutoutId}
        />
      ))}
      {additionalStaticFixtures?.map(staticFixture => (
        <StaticFixture
          key={staticFixture.location}
          deckDefinition={deckDef}
          label={staticFixture.label}
          fixtureLocation={staticFixture.location}
        />
      ))}
      <SlotLabels
        robotType={FLEX_ROBOT_TYPE}
        color={darkFill}
        show4thColumn={
          stagingAreaFixtures.length > 0 ||
          wasteChuteStagingAreaFixtures.length > 0 ||
          magneticBlockStagingAreaFixtures.length > 0 ||
          absorbanceReaderFixtures.length > 0
        }
      />
      {children}
    </RobotCoordinateSpace>
  )
}
