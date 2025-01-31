import type * as React from 'react'

import SuccessIcon from '/app/assets/images/icon_success.png'

import {
  LegacyStyledText,
  Flex,
  DIRECTION_COLUMN,
  Box,
} from '@opentrons/components'
import { InlineNotification } from '/app/atoms/InlineNotification'

import { TwoColumn as TwoColumnComponent } from './'
import { StandInContent } from './story-utils/StandIn'

import type { Meta, StoryObj } from '@storybook/react'

interface StorybookArgs {
  leftStandIn: boolean
  rightStandIn: boolean
  leftImageUrl?: string[]
  rightImageUrl?: string[]
  leftNotificationHeading?: string
  leftNotificationMessage?: string
  leftNotificationType: 'alert' | 'error' | 'neutral'
  rightNotificationHeading?: string
  rightNotificationMessage?: string
  rightNotificationType: 'alert' | 'error' | 'neutral'
  leftText?: string
  rightText?: string
}

interface NotificationProps {
  heading?: string
  message?: string
  type?: string
}
function Notification({
  heading,
  message,
  type,
}: NotificationProps): JSX.Element | null {
  const hasComponent =
    (heading != null && heading.length > 0) ||
    (message != null && message.length > 0)
  return hasComponent ? (
    <InlineNotification heading={heading} message={message} type={type} />
  ) : null
}

interface TextProps {
  text?: string
}
function Text({ text }: TextProps): JSX.Element | null {
  const hasComponent = text != null && text.length > 0
  return hasComponent ? <LegacyStyledText>{text}</LegacyStyledText> : null
}

interface ImageProps {
  imageUrl?: string[]
}
function Image({ imageUrl }: ImageProps): JSX.Element | null {
  const hasComponent =
    imageUrl != null && imageUrl.length > 0 && imageUrl[0].length > 0
  return hasComponent ? (
    <img src={new URL(imageUrl[0], import.meta.url).href} width="100%" />
  ) : null
}

interface SectionBodyProps {
  text?: string
  imageUrl?: string[]
  notificationHeading?: string
  notificationMessage?: string
  notificationType: string
}
function SectionBody({
  text,
  imageUrl,
  notificationHeading,
  notificationMessage,
  notificationType,
}: SectionBodyProps): JSX.Element | null {
  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Notification
        heading={notificationHeading}
        message={notificationMessage}
        type={notificationType}
      />
      <Text text={text} />
      <Image imageUrl={imageUrl} />
    </Flex>
  )
}

function SectionBodyOrStandIn(
  props: SectionBodyProps & { standIn: boolean }
): JSX.Element {
  return props.standIn ? <StandInContent /> : <SectionBody {...props} />
}

const meta: Meta<React.ComponentProps<TwoColumnComponent> & StorybookArgs> = {
  title: 'App/Molecules/InterventionModal/TwoColumn',
  component: TwoColumnComponent,
  render: args => (
    <Box width="100%" height="100%" borderWidth="8px">
      <TwoColumnComponent>
        <SectionBodyOrStandIn
          standIn={args.leftStandIn}
          text={args.leftText}
          imageUrl={args.leftImageUrl}
          notificationHeading={args.leftNotificationHeading}
          notificationMessage={args.leftNotificationMessage}
          notificationType={args.leftNotificationType}
        />
        <SectionBodyOrStandIn
          standIn={args.rightStandIn}
          text={args.rightText}
          imageUrl={args.rightImageUrl}
          notificationHeading={args.rightNotificationHeading}
          notificationMessage={args.rightNotificationmessage}
          notificationType={args.rightNotificationType}
        />
      </TwoColumnComponent>
    </Box>
  ),
  argTypes: {
    leftStandIn: {
      control: {
        type: 'boolean',
      },
      defaultValue: true,
    },
    rightStandIn: {
      control: {
        type: 'boolean',
      },
      defaultValue: true,
    },
    leftText: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'leftStandIn', truthy: false },
    },
    rightText: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'rightStandIn', truthy: false },
    },
    leftImageUrl: {
      control: {
        type: 'file',
        accept: '.png',
      },
      defaultValue: undefined,
      if: { arg: 'leftStandIn', truthy: false },
    },
    rightImageUrl: {
      control: {
        type: 'file',
        accept: '.png',
      },
      defaultValue: undefined,
      if: { arg: 'rightStandIn', truthy: false },
    },
    leftNotificationHeading: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'leftStandIn', truthy: false },
    },
    leftNotificationMessage: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'leftStandIn', truthy: false },
    },
    leftNotificationType: {
      control: {
        type: 'select',
      },
      options: ['alert', 'error', 'neutral', undefined],
      defaultValue: undefined,
      if: { arg: 'leftStandIn', truthy: false },
    },
    rightNotificationHeading: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'rightStandIn', truthy: false },
    },
    rightNotificationMessage: {
      control: {
        type: 'text',
      },
      defaultValue: undefined,
      if: { arg: 'rightStandIn', truthy: false },
    },
    rightNotificationType: {
      control: {
        type: 'select',
      },
      options: ['alert', 'error', 'neutral', undefined],
      defaultValue: undefined,
      if: { arg: 'rightStandIn', truthy: false },
    },
  },
}
export default meta

type Story = StoryObj<typeof TwoColumnComponent>

export const TwoColumnWithStandins: Story = {
  args: {
    leftStandIn: true,
    rightStandIn: true,
    leftText: undefined,
    rightText: undefined,
    leftImageUrl: undefined,
    rightImageUrl: undefined,
    leftNotificationHeading: undefined,
    leftNotificationMessage: undefined,
    leftNotificationType: 'neutral',
    rightNotificationHeading: undefined,
    rightNotificationMessage: undefined,
    rightNotificationType: 'alert',
  },
}

export const ExampleTwoColumn: Story = {
  args: {
    leftStandIn: false,
    rightStandIn: false,
    leftText:
      'Hello here is some text you can type a lot with even multiple lines',
    leftNotificationHeading: 'Oh no',
    leftNotificationMessage: 'Theres a notification',
    leftNotificationType: 'alert',
    leftImageUrl: undefined,
    rightImageUrl: [SuccessIcon],
    rightNotificationHeading: undefined,
    rightNotificationMessage: undefined,
    rightNotificationType: 'neutral',
  },
}
