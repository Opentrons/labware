import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { useState, useLayoutEffect } from 'react'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  ALIGN_CENTER,
  ALIGN_END,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LargeButton,
  OVERFLOW_AUTO,
  SPACING,
  StyledText,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import one from '../../assets/images/onboarding_animation_1.webm'
import two from '../../assets/images/onboarding_animation_2.webm'
import three from '../../assets/images/onboarding_animation_3.webm'
import four from '../../assets/images/onboarding_animation_4.webm'
import five from '../../assets/images/onboarding_animation_5.webm'
import six from '../../assets/images/onboarding_animation_6.webm'
import { LINK_BUTTON_STYLE } from '../../atoms'

import type { ReactNode } from 'react'
import type { RobotType } from '@opentrons/shared-data'

interface WizardBodyProps {
  robotType: RobotType
  stepNumber: number
  header: string
  children: ReactNode
  proceed: () => void
  disabled?: boolean
  goBack?: () => void
  subHeader?: string
  tooltipOnDisabled?: string
}

const OT2_GIFS: Record<number, string> = {
  2: new URL(
    '../../assets/images/onboarding_animation_ot2_2.gif',
    import.meta.url
  ).href,
  3: new URL(
    '../../assets/images/onboarding_animation_ot2_3.gif',
    import.meta.url
  ).href,
  4: new URL(
    '../../assets/images/onboarding_animation_ot2_4.gif',
    import.meta.url
  ).href,
}

const ONBOARDING_ANIMATIONS: Record<number, string> = {
  1: one,
  2: two,
  3: three,
  4: four,
  5: five,
  6: six,
}

export function WizardBody(props: WizardBodyProps): JSX.Element {
  const {
    stepNumber,
    header,
    children,
    goBack,
    subHeader,
    proceed,
    disabled = false,
    tooltipOnDisabled,
    robotType,
  } = props
  const { t } = useTranslation('shared')
  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: 'top',
  })
  const [asset, setAsset] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<boolean>(false)

  useLayoutEffect(() => {
    const videoAsset = ONBOARDING_ANIMATIONS[stepNumber]
    setLoaded(false)
    setAsset(videoAsset)
    const timeout = setTimeout(() => {
      setLoaded(true)
    }, 100)
    return () => {
      clearTimeout(timeout)
    }
  }, [stepNumber])

  return (
    <Flex
      padding={SPACING.spacing16}
      gridGap={SPACING.spacing16}
      height="calc(100vh - 48px)"
    >
      <Flex
        width="60%"
        padding={SPACING.spacing80}
        flexDirection={DIRECTION_COLUMN}
        backgroundColor={COLORS.white}
        borderRadius={BORDERS.borderRadius16}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        gridGap={SPACING.spacing24}
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
          height="100%"
          overflowY={OVERFLOW_AUTO}
        >
          <StyledText
            color={COLORS.grey60}
            desktopStyle="bodyDefaultSemiBold"
            textTransform={TYPOGRAPHY.textTransformUppercase}
          >
            {t('shared:step_count', { current: stepNumber })}
          </StyledText>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing60}>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
              <StyledText desktopStyle="displayBold">{header}</StyledText>
              {subHeader != null ? (
                <StyledText
                  desktopStyle="headingLargeRegular"
                  color={COLORS.grey60}
                >
                  {subHeader}
                </StyledText>
              ) : null}
            </Flex>
            {children}
          </Flex>
        </Flex>
        <Flex
          alignSelf={goBack != null ? 'auto' : ALIGN_END}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
        >
          {goBack != null ? (
            <Btn onClick={goBack} css={LINK_BUTTON_STYLE} height="1.5rem">
              <StyledText desktopStyle="bodyLargeSemiBold">
                {t('go_back')}
              </StyledText>
            </Btn>
          ) : null}
          <Flex {...targetProps} maxHeight="3.5rem">
            <LargeButton
              disabled={disabled}
              onClick={proceed}
              iconName="arrow-right"
              buttonText={t('shared:confirm')}
              height="3.5rem"
              width="8.5625rem"
            />
          </Flex>
          {tooltipOnDisabled != null && disabled ? (
            <Tooltip tooltipProps={tooltipProps}>{tooltipOnDisabled}</Tooltip>
          ) : null}
        </Flex>
      </Flex>
      <Flex
        width="40%"
        css={css`
          opacity: ${loaded ? 1 : 0};
          transition: opacity 0.5s ease-in-out;
        `}
      >
        {robotType === FLEX_ROBOT_TYPE || stepNumber === 1 ? (
          <video
            preload="auto"
            css={css`
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: ${BORDERS.borderRadius16};
            `}
            autoPlay
            loop={false}
            controls={false}
            aria-label={`onboarding animation for page ${stepNumber}`}
          >
            <source src={asset ?? ''} type="video/webm" />
          </video>
        ) : (
          <img
            src={OT2_GIFS[stepNumber]}
            width="100%"
            height="100%"
            css={css`
              object-fit: cover;
              border-radius: ${BORDERS.borderRadius16};
            `}
          />
        )}
      </Flex>
    </Flex>
  )
}
