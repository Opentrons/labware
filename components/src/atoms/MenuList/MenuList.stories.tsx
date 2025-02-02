import { Flex, STYLE_PROPS } from '../../primitives'
import { DIRECTION_COLUMN } from '../../styles'
import { MenuList as MenuListComponent } from './index'
import { MenuItem } from './MenuItem'

import type { Meta, StoryObj } from '@storybook/react'

const menuBtn = 'Example menu btn'

const meta: Meta<typeof MenuListComponent> = {
  title: 'Helix/Atoms/MenuList',
  component: MenuListComponent,
  argTypes: {
    // Disable all StyleProps
    ...Object.fromEntries(
      [
        ...STYLE_PROPS,
        'as',
        'ref',
        'theme',
        'forwardedAs',
        'className',
      ].map(prop => [prop, { table: { disable: true } }])
    ),
  },
}

export default meta

type Story = StoryObj<typeof MenuListComponent>

export const MenuList: Story = {
  args: {
    children: (
      <Flex flexDirection={DIRECTION_COLUMN}>
        <MenuItem>{menuBtn}</MenuItem>
        <MenuItem>{menuBtn}</MenuItem>
        <MenuItem>{menuBtn}</MenuItem>
      </Flex>
    ),
    isOnDevice: false,
  },
}
