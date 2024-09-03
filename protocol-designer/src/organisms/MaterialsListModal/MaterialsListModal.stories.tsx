import * as React from 'react'
import { I18nextProvider } from 'react-i18next'
import { i18n } from '../../assets/localization'
import { MaterialsListModal as MaterialsListModalComponent } from '.'

import type { Meta, StoryObj } from '@storybook/react'

const mockHardware = [
  {
    id: 'mockHardware',
    model: 'temperatureModuleV2',
    moduleState: {
      type: 'temperatureModuleType',
      status: 'TEMPERATURE_DEACTIVATED',
      targetTemperature: null,
    },
    slot: 'C1',
    type: 'temperatureModuleType',
  },
]

const mockLabware = [
  {
    def: {
      metadata: {
        displayCategory: 'tipRack',
        displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
        displayVolumeUnits: 'µL',
        tags: [],
        namespace: 'opentrons',
      },
    },
    id: 'mockLabware',
    labwareDefURI: 'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
    slot: 'D3',
  },
]

// ToDo (kk:09/03/2024) add test when implementing liquids part completely
const mockLiquids = [] as any[]

const meta: Meta<typeof MaterialsListModalComponent> = {
  title: 'Protocol-Designer/Organisms/MaterialsListModal',
  component: MaterialsListModalComponent,
  decorators: [
    Story => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof MaterialsListModalComponent>

export const MaterialsListModal: Story = {
  args: {
    hardware: mockHardware,
    labware: mockLabware,
    liquids: mockLiquids,
  },
}

export const EmptyMaterialsListModal: Story = {
  args: {
    hardware: [],
    labware: [],
    liquids: [],
  },
}
