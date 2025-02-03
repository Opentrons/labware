import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'

import { i18n } from '../../assets/localization'
import { configureStore } from '../../configureStore'
import { MaterialsListModal as MaterialsListModalComponent } from '.'

import type { LiquidEntities } from '@opentrons/step-generation'
import type { Meta, StoryObj } from '@storybook/react'
import type { LabwareOnDeck, ModuleOnDeck } from '../../step-forms'
import type { FixtureInList } from '.'

const mockStore = configureStore()
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
] as ModuleOnDeck[]

const mockFixture = [
  { location: 'cutoutB3', name: 'trashBin', id: 'mockId:trashBin' },
] as FixtureInList[]

const mockLabware = [
  {
    def: {
      metadata: {
        displayCategory: 'tipRack',
        displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
        displayVolumeUnits: 'µL',
        tags: [],
        namespace: 'opentrons',
      } as any,
    },
    id: 'mockLabware',
    labwareDefURI: 'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
    slot: 'D3',
  },
] as LabwareOnDeck[]

const mockLiquids = {} as LiquidEntities

const meta: Meta<typeof MaterialsListModalComponent> = {
  title: 'Protocol-Designer/Organisms/MaterialsListModal',
  component: MaterialsListModalComponent,
  decorators: [
    Story => (
      <Provider store={mockStore}>
        <I18nextProvider i18n={i18n}>
          <Story />
        </I18nextProvider>
      </Provider>
    ),
  ],
}

export default meta

type Story = StoryObj<typeof MaterialsListModalComponent>

export const MaterialsListModal: Story = {
  args: {
    hardware: mockHardware,
    fixtures: mockFixture,
    labware: mockLabware,
    liquids: mockLiquids,
  },
}

export const EmptyMaterialsListModal: Story = {
  args: {
    hardware: [],
    fixtures: [],
    labware: [],
    liquids: {},
  },
}
