import { I18nextProvider } from 'react-i18next'
import { i18n } from '../../i18n'
import { Chat as ChatComponent } from './index'

import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ChatComponent> = {
  title: 'AI/organisms/ChatContainer',
  component: ChatComponent,
  decorators: [
    Story => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof ChatComponent>
export const ChatContainer: Story = {}
