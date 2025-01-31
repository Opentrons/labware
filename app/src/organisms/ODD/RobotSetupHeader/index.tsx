import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { SmallButton } from '/app/atoms/buttons'
import { InlineNotification } from '/app/atoms/InlineNotification'

import type { MouseEventHandler, ReactNode } from 'react'
import type { InlineNotificationProps } from '/app/atoms/InlineNotification'

interface RobotSetupHeaderProps {
  header: string
  buttonText?: ReactNode
  inlineNotification?: InlineNotificationProps
  onClickBack?: MouseEventHandler
  onClickButton?: MouseEventHandler
}

export function RobotSetupHeader({
  buttonText,
  header,
  inlineNotification,
  onClickBack,
  onClickButton,
}: RobotSetupHeaderProps): JSX.Element {
  return (
    <Flex paddingX={SPACING.spacing40} paddingY={SPACING.spacing32}>
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        position={POSITION_RELATIVE}
        width="100%"
      >
        {onClickBack != null ? (
          <Btn
            aria-label="back-button"
            onClick={onClickBack}
            position={POSITION_ABSOLUTE}
            left="0"
          >
            <Icon name="back" size="3rem" color={COLORS.black90} />
          </Btn>
        ) : null}
        <LegacyStyledText as="h2" fontWeight={TYPOGRAPHY.fontWeightBold}>
          {header}
        </LegacyStyledText>
        {onClickButton != null && buttonText != null ? (
          <SmallButton
            buttonCategory="rounded"
            buttonText={buttonText}
            onClick={onClickButton}
            position={POSITION_ABSOLUTE}
            right="0"
          />
        ) : null}
        {inlineNotification != null ? (
          <InlineNotification
            heading={inlineNotification.heading}
            hug={true}
            type={inlineNotification.type}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
