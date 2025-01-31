import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { ControlledEmptySelectorButtonGroup } from '../index'
import { describe, it, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { MODULES_FIELD_NAME } from '../../../organisms/ModulesSection'
import type { DisplayModules } from '../../../organisms/ModulesSection'

const modulesMock: DisplayModules[] = [
  {
    type: 'heaterShakerModuleType',
    model: 'heaterShakerModuleV1',
    name: 'Heater-Shaker Module GEN1',
  },
  {
    type: 'temperatureModuleType',
    model: 'temperatureModuleV2',
    name: 'Temperature Module GEN2',
  },
]

const TestFormProviderComponent = () => {
  const methods = useForm({})

  const selectedValue = methods.watch(MODULES_FIELD_NAME) ?? []

  return (
    <FormProvider {...methods}>
      <ControlledEmptySelectorButtonGroup modules={modulesMock} />

      {'selected values: ' + selectedValue.map((m: DisplayModules) => m.name)}
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('ControlledEmptySelectorButtonGroup', () => {
  it('should render ControlledEmptySelectorButtonGroup component', () => {
    render()

    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Temperature Module GEN2')
  })

  it('should add the value when the button is clicked', async () => {
    render()

    const button1 = screen.getByText('Heater-Shaker Module GEN1')

    expect(
      screen.queryByText(
        'selected values: Heater-Shaker Module GEN1,Temperature Module GEN2'
      )
    ).not.toBeInTheDocument()

    fireEvent.click(button1)

    const button2 = screen.getByText('Temperature Module GEN2')

    fireEvent.click(button2)

    expect(
      await screen.findByText(
        'selected values: Heater-Shaker Module GEN1,Temperature Module GEN2'
      )
    ).toBeInTheDocument()
  })
})
