import { useEffect } from 'react'
import { css } from 'styled-components'
import {
  Box,
  BaseDeck,
  RobotCoordsForeignDiv,
  COLORS,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  JUSTIFY_FLEX_END,
  useDeckLocationSelect,
} from '@opentrons/components'

import type { ComponentProps } from 'react'
import type {
  LabwareDefinition2,
  RobotType,
  ModuleLocation,
  LabwareLocation,
} from '@opentrons/shared-data'

export type MapKind = 'intervention' | 'deck-config'

export interface InterventionStyleDeckMapContentProps
  extends Pick<
    ComponentProps<typeof BaseDeck>,
    'deckConfig' | 'robotType' | 'labwareOnDeck' | 'modulesOnDeck'
  > {
  kind: 'intervention'
  highlightLabwareEventuallyIn: string[]
}

export interface DeckConfigStyleDeckMapContentProps {
  kind: 'deck-config'
  robotType: RobotType
  setSelectedLocation: (location: ModuleLocation) => void
}

export type DeckMapContentProps =
  | DeckConfigStyleDeckMapContentProps
  | InterventionStyleDeckMapContentProps

export const DeckMapContent: (
  props: DeckMapContentProps
) => JSX.Element = props =>
  props.kind === 'intervention' ? (
    <InterventionStyleDeckMapContent {...props} />
  ) : (
    <DeckConfigStyleDeckMapContent {...props} />
  )

function InterventionStyleDeckMapContent(
  props: InterventionStyleDeckMapContentProps
): JSX.Element {
  const labwareWithHighlights =
    props.labwareOnDeck?.map(labwareOnDeck =>
      props.highlightLabwareEventuallyIn.reduce(
        (found, locationToMatch) =>
          found ||
          getIsLabwareMatch(labwareOnDeck.labwareLocation, locationToMatch),
        false
      )
        ? {
            ...labwareOnDeck,
            labwareChildren: (
              <LabwareHighlight
                highlight={true}
                definition={labwareOnDeck.definition}
              />
            ),
          }
        : labwareOnDeck
    ) ?? []
  const modulesWithHighlights =
    props.modulesOnDeck?.map(module =>
      props.highlightLabwareEventuallyIn.reduce(
        (found, locationToMatch) =>
          found || getIsLabwareMatch(module.moduleLocation, locationToMatch),
        false
      )
        ? {
            ...module,
            moduleChildren:
              module?.nestedLabwareDef != null ? (
                <LabwareHighlight
                  highlight={true}
                  definition={module.nestedLabwareDef}
                />
              ) : undefined,
          }
        : module
    ) ?? []
  return (
    <BaseDeck
      deckConfig={props.deckConfig}
      robotType={props.robotType}
      labwareOnDeck={labwareWithHighlights}
      modulesOnDeck={modulesWithHighlights}
    />
  )
}

function DeckConfigStyleDeckMapContent({
  robotType,
  setSelectedLocation,
}: DeckConfigStyleDeckMapContentProps): JSX.Element {
  const { DeckLocationSelect, selectedLocation } = useDeckLocationSelect(
    robotType,
    'default'
  )
  useEffect(() => {
    setSelectedLocation != null && setSelectedLocation(selectedLocation)
  }, [selectedLocation, setSelectedLocation])
  return <>{DeckLocationSelect}</>
}

export function LabwareHighlight({
  highlight,
  definition,
}: {
  highlight: boolean
  definition: LabwareDefinition2
}): JSX.Element {
  const width = definition.dimensions.xDimension
  const height = definition.dimensions.yDimension

  return (
    <RobotCoordsForeignDiv
      x={definition.cornerOffsetFromSlot.x}
      y={definition.cornerOffsetFromSlot.y}
      {...{ width, height }}
      innerDivProps={{
        display: DISPLAY_FLEX,
        flexDirection: DIRECTION_COLUMN,
        justifyContent: JUSTIFY_FLEX_END,
        width: '100%',
        height: '100%',
      }}
    >
      <Box
        width="100%"
        height="100%"
        css={highlight ? HIGHLIGHT_STYLE : undefined}
      />
    </RobotCoordsForeignDiv>
  )
}

const HIGHLIGHT_STYLE = css`
  border-radius: 7.04px;
  border: 3px solid ${COLORS.blue50};
  box-shadow: 0 0 4px 3px #74b0ff;
`

export function getIsLabwareMatch(
  locationToCheck: LabwareLocation | ModuleLocation,
  deckRootLocation: string
): boolean {
  if (typeof locationToCheck === 'string') {
    // This is the "off deck" case, which we do not render (and therefore return false).
    return false
  } else if ('slotName' in locationToCheck) {
    // This is if we're checking a module or a labware loaded on a slot
    return locationToCheck.slotName === deckRootLocation
  } else if ('addressableAreaName' in locationToCheck) {
    // This is if we're loaded on an AA like a staging slot
    return locationToCheck.addressableAreaName === deckRootLocation
  } else {
    // Defaulted cases:
    // if ('moduleId' in locationToCheck), e.g. on a module:
    // this should never happen because labware that is loaded on a module wouldn't be
    // in onDeckLabware, and onDeckModules is for modules not labware.
    // if ('labwareId' in locationToCheck), e.g. stacked labware:
    // this should never happen because we don't really render it properly here
    return false
  }
}
