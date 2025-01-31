import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { animated, useSpring, easings } from '@react-spring/web'
import {
  getDeckDefFromRobotType,
  getModuleDef2,
  getPositionFromSlotId,
} from '@opentrons/shared-data'
import { LabwareRender } from '../Labware'

import { COLORS } from '../../helix-design-system'
import { IDENTITY_AFFINE_TRANSFORM, multiplyMatrices } from '../utils'
import { BaseDeck } from '../BaseDeck'

import type {
  LoadedLabware,
  LoadedModule,
  Coordinates,
  LabwareDefinition2,
  LabwareLocation,
  RobotType,
  DeckDefinition,
  DeckConfiguration,
} from '@opentrons/shared-data'

import type { ReactNode } from 'react'
import type { StyleProps } from '../../primitives'

const getModulePosition = (
  deckDef: DeckDefinition,
  moduleId: string,
  loadedModules: LoadedModule[]
): Coordinates | null => {
  const loadedModule = loadedModules.find(m => m.id === moduleId)
  if (loadedModule == null) return null
  const modSlot = deckDef.locations.addressableAreas.find(
    s => s.id === loadedModule.location.slotName
  )
  if (modSlot == null) return null

  const modPosition = getPositionFromSlotId(modSlot.id, deckDef)
  if (modPosition == null) return null
  const [modX, modY] = modPosition

  const deckSpecificAffineTransform =
    getModuleDef2(loadedModule.model).slotTransforms?.[deckDef.otId]?.[
      modSlot.id
    ]?.labwareOffset ?? IDENTITY_AFFINE_TRANSFORM
  const [[labwareX], [labwareY], [labwareZ]] = multiplyMatrices(
    [[modX], [modY], [1], [1]],
    deckSpecificAffineTransform
  )
  return { x: labwareX, y: labwareY, z: labwareZ }
}

function getLabwareCoordinates({
  deckDef,
  location,
  loadedModules,
  loadedLabware,
}: {
  deckDef: DeckDefinition
  location: LabwareLocation
  loadedModules: LoadedModule[]
  loadedLabware: LoadedLabware[]
}): Coordinates | null {
  if (location === 'offDeck') {
    return null
  } else if ('labwareId' in location) {
    const loadedAdapter = loadedLabware.find(l => l.id === location.labwareId)
    if (loadedAdapter == null) return null
    const loadedAdapterLocation = loadedAdapter.location

    if (
      loadedAdapterLocation === 'offDeck' ||
      'labwareId' in loadedAdapterLocation
    )
      return null
    //  adapter on module
    if ('moduleId' in loadedAdapterLocation) {
      return getModulePosition(
        deckDef,
        loadedAdapterLocation.moduleId,
        loadedModules
      )
    }

    //  adapter on deck
    const loadedAdapterSlotPosition = getPositionFromSlotId(
      'slotName' in loadedAdapterLocation
        ? loadedAdapterLocation.slotName
        : loadedAdapterLocation.addressableAreaName,
      deckDef
    )
    return loadedAdapterSlotPosition != null
      ? {
          x: loadedAdapterSlotPosition[0],
          y: loadedAdapterSlotPosition[1],
          z: loadedAdapterSlotPosition[2],
        }
      : null
  } else if ('addressableAreaName' in location) {
    const slotCoordinateTuple = getPositionFromSlotId(
      location.addressableAreaName,
      deckDef
    )
    return slotCoordinateTuple != null
      ? {
          x: slotCoordinateTuple[0],
          y: slotCoordinateTuple[1],
          z: slotCoordinateTuple[2],
        }
      : null
  } else if ('slotName' in location) {
    const slotCoordinateTuple = getPositionFromSlotId(
      location.slotName,
      deckDef
    )
    return slotCoordinateTuple != null
      ? {
          x: slotCoordinateTuple[0],
          y: slotCoordinateTuple[1],
          z: slotCoordinateTuple[2],
        }
      : null
  } else {
    return getModulePosition(deckDef, location.moduleId, loadedModules)
  }
}

const SPLASH_Y_BUFFER_MM = 10

