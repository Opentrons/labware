import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import {
  ALIGN_FLEX_START,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_GRID,
  Flex,
  HandleKeypress,
  Icon,
  LegacyStyledText,
  PrimaryButton,
  SPACING,
  TEXT_TRANSFORM_CAPITALIZE,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ControlContainer } from './ControlContainer'
import { TouchControlButton } from './TouchControlButton'

import type { MouseEvent } from 'react'
import type { StepSize } from './types'

const JUMP_SIZE_SUBTITLE = '- / +'
const JUMP_SIZE_ICON_STYLE = css`
  flex-shrink: 0;
`

const stepSizeTranslationKeyByStep: { [stepSize: number]: string } = {
  0.1: 'tiny',
  1: 'small',
  10: 'large',
}

const BUTTON_WRAPPER_STYLE = css`
  display: ${DISPLAY_GRID};
  grid-auto-flow: column;
  grid-gap: ${SPACING.spacing8};
  margin-top: ${SPACING.spacing16};

  @media (max-width: 750px) {
    grid-template-columns: none;
    grid-template-rows: repeat(3, minmax(auto, 50%));
  }
`

const DEFAULT_BUTTON_STYLE = css`
  background-color: ${COLORS.white};
  border: 1px ${COLORS.white} solid;
  height: 3.62rem;
  color: ${COLORS.black90};

  &:focus {
    background-color: ${COLORS.white};
  }

  &:hover {
    background-color: ${COLORS.white};
    color: ${COLORS.black90};
    box-shadow: 0 0 0;
    border: 1px ${COLORS.grey30} solid;
    outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
    outline-offset: 3px;
  }

  &:active {
    background-color: ${COLORS.white};
    color: ${COLORS.blue50};
    border: 1px ${COLORS.blue50} solid;
  }

  &:disabled {
    background-color: inherit;
    color: ${COLORS.grey40};
  }
`
const ACTIVE_BUTTON_STYLE = css`
  ${DEFAULT_BUTTON_STYLE}
  color: ${COLORS.blue50};
  border: 1px ${COLORS.blue50} solid;

  &:hover {
    color: ${COLORS.blue55};
    border: 1px ${COLORS.blue55} solid;
    outline: 0;
  }
`
interface StepSizeControlProps {
  stepSizes: StepSize[]
  currentStepSize: StepSize
  setCurrentStepSize: (stepSize: StepSize) => void
}
export function StepSizeControl(props: StepSizeControlProps): JSX.Element {
  const { stepSizes, currentStepSize, setCurrentStepSize } = props
  const { t } = useTranslation(['robot_calibration'])

  const increaseStepSize: () => void = () => {
    const i = stepSizes.indexOf(currentStepSize)
    if (i < stepSizes.length - 1) setCurrentStepSize(stepSizes[i + 1])
  }

  const decreaseStepSize: () => void = () => {
    const i = stepSizes.indexOf(currentStepSize)
    if (i > 0) setCurrentStepSize(stepSizes[i - 1])
  }

  const handleStepSelect = (event: MouseEvent<HTMLButtonElement>): void => {
    setCurrentStepSize(Number(event.currentTarget.value) as StepSize)
    event.currentTarget.blur()
  }

  return (
    <ControlContainer title={t('jump_size')}>
      <HandleKeypress
        preventDefault
        handlers={[
          { key: '-', onPress: decreaseStepSize },
          { key: '_', onPress: decreaseStepSize },
          { key: '=', onPress: increaseStepSize },
          { key: '+', onPress: increaseStepSize },
        ]}
      >
        <Flex flexDirection={DIRECTION_COLUMN} flex="1">
          <Flex flexDirection={DIRECTION_ROW}>
            <Icon name="jump-size" width="1.2rem" css={JUMP_SIZE_ICON_STYLE} />
            <LegacyStyledText
              textTransform={TEXT_TRANSFORM_CAPITALIZE}
              css={TYPOGRAPHY.pSemiBold}
              marginLeft={SPACING.spacing8}
            >
              {t('jump_size')}
            </LegacyStyledText>
          </Flex>
          <LegacyStyledText color={COLORS.grey60} css={TYPOGRAPHY.labelRegular}>
            {JUMP_SIZE_SUBTITLE}
          </LegacyStyledText>
          <Box css={BUTTON_WRAPPER_STYLE}>
            {stepSizes.map((stepSize: StepSize, index) => {
              return (
                <PrimaryButton
                  key={index}
                  css={
                    currentStepSize === stepSize
                      ? ACTIVE_BUTTON_STYLE
                      : DEFAULT_BUTTON_STYLE
                  }
                  value={stepSize}
                  onClick={handleStepSelect}
                >
                  {t(stepSizeTranslationKeyByStep[stepSize])}
                  <LegacyStyledText
                    color={COLORS.grey60}
                    css={TYPOGRAPHY.labelRegular}
                  >{`${stepSize} mm`}</LegacyStyledText>
                </PrimaryButton>
              )
            })}
          </Box>
        </Flex>
      </HandleKeypress>
    </ControlContainer>
  )
}

export function TouchStepSizeControl(props: StepSizeControlProps): JSX.Element {
  const { stepSizes, currentStepSize, setCurrentStepSize } = props
  const { i18n, t } = useTranslation('robot_calibration')
  return (
    <Flex
      flex="3"
      flexDirection={DIRECTION_COLUMN}
      border={`1px solid ${COLORS.grey50}`}
      borderRadius={BORDERS.borderRadius16}
      padding={SPACING.spacing16}
      gridGap={SPACING.spacing16}
    >
      <TouchControlLabel>
        {i18n.format(t('jump_size'), 'capitalize')}
      </TouchControlLabel>
      {stepSizes.map((stepSize: StepSize, index) => {
        const selected = currentStepSize === stepSize
        return (
          <TouchControlButton
            key={index}
            selected={selected}
            onClick={() => {
              setCurrentStepSize(stepSize)
            }}
          >
            <Flex
              flexDirection={DIRECTION_COLUMN}
              alignItems={ALIGN_FLEX_START}
            >
              <LegacyStyledText
                as="p"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                color={selected ? COLORS.white : COLORS.black90}
              >
                {t(stepSizeTranslationKeyByStep[stepSize])}
              </LegacyStyledText>
              <LegacyStyledText
                as="p"
                color={selected ? COLORS.white : COLORS.grey60}
              >
                {`${stepSize} mm`}
              </LegacyStyledText>
            </Flex>
          </TouchControlButton>
        )
      })}
    </Flex>
  )
}

const TouchControlLabel = styled.p`
  font-size: ${TYPOGRAPHY.fontSize20};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  line-height: ${TYPOGRAPHY.lineHeight24};
`
