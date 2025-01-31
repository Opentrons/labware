import styled from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_FLEX_START,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_FIXED,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  CURSOR_DEFAULT,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from '/app/atoms/buttons/constants'

import { SmallButton } from '/app/atoms/buttons'
import { InlineNotification } from '/app/atoms/InlineNotification'

import type { ComponentProps, MouseEventHandler, ReactNode } from 'react'
import type { IconName, StyleProps } from '@opentrons/components'
import type { InlineNotificationProps } from '/app/atoms/InlineNotification'
import type {
  IconPlacement,
  SmallButtonTypes,
} from '/app/atoms/buttons/SmallButton'

interface ChildNavigationProps extends StyleProps {
  header: string
  onClickBack?: MouseEventHandler
  buttonText?: ReactNode
  inlineNotification?: InlineNotificationProps
  onClickButton?: MouseEventHandler
  buttonType?: SmallButtonTypes
  buttonIsDisabled?: boolean
  iconName?: IconName
  iconPlacement?: IconPlacement
  secondaryButtonProps?: ComponentProps<typeof SmallButton>
  ariaDisabled?: boolean
}

export function ChildNavigation({
  buttonText,
  header,
  inlineNotification,
  onClickBack,
  onClickButton,
  buttonType = 'primary',
  iconName,
  iconPlacement,
  secondaryButtonProps,
  buttonIsDisabled,
  ariaDisabled = false,
  ...styleProps
}: ChildNavigationProps): JSX.Element {
  return (
    <Flex
      alignItems={ALIGN_CENTER}
      height="7.75rem"
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      paddingX={SPACING.spacing40}
      paddingY={SPACING.spacing32}
      position={POSITION_FIXED}
      top="0"
      left="0"
      width="100%"
      backgroundColor={COLORS.white}
      {...styleProps}
    >
      <Flex gridGap={SPACING.spacing16} justifyContent={JUSTIFY_FLEX_START}>
        {onClickBack != null ? (
          <IconButton
            onClick={onClickBack}
            data-testid="ChildNavigation_Back_Button"
          >
            <Icon name="back" size="3rem" color={COLORS.black90} />
          </IconButton>
        ) : null}
        <LegacyStyledText as="h2" fontWeight={TYPOGRAPHY.fontWeightBold}>
          {header}
        </LegacyStyledText>
      </Flex>
      {onClickButton != null && buttonText != null ? (
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
          {secondaryButtonProps != null ? (
            <SmallButton
              data-testid="ChildNavigation_Secondary_Button"
              {...secondaryButtonProps}
            />
          ) : null}

          <SmallButton
            buttonType={buttonType}
            buttonCategory={buttonType === 'primary' ? 'rounded' : 'default'}
            buttonText={buttonText}
            onClick={onClickButton}
            iconName={iconName}
            iconPlacement={iconPlacement}
            disabled={buttonIsDisabled}
            data-testid="ChildNavigation_Primary_Button"
            ariaDisabled={ariaDisabled}
          />
        </Flex>
      ) : null}
      {inlineNotification != null ? (
        <InlineNotification
          heading={inlineNotification.heading}
          hug={true}
          type={inlineNotification.type}
        />
      ) : null}
    </Flex>
  )
}

const IconButton = styled('button')`
  border-radius: ${SPACING.spacing4};
  max-height: 100%;
  background-color: ${COLORS.white};

  &:focus-visible {
    box-shadow: ${ODD_FOCUS_VISIBLE};
    background-color: ${COLORS.grey35};
  }
  &:disabled {
    background-color: transparent;
  }
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${CURSOR_DEFAULT};
  }
`