interface MoveLabwareOnDeckProps extends StyleProps {
  robotType: RobotType
  movedLabwareDef: LabwareDefinition2
  initialLabwareLocation: LabwareLocation
  finalLabwareLocation: LabwareLocation
  loadedModules: LoadedModule[]
  loadedLabware: LoadedLabware[]
  deckConfig: DeckConfiguration
  backgroundItems?: ReactNode
  deckFill?: string
}
export function MoveLabwareOnDeck(
  props: MoveLabwareOnDeckProps
): JSX.Element | null {
  const {
    robotType,
    movedLabwareDef,
    loadedLabware,
    initialLabwareLocation,
    finalLabwareLocation,
    loadedModules,
    deckConfig,
    backgroundItems = null,
    ...styleProps
  } = props
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [robotType])

  const initialSlotId =
    initialLabwareLocation === 'offDeck' ||
    !('slotName' in initialLabwareLocation)
      ? deckDef.locations.addressableAreas[1].id
      : initialLabwareLocation.slotName

  const slotPosition = getPositionFromSlotId(initialSlotId, deckDef) ?? [
    0,
    0,
    0,
  ]

  const offDeckPosition = {
    x: slotPosition[0],
    y:
      deckDef.cornerOffsetFromOrigin[1] -
      movedLabwareDef.dimensions.xDimension -
      SPLASH_Y_BUFFER_MM,
  }
  const initialPosition =
    getLabwareCoordinates({
      deckDef,
      location: initialLabwareLocation,
      loadedModules,
      loadedLabware,
    }) ?? offDeckPosition
  const finalPosition =
    getLabwareCoordinates({
      deckDef,
      location: finalLabwareLocation,
      loadedModules,
      loadedLabware,
    }) ?? offDeckPosition

  const shouldReset = usePositionChangeReset(initialPosition, finalPosition)

  const springProps = useSpring({
    reset: shouldReset,
    config: { duration: 1000, easing: easings.easeInOutSine },
    from: {
      ...initialPosition,
      splashOpacity: 0,
      deckOpacity: 0,
    },
    to: [
      { deckOpacity: 1 },
      { splashOpacity: 1 },
      { splashOpacity: 0 },
      { ...finalPosition },
      { splashOpacity: 1 },
      { splashOpacity: 0 },
      { deckOpacity: 0 },
    ],
    loop: true,
  })

  if (deckDef == null) {
    return null
  }

  return (
    <BaseDeck
      deckConfig={deckConfig}
      robotType={robotType}
      svgProps={{
        style: { opacity: springProps.deckOpacity },
        ...styleProps,
      }}
      animatedSVG
    >
      {backgroundItems}
      <AnimatedG style={{ x: springProps.x, y: springProps.y }}>
        <g
          transform={`translate(${movedLabwareDef.cornerOffsetFromSlot.x}, ${movedLabwareDef.cornerOffsetFromSlot.y})`}
        >
          <LabwareRender definition={movedLabwareDef} highlight={true} />
          <AnimatedG style={{ opacity: springProps.splashOpacity }}>
            <path
              d="M158.027 111.537L154.651 108.186M145.875 113L145.875 109.253M161 99.3038L156.864 99.3038M11.9733 10.461L15.3495 13.8128M24.1255 9L24.1254 12.747M9 22.6962L13.1357 22.6962"
              stroke={COLORS.blue50}
              strokeWidth="3.57"
              strokeLinecap="round"
              transform="scale(.97, -1) translate(-19, -104)"
            />
          </AnimatedG>
        </g>
      </AnimatedG>
    </BaseDeck>
  )
}

function usePositionChangeReset(
  initialPosition: { x: number; y: number },
  finalPosition: { x: number; y: number }
): boolean {
  const [shouldReset, setShouldReset] = useState(false)

  useLayoutEffect(() => {
    if (shouldReset) {
      setShouldReset(false)
      return
    }

    const isNewPosition =
      previousInitialRef.current?.x !== initialPosition.x ||
      previousInitialRef.current?.y !== initialPosition.y ||
      previousFinalRef.current?.x !== finalPosition.x ||
      previousFinalRef.current?.y !== finalPosition.y

    if (isNewPosition) {
      setShouldReset(true)
    }

    previousInitialRef.current = initialPosition
    previousFinalRef.current = finalPosition
  }, [initialPosition, finalPosition])

  const previousInitialRef = useRef(initialPosition)
  const previousFinalRef = useRef(finalPosition)

  return shouldReset
}
/**
 * These animated components needs to be split out because react-spring and styled-components don't play nice
 * @see https://github.com/pmndrs/react-spring/issues/1515 */
const AnimatedG = styled(animated.g as any)``
