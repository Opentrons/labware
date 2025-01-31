// jog controls component
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  ALIGN_FLEX_START,
  ALIGN_STRETCH,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_GRID,
  Flex,
  HandleKeypress,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  PrimaryButton,
  RESPONSIVENESS,
  SPACING,
  TEXT_ALIGN_LEFT,
  TYPOGRAPHY,
} from '@opentrons/components'
import { ControlContainer } from './ControlContainer'
import { HORIZONTAL_PLANE, VERTICAL_PLANE } from './constants'
import { TouchControlButton } from './TouchControlButton'

import type { MouseEvent } from 'react'
import type { CSSProperties } from 'styled-components'
import type { IconName } from '@opentrons/components'
import type { Jog, Plane, Sign, Bearing, Axis, StepSize } from './types'

interface Control {
  bearing: Bearing
  keyName: string
  shiftKey: boolean
  gridColumn: number
  iconName: IconName
  axis: Axis
  sign: Sign
  disabled: boolean
}
interface ControlsContents {
  controls: Control[]
  title: string
  subtitle: string
}

const CONTROLS_CONTENTS_BY_PLANE: Record<Plane, ControlsContents> = {
  [VERTICAL_PLANE]: {
    controls: [
      {
        keyName: 'ArrowLeft',
        shiftKey: false,
        bearing: 'left',
        iconName: 'ot-arrow-left',
        axis: 'x',
        sign: -1,
        gridColumn: 0,
        disabled: true,
      },
      {
        keyName: 'ArrowRight',
        shiftKey: false,
        bearing: 'right',
        iconName: 'ot-arrow-right',
        axis: 'x',
        sign: 1,
        gridColumn: 2,
        disabled: true,
      },
      {
        keyName: 'ArrowUp',
        shiftKey: true,
        bearing: 'up',
        iconName: 'ot-arrow-up',
        axis: 'z',
        sign: 1,
        gridColumn: 1,
        disabled: false,
      },
      {
        keyName: 'ArrowDown',
        shiftKey: true,
        bearing: 'down',
        iconName: 'ot-arrow-down',
        axis: 'z',
        sign: -1,
        gridColumn: 1,
        disabled: false,
      },
    ],
    title: 'Z-axis',
    subtitle: 'Shift + Arrow Keys',
  },
  [HORIZONTAL_PLANE]: {
    controls: [
      {
        keyName: 'ArrowLeft',
        shiftKey: false,
        bearing: 'left',
        iconName: 'ot-arrow-left',
        axis: 'x',
        sign: -1,
        gridColumn: 0,
        disabled: false,
      },
      {
        keyName: 'ArrowRight',
        shiftKey: false,
        bearing: 'right',
        iconName: 'ot-arrow-right',
        axis: 'x',
        sign: 1,
        gridColumn: 2,
        disabled: false,
      },
      {
        keyName: 'ArrowUp',
        shiftKey: false,
        bearing: 'back',
        iconName: 'ot-arrow-up',
        axis: 'y',
        sign: 1,
        gridColumn: 1,
        disabled: false,
      },
      {
        keyName: 'ArrowDown',
        shiftKey: false,
        bearing: 'forward',
        iconName: 'ot-arrow-down',
        axis: 'y',
        sign: -1,
        gridColumn: 1,
        disabled: false,
      },
    ],
    title: 'X- and Y-axis',
    subtitle: 'Arrow Keys',
  },
}

const DIRECTION_CONTROL_LAYOUT = css`
  flex: 1;
  flex-direction: ${DIRECTION_ROW};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  grid-gap: ${SPACING.spacing16};
  min-width: 313px;

  @media (max-width: 750px) {
    flex-direction: ${DIRECTION_COLUMN};
  }
`

const PLANE_BUTTONS_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
  min-width: 11.8125rem;

  @media (max-width: 750px) {
    flex-direction: ${DIRECTION_ROW};
    width: 100%;
  }
`

const DEFAULT_BUTTON_STYLE = css`
  display: flex;
  border: 1px ${COLORS.white} solid;
  justify-content: ${JUSTIFY_FLEX_START};
  align-items: ${ALIGN_CENTER};
  background-color: ${COLORS.white};
  color: ${COLORS.black90};
  grid-gap: ${SPACING.spacing8};
  padding: ${SPACING.spacing8};

  &:focus {
    background-color: ${COLORS.white};
  }

  &:hover {
    background-color: ${COLORS.white};
    color: ${COLORS.black90};
    box-shadow: 0 0 0;
    border: 1px ${COLORS.grey30} solid;
  }

  &:active {
    background-color: ${COLORS.white};
    color: ${COLORS.blue50};
    border: 1px ${COLORS.blue50} solid;
  }

  &:disabled {
    background-color: ${COLORS.white};
    color: ${COLORS.grey40};
  }
