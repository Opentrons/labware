// jog controls component
import { useState } from 'react'
import { css } from 'styled-components'
import {
  Flex,
  ALIGN_STRETCH,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
} from '@opentrons/components'

import { DirectionControl, TouchDirectionControl } from './DirectionControl'
import { StepSizeControl, TouchStepSizeControl } from './StepSizeControl'
import {
  HORIZONTAL_PLANE,
  VERTICAL_PLANE,
  SMALL_STEP_SIZE_MM,
  MEDIUM_STEP_SIZE_MM,
  LARGE_STEP_SIZE_MM,
  DEFAULT_STEP_SIZES,
} from './constants'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { Jog, Plane, StepSize } from './types'

export type { Jog }
export interface JogControlsProps extends StyleProps {
  jog: Jog
  planes?: Plane[]
  stepSizes?: StepSize[]
  auxiliaryControl?: ReactNode | null
  directionControlButtonColor?: string
  initialPlane?: Plane
  isOnDevice?: boolean
}

export {
  HORIZONTAL_PLANE,
  VERTICAL_PLANE,
  SMALL_STEP_SIZE_MM,
  MEDIUM_STEP_SIZE_MM,
  LARGE_STEP_SIZE_MM,
}

export function JogControls(props: JogControlsProps): JSX.Element {
  const {
    jog,
    directionControlButtonColor,
    stepSizes = DEFAULT_STEP_SIZES,
    planes = [HORIZONTAL_PLANE, VERTICAL_PLANE],
    auxiliaryControl = null,
    initialPlane = HORIZONTAL_PLANE,
    isOnDevice = false,
    ...styleProps
  } = props
  const [currentStepSize, setCurrentStepSize] = useState<StepSize>(stepSizes[0])

  const controls = isOnDevice ? (
    <>
      <TouchStepSizeControl
        {...{ currentStepSize, setCurrentStepSize, stepSizes }}
      />
      <TouchDirectionControl
        planes={planes}
        jog={jog}
        stepSize={currentStepSize}
        buttonColor={directionControlButtonColor}
        initialPlane={initialPlane}
      />
    </>
  ) : (
    <>
      <Flex
        alignItems={ALIGN_CENTER}
        css={css`
          flex: 1;
          @media screen and (max-width: 750px) {
            flex: 3;
          }
        `}
      >
        <StepSizeControl
          {...{ currentStepSize, setCurrentStepSize, stepSizes }}
        />
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        css={css`
          flex: 1;
          @media screen and (max-width: 750px) {
            flex: 7;
          }
        `}
      >
        <DirectionControl
          planes={planes}
          jog={jog}
          stepSize={currentStepSize}
          buttonColor={directionControlButtonColor}
          initialPlane={initialPlane}
        />
      </Flex>
    </>
  )
  return (
    <Flex
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignSelf={ALIGN_STRETCH}
      gridGap={SPACING.spacing8}
      {...styleProps}
    >
      {controls}
      {auxiliaryControl}
    </Flex>
  )
}
