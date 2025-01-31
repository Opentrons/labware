import { SlotBase } from './SlotBase'
import { SlotClip } from './SlotClip'

import type { SVGProps } from 'react'
import type { DeckDefinition, ModuleType } from '@opentrons/shared-data'

export type StagingAreaLocation =
  | 'cutoutA3'
  | 'cutoutB3'
  | 'cutoutC3'
  | 'cutoutD3'

interface StagingAreaFixtureProps extends SVGProps<SVGGElement> {
  cutoutId: StagingAreaLocation
  deckDefinition: DeckDefinition
  moduleType?: ModuleType
  fixtureBaseColor?: SVGProps<SVGPathElement>['fill']
  slotClipColor?: SVGProps<SVGPathElement>['stroke']
  showExtensions?: boolean
}

export function StagingAreaFixture(
  props: StagingAreaFixtureProps
): JSX.Element | null {
  const {
    cutoutId,
    deckDefinition,
    fixtureBaseColor,
    slotClipColor,
    ...restProps
  } = props

  const cutoutDef = deckDefinition?.locations.cutouts.find(
    s => s.id === cutoutId
  )
  if (cutoutDef == null) {
    console.warn(
      `cannot render StagingAreaFixture, no cutout named: ${cutoutDef} in deck def ${deckDefinition?.otId}`
    )
    return null
  }

  const contentsByCutoutLocation: {
    [cutoutId in StagingAreaLocation]: JSX.Element
  } = {
    cutoutA3: (
      <>
        <SlotBase
          d="M314.8,417.1h329.9c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,415.1,312.4,417.1,314.8,417.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,398.9V409h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,329.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,398.9V409H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,329.8v-10.7H447" stroke={slotClipColor} />
        <SlotClip d="M490,398.9v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M490,329.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M621.8,398.9v10.1h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M621.8,329.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutB3: (
      <>
        <SlotBase
          d="M314.8,310h329.9c2.4,0,4.3-1.9,4.3-4.3v-97.2c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.2C310.5,308.1,312.4,310,314.8,310z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,291.9V302h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,222.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,291.9V302H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,222.8v-10.7H447" stroke={slotClipColor} />
        <SlotClip d="M490,291.9v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M490,222.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M621.8,291.9v10.1h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M621.8,222.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutC3: (
      <>
        <SlotBase
          d="M314.8,203.1h329.9c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,201.2,312.4,203.1,314.8,203.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,185v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,115.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,185v10.1H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,115.8v-10.7H447" stroke={slotClipColor} />
        <SlotClip d="M490,185v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M490,115.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M621.8,185v10.1h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M621.8,115.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutD3: (
      <>
        <SlotBase
          d="M314.8,96.1h329.9c2.4,0,4.3-1.9,4.3-4.3V-5.6c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,94.2,312.4,96.1,314.8,96.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,77.9V88h10.8" stroke={slotClipColor} />
        <SlotClip d="M326,8.8V-1.7h10.6" stroke={slotClipColor} />
        <SlotClip d="M457.8,77.9V88H447" stroke={slotClipColor} />
        <SlotClip d="M457.8,8.8V-1.9H447" stroke={slotClipColor} />
        <SlotClip d="M490,77.9v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M490,8.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M621.8,77.9v10.1h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M621.8,8.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
  }

  return <g {...restProps}>{contentsByCutoutLocation[cutoutId]}</g>
}
