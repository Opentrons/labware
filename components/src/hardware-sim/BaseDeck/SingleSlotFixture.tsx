import { SlotBase } from './SlotBase'
import { SlotClip } from './SlotClip'

import type { SVGProps } from 'react'
import type {
  CutoutId,
  DeckDefinition,
  ModuleType,
} from '@opentrons/shared-data'

interface SingleSlotFixtureProps extends SVGProps<SVGGElement> {
  cutoutId: CutoutId
  deckDefinition: DeckDefinition
  moduleType?: ModuleType
  fixtureBaseColor?: SVGProps<SVGPathElement>['fill']
  slotClipColor?: SVGProps<SVGPathElement>['stroke']
  showExpansion?: boolean
}

export function SingleSlotFixture(
  props: SingleSlotFixtureProps
): JSX.Element | null {
  const {
    cutoutId,
    deckDefinition,
    fixtureBaseColor,
    slotClipColor,
    showExpansion = false,
    ...restProps
  } = props

  const cutoutDef = deckDefinition?.locations.cutouts.find(
    s => s.id === cutoutId
  )
  if (cutoutDef == null) {
    console.warn(
      `cannot render SingleSlotFixture, no cutout named: ${cutoutDef} in deck def ${deckDefinition?.otId}`
    )
    return null
  }

  const contentsByCutoutLocation: {
    [cutoutId in CutoutId]: JSX.Element
  } = {
    cutoutA1: (
      <>
        {showExpansion ? (
          <SlotBase
            fill={fixtureBaseColor}
            d="M-97.8,496.6h239c2.3,0,4.2-1.9,4.2-4.2v-70c0-2.3-1.9-4.2-4.2-4.2h-239c-2.3,0-4.2,1.9-4.2,4.2v70 C-102,494.7-100.1,496.6-97.8,496.6z"
          />
        ) : null}
        <SlotBase
          fill={fixtureBaseColor}
          d="M-97.7,417.1h238.8c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H-97.7c-2.4,0-4.3,1.9-4.3,4.3v97.4 C-102,415.1-100.1,417.1-97.7,417.1z"
        />
        <SlotClip d="M-1.9,398.9V409H8.9" stroke={slotClipColor} />
        <SlotClip d="M-1.9,329.8v-10.5H8.7" stroke={slotClipColor} />
        <SlotClip d="M129.9,398.9V409h-10.8" stroke={slotClipColor} />
        <SlotClip d="M129.9,329.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutA2: (
      <>
        <SlotBase
          d="M150.8,417.1h154.3c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H150.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C146.5,415.1,148.4,417.1,150.8,417.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M162.1,398.9V409h10.8" stroke={slotClipColor} />,
        <SlotClip d="M162.1,329.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M293.9,398.9V409h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M293.9,329.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutA3: (
      <>
        <SlotBase
          d="M314.8,417.1h238.9c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,415.1,312.4,417.1,314.8,417.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,398.9V409h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,329.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,398.9V409H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,329.8v-10.7H447" stroke={slotClipColor} />
      </>
    ),
    cutoutB1: (
      <>
        <SlotBase
          d="M-97.7,310h238.8c2.4,0,4.3-1.9,4.3-4.3v-97.2c0-2.4-1.9-4.3-4.3-4.3H-97.7c-2.4,0-4.3,1.9-4.3,4.3v97.2C-102,308.1-100.1,310-97.7,310z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M-1.9,291.9V302H8.9" stroke={slotClipColor} />,
        <SlotClip d="M-1.9,222.8v-10.5H8.7" stroke={slotClipColor} />,
        <SlotClip d="M129.9,291.9V302h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M129.9,222.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutB2: (
      <>
        <SlotBase
          d="M150.8,310h154.3c2.4,0,4.3-1.9,4.3-4.3v-97.2c0-2.4-1.9-4.3-4.3-4.3H150.8c-2.4,0-4.3,1.9-4.3,4.3v97.2C146.5,308.1,148.4,310,150.8,310z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M162.1,291.9V302h10.8" stroke={slotClipColor} />,
        <SlotClip d="M162.1,222.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M293.9,291.9V302h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M293.9,222.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutB3: (
      <>
        <SlotBase
          d="M314.8,310h238.9c2.4,0,4.3-1.9,4.3-4.3v-97.2c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.2C310.5,308.1,312.4,310,314.8,310z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,291.9V302h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,222.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,291.9V302H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,222.8v-10.7H447" stroke={slotClipColor} />
      </>
    ),
    cutoutC1: (
      <>
        <SlotBase
          d="M-97.7,203.1h238.8c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H-97.7c-2.4,0-4.3,1.9-4.3,4.3v97.4C-102,201.2-100.1,203.1-97.7,203.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M-1.9,185v10.1H8.9" stroke={slotClipColor} />
        <SlotClip d="M-1.9,115.8v-10.5H8.7" stroke={slotClipColor} />
        <SlotClip d="M129.9,185v10.1h-10.8" stroke={slotClipColor} />
        <SlotClip d="M129.9,115.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutC2: (
      <>
        <SlotBase
          d="M150.8,203.1h154.3c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H150.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C146.5,201.2,148.4,203.1,150.8,203.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M162.1,185v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M162.1,115.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M293.9,185v10.1h-10.8" stroke={slotClipColor} />,
        <SlotClip d="M293.9,115.8v-10.7h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutC3: (
      <>
        <SlotBase
          d="M314.8,203.1h238.9c2.4,0,4.3-1.9,4.3-4.3v-97.4c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,201.2,312.4,203.1,314.8,203.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,185v10.1h10.8" stroke={slotClipColor} />,
        <SlotClip d="M326,115.8v-10.5h10.6" stroke={slotClipColor} />,
        <SlotClip d="M457.8,185v10.1H447" stroke={slotClipColor} />,
        <SlotClip d="M457.8,115.8v-10.7H447" stroke={slotClipColor} />
      </>
    ),
    cutoutD1: (
      <>
        <SlotBase
          fill={fixtureBaseColor}
          d="M-97.7,96.1h238.8c2.4,0,4.3-1.9,4.3-4.3V-5.6c0-2.4-1.9-4.3-4.3-4.3H-97.7c-2.4,0-4.3,1.9-4.3,4.3v97.4C-102,94.2-100.1,96.1-97.7,96.1z"
        />
        <SlotClip d="M-1.9,77.9V88H8.9" stroke={slotClipColor} />
        <SlotClip d="M-1.9,8.8V-1.7H8.7" stroke={slotClipColor} />
        <SlotClip d="M129.9,77.9V88h-10.8" stroke={slotClipColor} />
        <SlotClip d="M129.9,8.8V-1.9h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutD2: (
      <>
        <SlotBase
          fill={fixtureBaseColor}
          d="M150.8,96.1h154.3c2.4,0,4.3-1.9,4.3-4.3V-5.6c0-2.4-1.9-4.3-4.3-4.3H150.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C146.5,94.2,148.4,96.1,150.8,96.1z"
        />
        <SlotClip d="M162.1,77.9V88h10.8" stroke={slotClipColor} />
        <SlotClip d="M162.1,8.8V-1.7h10.6" stroke={slotClipColor} />
        <SlotClip d="M293.9,77.9V88h-10.8" stroke={slotClipColor} />
        <SlotClip d="M293.9,8.8V-1.9h-10.8" stroke={slotClipColor} />
      </>
    ),
    cutoutD3: (
      <>
        <SlotBase
          d="M314.8,96.1h238.9c2.4,0,4.3-1.9,4.3-4.3V-5.6c0-2.4-1.9-4.3-4.3-4.3H314.8c-2.4,0-4.3,1.9-4.3,4.3v97.4C310.5,94.2,312.4,96.1,314.8,96.1z"
          fill={fixtureBaseColor}
        />
        <SlotClip d="M326,77.9V88h10.8" stroke={slotClipColor} />
        <SlotClip d="M326,8.8V-1.7h10.6" stroke={slotClipColor} />
        <SlotClip d="M457.8,77.9V88H447" stroke={slotClipColor} />
        <SlotClip d="M457.8,8.8V-1.9H447" stroke={slotClipColor} />
      </>
    ),
  }

  return <g {...restProps}>{contentsByCutoutLocation[cutoutId]}</g>
}
