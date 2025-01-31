import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import { renderWithProviders } from '../../../../../__testing-utils__'
import { i18n } from '../../../../../assets/localization'
import { AddStepButton } from '../AddStepButton'
import { getEnableComment } from '../../../../../feature-flags/selectors'
import {
  getCurrentFormIsPresaved,
  getInitialDeckSetup,
} from '../../../../../step-forms/selectors'
import { getIsMultiSelectMode } from '../../../../../ui/steps'

import type { ComponentProps } from 'react'

vi.mock('../../../../../feature-flags/selectors')
vi.mock('../../../../../ui/steps')
vi.mock('../../../../../step-forms/selectors')

const render = (props: ComponentProps<typeof AddStepButton>) => {
  return renderWithProviders(<AddStepButton {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AddStepButton', () => {
  let props: ComponentProps<typeof AddStepButton>

  beforeEach(() => {
    props = {
      hasText: true,
    }
    vi.mocked(getEnableComment).mockReturnValue(true)
    vi.mocked(getCurrentFormIsPresaved).mockReturnValue(false)
    vi.mocked(getIsMultiSelectMode).mockReturnValue(false)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      modules: {
        hs: {
          model: HEATERSHAKER_MODULE_V1,
          type: HEATERSHAKER_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'A1',
        },
        tc: {
          model: THERMOCYCLER_MODULE_V1,
          type: THERMOCYCLER_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'B1',
        },
        temp: {
          model: TEMPERATURE_MODULE_V1,
          type: TEMPERATURE_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'C1',
        },
        mag: {
          model: MAGNETIC_MODULE_V1,
          type: MAGNETIC_MODULE_TYPE,
          id: 'mockId',
          moduleState: {} as any,
          slot: 'D1',
        },
      },
      labware: {},
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
  })

  it('renders add step button and clicking on it renders the overflow menu with all modules', () => {
    render(props)
    fireEvent.click(screen.getByText('Add Step'))
    screen.getByText('Comment')
    screen.getByText('Transfer')
    screen.getByText('Mix')
    screen.getByText('Pause')
    screen.getByText('Thermocycler')
    screen.getByText('Heater-shaker')
    screen.getByText('Temperature')
    screen.getByText('Magnet')
  })

  it('should not render texts if hasText is false', () => {
    props.hasText = false
    render(props)
    const text = screen.queryByText('Add Step')
    expect(text).toBeNull()
  })
})
