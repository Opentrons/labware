import React from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n } from '../../i18n'
import { SideBar as SideBarComponent } from './index'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof SideBarComponent> = {
  title: 'AI/molecules/SideBar',
  component: SideBarComponent,
  decorators: [
    Story => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SideBarComponent>
export const SideBar: Story = {}
