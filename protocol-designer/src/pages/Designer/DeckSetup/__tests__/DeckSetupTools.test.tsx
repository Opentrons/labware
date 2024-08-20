import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FLEX_ROBOT_TYPE, fixture96Plate } from '@opentrons/shared-data'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import { deleteContainer } from '../../../../labware-ingred/actions'
import { createModule, deleteModule } from '../../../../step-forms/actions'
import { getRobotType } from '../../../../file-data/selectors'
import {
  getEnableAbsorbanceReader,
  getEnableMoam,
} from '../../../../feature-flags/selectors'
import {
  createDeckFixture,
  deleteDeckFixture,
} from '../../../../step-forms/actions/additionalItems'
import { getDeckSetupForActiveItem } from '../../../../top-selectors/labware-locations'
import { DeckSetupTools } from '../DeckSetupTools'
import { LabwareTools } from '../LabwareTools'

import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../../../../feature-flags/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../top-selectors/labware-locations')
vi.mock('../LabwareTools')
vi.mock('../../../../labware-ingred/actions')
vi.mock('../../../../step-forms/actions')
vi.mock('../../../../step-forms/actions/additionalItems')

const render = (props: React.ComponentProps<typeof DeckSetupTools>) => {
  return renderWithProviders(<DeckSetupTools {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('DeckSetupTools', () => {
  let props: React.ComponentProps<typeof DeckSetupTools>

  beforeEach(() => {
    props = {
      cutoutId: 'cutoutD3',
      slot: 'D3',
      onCloseClick: vi.fn(),
    }
    vi.mocked(LabwareTools).mockReturnValue(<div>mock labware tools</div>)
    vi.mocked(getRobotType).mockReturnValue(FLEX_ROBOT_TYPE)
    vi.mocked(getEnableAbsorbanceReader).mockReturnValue(true)
    vi.mocked(getEnableMoam).mockReturnValue(true)
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {},
      modules: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
  })
  it('should render the relevant modules and fixtures for slot D3 on Flex with tabs', () => {
    render(props)
    screen.getByText('Add a module')
    screen.getByText('Add a fixture')
    screen.getByText('Customize slot D3')
    screen.getByText('Deck hardware')
    screen.getByText('Labware')
    screen.getByText('Absorbance Plate Reader Module GEN1')
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Magnetic Block GEN1')
    screen.getByText('Temperature Module GEN2')
    screen.getByText('Staging area')
    screen.getByText('Waste chute')
    screen.getByText('Trash bin')
    screen.getByText('Waste chute and staging area')
  })
  it('should render the labware tab', () => {
    render(props)
    screen.getByText('Deck hardware')
    // click on labware tab
    fireEvent.click(screen.getByText('Labware'))
    screen.getByText('mock labware tools')
  })
  it('should clear the slot from all items when the clear cta is called', () => {
    vi.mocked(getDeckSetupForActiveItem).mockReturnValue({
      labware: {
        labId: {
          slot: 'D3',
          id: 'labId',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
        },
        lab2: {
          slot: 'labId',
          id: 'labId2',
          labwareDefURI: 'mockUri',
          def: fixture96Plate as LabwareDefinition2,
        },
      },
      pipettes: {},
      modules: {
        mod: {
          model: 'heaterShakerModuleV1',
          type: 'heaterShakerModuleType',
          id: 'modId',
          slot: 'D3',
          moduleState: {} as any,
        },
      },
      additionalEquipmentOnDeck: {
        fixture: { name: 'stagingArea', id: 'mockId', location: 'cutoutD3' },
      },
    })
    render(props)
    fireEvent.click(screen.getByText('Clear'))
    expect(vi.mocked(deleteContainer)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(deleteModule)).toHaveBeenCalled()
    expect(vi.mocked(deleteDeckFixture)).toHaveBeenCalled()
  })
  it('should close and add h-s module when done is called', () => {
    render(props)
    fireEvent.click(screen.getByText('Heater-Shaker Module GEN1'))
    fireEvent.click(screen.getByText('Done'))
    expect(props.onCloseClick).toHaveBeenCalled()
    expect(vi.mocked(createModule)).toHaveBeenCalled()
  })
  it('should close and add waste chute and staging area when done is called', () => {
    render(props)
    fireEvent.click(screen.getByText('Waste chute and staging area'))
    fireEvent.click(screen.getByText('Done'))
    expect(props.onCloseClick).toHaveBeenCalled()
    expect(vi.mocked(createDeckFixture)).toHaveBeenCalledTimes(2)
  })
})
