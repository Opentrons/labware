import { Fragment } from 'react'
import { useSelector } from 'react-redux'
import {
  COLORS,
  FixedTrash,
  FlexTrash,
  SingleSlotFixture,
  StagingAreaFixture,
  WasteChuteFixture,
  WasteChuteStagingAreaFixture,
} from '@opentrons/components'
import { OT2_ROBOT_TYPE, getPositionFromSlotId } from '@opentrons/shared-data'
import { getInitialDeckSetup } from '../../../step-forms/selectors'
import { LabwareOnDeck as LabwareOnDeckComponent } from '../../../organisms'
import { lightFill, darkFill } from './DeckSetupContainer'
import { getAdjacentLabware } from './utils'
import type {
  TrashCutoutId,
  StagingAreaLocation,
  DeckLabelProps,
} from '@opentrons/components'
import type {
  CutoutId,
  DeckDefinition,
  RobotType,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import type { Fixture } from './constants'

interface FixtureRenderProps {
  fixture: Fixture
  cutout: CutoutId
  robotType: RobotType
  deckDef: DeckDefinition
  showHighlight?: boolean
  tagInfo?: DeckLabelProps[]
}
export const FixtureRender = (props: FixtureRenderProps): JSX.Element => {
  const { fixture, cutout, deckDef, robotType, showHighlight, tagInfo } = props
  const deckSetup = useSelector(getInitialDeckSetup)
  const { labware } = deckSetup
  const adjacentLabware = getAdjacentLabware(fixture, cutout, labware)

  const renderLabwareOnDeck = (): JSX.Element | null => {
    if (!adjacentLabware) return null
    const slotPosition = getPositionFromSlotId(adjacentLabware.slot, deckDef)
    return (
      <LabwareOnDeckComponent
        x={slotPosition != null ? slotPosition[0] : 0}
        y={slotPosition != null ? slotPosition[1] : 0}
        labwareOnDeck={adjacentLabware}
      />
    )
  }

  switch (fixture) {
    case 'stagingArea': {
      return (
        <Fragment key={`fixtureRender_${fixture}_${adjacentLabware?.id ?? 0}`}>
          <StagingAreaFixture
            cutoutId={cutout as StagingAreaLocation}
            deckDefinition={deckDef}
            slotClipColor={darkFill}
            fixtureBaseColor={lightFill}
          />
          {renderLabwareOnDeck()}
        </Fragment>
      )
    }
    case 'trashBin': {
      if (robotType === OT2_ROBOT_TYPE && showHighlight) {
        return <FixedTrash highlight />
      } else {
        return (
          <Fragment key={`fixtureRender_${fixture}`}>
            <SingleSlotFixture
              cutoutId={cutout}
              deckDefinition={deckDef}
              slotClipColor={COLORS.transparent}
              fixtureBaseColor={lightFill}
            />
            <FlexTrash
              robotType={robotType}
              trashIconColor={lightFill}
              trashCutoutId={cutout as TrashCutoutId}
              backgroundColor={COLORS.grey50}
              showHighlight={showHighlight}
              tagInfo={tagInfo}
            />
          </Fragment>
        )
      }
    }
    case 'wasteChute': {
      return (
        <WasteChuteFixture
          key={`fixtureRender_${fixture}`}
          cutoutId={cutout as typeof WASTE_CHUTE_CUTOUT}
          deckDefinition={deckDef}
          fixtureBaseColor={lightFill}
          showHighlight={showHighlight}
          tagInfo={tagInfo}
        />
      )
    }
    case 'wasteChuteAndStagingArea': {
      return (
        <Fragment key={`fixtureRender_${fixture}_${adjacentLabware?.id ?? 0}`}>
          <WasteChuteStagingAreaFixture
            cutoutId={cutout as typeof WASTE_CHUTE_CUTOUT}
            deckDefinition={deckDef}
            fixtureBaseColor={lightFill}
            showHighlight={showHighlight}
            tagInfo={tagInfo}
          />
          {renderLabwareOnDeck()}
        </Fragment>
      )
    }
  }
}
