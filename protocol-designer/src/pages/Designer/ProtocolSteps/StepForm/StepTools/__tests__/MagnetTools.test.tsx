import type * as React from 'react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__testing-utils__'
import { i18n } from '../../../../../../assets/localization'
import {
  getMagneticLabwareOptions,
  getMagnetLabwareEngageHeight,
} from '../../../../../../ui/modules/selectors'
import { getModuleEntities } from '../../../../../../step-forms/selectors'
import { MagnetTools } from '../MagnetTools'
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
const render = (props: React.ComponentProps<typeof MagnetTools>) => {
  return renderWithProviders(<MagnetTools {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('MagnetTools', () => {
  let props: React.ComponentProps<typeof MagnetTools>

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
    }
    vi.mocked(getMagneticLabwareOptions).mockReturnValue([
      { name: 'mock name', value: 'mockValue' },
    ])
    vi.mocked(getModuleEntities).mockReturnValue({
      magnetId: {
        id: 'magnetId',
        model: 'magneticModuleV2',
        type: 'magneticModuleType',
      },
    })
    vi.mocked(getMagnetLabwareEngageHeight).mockReturnValue(null)
  })

  it('renders the text and a switch button for v2', () => {
    render(props)
    screen.getByText('Module')
    screen.getByText('mock name')
    screen.getByText('Magnet action')
    screen.getByText('Engage')
    screen.getByText('Engage height')
    screen.getByText('Must be between -2.5 mm to 25 mm.')

    const toggleButton = screen.getByRole('switch')
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
