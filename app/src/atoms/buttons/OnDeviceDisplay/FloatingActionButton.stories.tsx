import { FloatingActionButton } from '.'
import { ICON_DATA_BY_NAME } from '@opentrons/components/src/icons/icon-data'
import type { Story, Meta } from '@storybook/react'
import * as React from 'react'

export default {
  title: 'ODD/Atoms/Buttons/FloatingActionButton',
  argTypes: {
    iconName: {
      control: {
        type: 'select',
        options: Object.keys(ICON_DATA_BY_NAME),
      },
      defaultValue: undefined,
    },
    onClick: { action: 'clicked' },
  },
} as Meta

const FloatingActionButtonTemplate: Story<
  React.ComponentProps<typeof FloatingActionButton>
> = args => <FloatingActionButton {...args} />
export const FloatingActionButtonComponent = FloatingActionButtonTemplate.bind(
  {}
)
FloatingActionButtonComponent.args = {
  buttonText: 'Button text',
  disabled: false,
}
