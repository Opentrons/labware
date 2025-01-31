import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__testing-utils__'
import { i18n } from '../../../../../../assets/localization'
import {
  getMagneticLabwareOptions,
  getMagnetLabwareEngageHeight,
} from '../../../../../../ui/modules/selectors'
import {
  getInitialDeckSetup,
  getModuleEntities,
} from '../../../../../../step-forms/selectors'
import { MagnetTools } from '../MagnetTools'
import type { ComponentProps } from 'react'
import type * as ModulesSelectors from '../../../../../../ui/modules/selectors'

vi.mock('../../../../../../step-forms/selectors')

vi.mock('../../../../../../ui/modules/selectors', async importOriginal => {
  const actualFields = await importOriginal<typeof ModulesSelectors>()
  return {
    ...actualFields,
    getMagnetLabwareEngageHeight: vi.fn(),
    getMagneticLabwareOptions: vi.fn(),
  }
})
const render = (props: ComponentProps<typeof MagnetTools>) => {
  return renderWithProviders(<MagnetTools {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('MagnetTools', () => {
  let props: ComponentProps<typeof MagnetTools>

  beforeEach(() => {
    props = {
      formData: {
        id: 'magnet',
        stepType: 'magnet',
        moduleId: 'magnetId',
        magnetAction: 'engage',
      } as any,
      focusHandlers: {
        blur: vi.fn(),
        focus: vi.fn(),
        dirtyFields: [],
        focusedField: null,
      },
      visibleFormErrors: [],
      toolboxStep: 1,
      propsForFields: {
        magnetAction: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'magnetAction',
          updateValue: vi.fn(),
          value: 'engage',
        },
        engageHeight: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'engage height',
          updateValue: vi.fn(),
          value: 10,
        },
      },
      showFormErrors: false,
      tab: 'aspirate',
      setTab: vi.fn(),
    }
    vi.mocked(getMagneticLabwareOptions).mockReturnValue([
      { name: 'mock labware in mock module in slot abc', value: 'mockValue' },
    ])
    vi.mocked(getModuleEntities).mockReturnValue({
      magnetId: {
        id: 'magnetId',
        model: 'magneticModuleV2',
        type: 'magneticModuleType',
      },
    })
    vi.mocked(getMagnetLabwareEngageHeight).mockReturnValue(null)
    vi.mocked(getInitialDeckSetup).mockReturnValue({
      labware: {},
      modules: {
        module: {
          id: 'mockId',
          slot: '10',
          type: 'magneticModuleType',
          moduleState: { engaged: false, type: 'magneticModuleType' },
          model: 'magneticModuleV1',
        },
      },
      additionalEquipmentOnDeck: {},
      pipettes: {},
    })
  })

  it('renders the text and a switch button for v2', () => {
    render(props)
    screen.getByText('Module')
    screen.getByText('Magnet state')
    screen.getByLabelText('Engage')
    const toggleButton = screen.getByRole('switch')
    screen.getByText('Engage height')
    screen.getByText('Must be between -2.5 mm to 25 mm.')

    fireEvent.click(toggleButton)
    expect(props.propsForFields.magnetAction.updateValue).toHaveBeenCalled()
  })
  it('renders the input text for v1', () => {
    vi.mocked(getModuleEntities).mockReturnValue({
      magnetId: {
        id: 'magnetId',
        model: 'magneticModuleV1',
        type: 'magneticModuleType',
      },
    })
    render(props)
    screen.getByText('Must be between 0 to 45.')
  })
})
