import * as React from 'react'
import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../../__testing-utils__'
import { i18n } from '../../../../../../assets/localization'
import {
  getTemperatureLabwareOptions,
  getTemperatureModuleIds,
} from '../../../../../../ui/modules/selectors'
import { TemperatureTools } from '../TemperatureTools'
import type * as ModulesSelectors from '../../../../../../ui/modules/selectors'

vi.mock('../../../../../../ui/modules/selectors', async importOriginal => {
  const actualFields = await importOriginal<typeof ModulesSelectors>()
  return {
    ...actualFields,
    getTemperatureLabwareOptions: vi.fn(),
    getTemperatureModuleIds: vi.fn(),
  }
})
const render = (props: React.ComponentProps<typeof TemperatureTools>) => {
  return renderWithProviders(<TemperatureTools {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TemperatureTools', () => {
  let props: React.ComponentProps<typeof TemperatureTools>

  beforeEach(() => {
    props = {
      formData: {
        id: 'formId',
        stepType: 'temperature',
        moduleId: 'mockId',
        setTemperature: true,
      } as any,
      focusHandlers: {
        blur: vi.fn(),
        focus: vi.fn(),
        dirtyFields: [],
        focusedField: null,
      },
      propsForFields: {
        moduleId: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'setTemperature',
          updateValue: vi.fn(),
          value: 'mockId',
        },
        setTemperature: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'setTemperature',
          updateValue: vi.fn(),
          value: true,
        },
        targetTemperature: {
          onFieldFocus: vi.fn(),
          onFieldBlur: vi.fn(),
          errorToShow: null,
          disabled: false,
          name: 'targetTemperature',
          updateValue: vi.fn(),
          value: null,
        },
      },
    }

    vi.mocked(getTemperatureModuleIds).mockReturnValue(['mockId'])
    vi.mocked(getTemperatureLabwareOptions).mockReturnValue([
      {
        name: 'mock module',
        value: 'mockId',
      },
    ])
  })

  it('renders a temperature module form with 1 module', () => {
    render(props)
    screen.getByText('Module')
    screen.getByText('mock module')
    screen.getByText('Deactivate module')
    screen.getByText('Change to temperature')
  })
})