`

const ACTIVE_BUTTON_STYLE = css`
  ${DEFAULT_BUTTON_STYLE}
  color: ${COLORS.blue50};
  border: 1px ${COLORS.blue50} solid;

  &:hover {
    color: ${COLORS.blue60};
    border: 1px ${COLORS.blue60} solid;
  }
`

interface DirectionControlProps {
  planes: Plane[]
  jog: Jog
  stepSize: StepSize
  initialPlane?: Plane
  buttonColor?: string
}

export function DirectionControl(props: DirectionControlProps): JSX.Element {
  const { planes, jog, stepSize, initialPlane } = props
  const [currentPlane, setCurrentPlane] = useState<Plane>(
    initialPlane ?? planes[0]
  )
  const { t } = useTranslation(['robot_calibration'])

  const handlePlane = (event: MouseEvent<HTMLButtonElement>): void => {
    setCurrentPlane(event.currentTarget.value as Plane)
    event.currentTarget.blur()
  }

  return (
    <ControlContainer title={t('direction_controls')}>
      <Flex css={DIRECTION_CONTROL_LAYOUT}>
        <Flex css={PLANE_BUTTONS_STYLE}>
          {planes.map((plane: Plane) => {
            const { title, subtitle } = CONTROLS_CONTENTS_BY_PLANE[plane]
            return (
              <PrimaryButton
                key={plane}
                title={plane}
                css={
                  currentPlane === plane
                    ? ACTIVE_BUTTON_STYLE
                    : DEFAULT_BUTTON_STYLE
                }
                value={plane}
                onClick={handlePlane}
              >
                <Icon
                  name={
                    plane === 'vertical' ? 'vertical-plane' : 'horizontal-plane'
                  }
                  height="1.375rem"
                  flex="1 0 auto"
                />
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  alignItems={ALIGN_FLEX_START}
                  flex="1 1 auto"
                >
                  {title}
                  <LegacyStyledText
                    textAlign={TEXT_ALIGN_LEFT}
                    alignSelf={ALIGN_STRETCH}
                    color={COLORS.grey50}
                    css={TYPOGRAPHY.labelRegular}
                  >
                    {subtitle}
                  </LegacyStyledText>
                </Flex>
              </PrimaryButton>
            )
          })}
        </Flex>
        <Flex justifyContent={JUSTIFY_CENTER} alignItems={ALIGN_CENTER}>
          <HandleKeypress
            preventDefault
            handlers={[
              ...CONTROLS_CONTENTS_BY_PLANE.vertical.controls,
              ...CONTROLS_CONTENTS_BY_PLANE.horizontal.controls,
            ]
              .filter(control => !control.disabled)
              .map(({ keyName, shiftKey, axis, sign }) => ({
                key: keyName,
                shiftKey,
                onPress: () => {
                  setCurrentPlane(shiftKey ? 'vertical' : 'horizontal')
                  jog(axis, sign, stepSize)
                },
              }))}
          >
            <ArrowKeys plane={currentPlane} jog={jog} stepSize={stepSize} />
          </HandleKeypress>
        </Flex>
      </Flex>
    </ControlContainer>
  )
}

const ARROW_GRID_STYLES = css`
  display: ${DISPLAY_GRID};
  max-width: 8.75rem;
  grid-template-columns: repeat(6, 1fr);
  grid-template-areas:
    '.         .         .         .         .          .         '
    '.         .         ArrowUp   ArrowUp   .          .         '
    'ArrowLeft ArrowLeft ArrowUp   ArrowUp   ArrowRight ArrowRight'
    'ArrowLeft ArrowLeft ArrowDown ArrowDown ArrowRight ArrowRight'
    '.         .         ArrowDown ArrowDown .          .         '
    '.         .         .         .         .          .         ';

  grid-gap: ${SPACING.spacing4};
  align-items: ${ALIGN_CENTER};

  @media (max-width: 750px) {
    max-width: 12.5rem;
  }
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    max-width: 415px;
    grid-gap: ${SPACING.spacing20};
    grid-template-areas:
      '.         .         ArrowUp   ArrowUp   .          .         '
      'ArrowLeft ArrowLeft ArrowUp   ArrowUp   ArrowRight ArrowRight'
      'ArrowLeft ArrowLeft ArrowDown ArrowDown ArrowRight ArrowRight'
      '.         .         ArrowDown ArrowDown .          .         ';
  }
