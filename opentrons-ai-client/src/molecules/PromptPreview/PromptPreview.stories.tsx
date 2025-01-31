import { I18nextProvider } from 'react-i18next'
import { COLORS, Flex, SPACING } from '@opentrons/components'
import { i18n } from '../../i18n'
import type { Meta, StoryObj } from '@storybook/react'
import { PromptPreview } from '.'

const meta: Meta<typeof PromptPreview> = {
  title: 'AI/molecules/PromptPreview',
  component: PromptPreview,
  decorators: [
    Story => (
      <I18nextProvider i18n={i18n}>
        <Flex
          backgroundColor={COLORS.grey10}
          padding={SPACING.spacing40}
          width="596px"
        >
          <Story />
        </Flex>
      </I18nextProvider>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof PromptPreview>

export const PromptPreviewExample: Story = {
  args: {
    isSubmitButtonEnabled: false,
    handleSubmit: () => {
      alert('Submit button clicked')
    },
    promptPreviewData: [
      {
        title: 'Application',
        items: [
          'Cherrypicking',
          'I have a Chlorine Reagent Set (Total), Ultra Low Range',
        ],
      },
      {
        title: 'Instruments',
        items: [
          'Opentrons Flex',
          'Flex 1-Channel 50 uL',
          'Flex 8-Channel 1000 uL',
        ],
      },
      {
        title: 'Modules',
        items: [
          'Thermocycler GEN2',
          'Heater-Shaker with Universal Flat Adaptor',
        ],
      },
      {
        title: 'Labware and Liquids',
        items: [
          'Opentrons 96 Well Plate',
          'Thermocycler GEN2',
          'Opentrons 96 Deep Well Plate',
          'Liquid 1: In commodo lectus nec erat commodo blandit. Etiam leo dui, porttitor vel imperdiet sed, tristique nec nisl. Maecenas pulvinar sapien quis sodales imperdiet.',
          'Liquid 2: Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        ],
      },
      {
        title: 'Steps',
        items: [
          'Fill the first column of a Elisa plate with 100 uL of Liquid 1',
          'Fill the second column of a Elisa plate with 100 uL of Liquid 2',
        ],
      },
    ],
  },
}

export const PromptPreviewPlaceholderMessage: Story = {
  args: {
    isSubmitButtonEnabled: false,
    handleSubmit: () => {
      alert('Submit button clicked')
    },
  },
}