`
const ARROW_BUTTON_STYLES = css`
  color: ${COLORS.grey50};
  background-color: ${COLORS.white};

  border: ${BORDERS.lineBorder};
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  padding: 0;
  align-items: ${ALIGN_CENTER};
  justify-content: ${JUSTIFY_CENTER};
  &:hover {
    background-color: ${COLORS.white};
    color: ${COLORS.grey60};
    box-shadow: 0 0 0;
    border: 1px ${COLORS.grey30} solid;
  }

  &:active {
    background-color: ${COLORS.white};
    color: ${COLORS.grey60};
    border: 1px ${COLORS.grey30} solid;
  }

  &:focus {
    background-color: ${COLORS.white};
  }

  &:disabled {
    background-color: ${COLORS.white};
    color: ${COLORS.grey30};
  }

  @media (max-width: 750px) {
    width: 4rem;
    height: 4rem;
  }
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 125px;
    height: 125px;
    background-color: ${COLORS.grey35};
    color: ${COLORS.black90};
    border-radius: ${BORDERS.borderRadius16};

    &:hover {
      background-color: ${COLORS.grey40};
      color: ${COLORS.black80};
      border: 1px ${COLORS.transparent} solid;
    }

    &:active {
      background-color: ${COLORS.grey40};
      color: ${COLORS.grey60};
    }

    &:focus {
      background-color: ${COLORS.grey40};
    }

    &:disabled {
      background-color: ${COLORS.grey35};
      color: ${COLORS.grey50};
      border: 1px ${COLORS.transparent} solid;
    }
  }
`
const ARROW_ICON_STYLES = css`
  height: 1.125rem;
  width: 1.125rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 84px;
    height: 84px;
  }
`

const BUTTON_ALIGN_BY_KEY_NAME: {
  [keyName: string]: CSSProperties['alignSelf']
} = {
  ArrowUp: ALIGN_FLEX_END,
  ArrowDown: ALIGN_FLEX_START,
  ArrowLeft: ALIGN_CENTER,
  ArrowRight: ALIGN_CENTER,
}
interface ArrowKeysProps {
  plane: Plane
  jog: Jog
  stepSize: StepSize
}

export const ArrowKeys = (props: ArrowKeysProps): JSX.Element => {
  const { plane, jog, stepSize } = props
  const controls = CONTROLS_CONTENTS_BY_PLANE[plane].controls

  return (
    <Box css={ARROW_GRID_STYLES}>
      {controls.map(
        ({ bearing, iconName, axis, sign, gridColumn, keyName, disabled }) => (
          <PrimaryButton
            key={bearing}
            onClick={() => jog(axis, sign, stepSize)}
            css={ARROW_BUTTON_STYLES}
            title={bearing}
            gridArea={keyName}
            alignSelf={BUTTON_ALIGN_BY_KEY_NAME[keyName] ?? 'center'}
            disabled={disabled}
          >
            <Icon css={ARROW_ICON_STYLES} name={iconName} />
          </PrimaryButton>
        )
      )}
    </Box>
  )
}

export function TouchDirectionControl(
  props: DirectionControlProps
): JSX.Element {
  const { planes, jog, stepSize, initialPlane } = props
  const [currentPlane, setCurrentPlane] = useState<Plane>(
    initialPlane ?? planes[0]
  )
  const { i18n, t } = useTranslation(['robot_calibration'])

  return (
    <Flex
      flex="1"
      flexDirection={DIRECTION_COLUMN}
      border={`1px solid ${COLORS.grey50}`}
      borderRadius={BORDERS.borderRadius16}
      padding={SPACING.spacing16}
      gridGap={SPACING.spacing16}
    >
      <Flex css={DIRECTION_CONTROL_LAYOUT}>
        <Flex css={PLANE_BUTTONS_STYLE}>
          <TouchControlLabel>
            {i18n.format(t('jog_controls'), 'capitalize')}
          </TouchControlLabel>
          {planes.map((plane: Plane) => {
            const selected = currentPlane === plane
            return (
              <TouchControlButton
                key={plane}
                selected={selected}
                onClick={() => {
                  setCurrentPlane(plane)
                }}
              >
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  alignItems={ALIGN_FLEX_START}
                  justifyContent={JUSTIFY_CENTER}
                  height="74px"
                >
                  <LegacyStyledText
                    as="p"
                    fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                    color={selected ? COLORS.white : COLORS.black90}
                  >
                    {CONTROLS_CONTENTS_BY_PLANE[plane].title}
                  </LegacyStyledText>
                </Flex>
              </TouchControlButton>
            )
          })}
        </Flex>
        <Flex justifyContent={JUSTIFY_CENTER} alignItems={ALIGN_CENTER}>
          <ArrowKeys plane={currentPlane} jog={jog} stepSize={stepSize} />
        </Flex>
      </Flex>
    </Flex>
  )
}

const TouchControlLabel = styled.p`
  font-size: ${TYPOGRAPHY.fontSize20};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  line-height: ${TYPOGRAPHY.lineHeight24};
`
