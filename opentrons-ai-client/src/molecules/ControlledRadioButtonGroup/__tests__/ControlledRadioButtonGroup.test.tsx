import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { ControlledRadioButtonGroup } from '../index'
import { describe, it, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'

const radioButtonsMock = [
  {
    id: 'radio1',
    buttonLabel: 'Radio Label 1',
    buttonValue: 'value 1',
  },
  {
    id: 'radio2',
    buttonLabel: 'Radio Label 2',
    buttonValue: 'value 2',
  },
]

const TestFormProviderComponent = () => {
  const methods = useForm({})

  const selectedValue = methods.watch('radio-button-group-name') ?? 'none'

  return (
    <FormProvider {...methods}>
      <ControlledRadioButtonGroup
        radioButtons={radioButtonsMock}
        title="Title test"
        name={'radio-button-group-name'}
        defaultValue="value 1"
      />

      {'selected value: ' + selectedValue}
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('ControlledRadioButtonGroup', () => {
  it('should render ControlledRadioButtonGroup component', () => {
    render()

    screen.getByText('Radio Label 1')
    screen.getByText('Radio Label 2')
  })

  it('should select the correct option initially', () => {
    const { rerender } = render()

    const radio1 = screen.getByLabelText('Radio Label 1')
    const radio2 = screen.getByLabelText('Radio Label 2')

    expect(radio1).toBeChecked()
    expect(radio2).not.toBeChecked()

    rerender(<TestFormProviderComponent />)

    expect(screen.getByText('selected value: value 1')).toBeInTheDocument()
  })

  it('should change the selected value when the second radio is clicked', () => {
    render()

    const radio1 = screen.getByLabelText('Radio Label 1')
    const radio2 = screen.getByLabelText('Radio Label 2')

    expect(radio1).toBeChecked()
    expect(radio2).not.toBeChecked()

    expect(
      screen.queryByText('selected value: value 2')
    ).not.toBeInTheDocument()

    fireEvent.click(radio2)

    expect(screen.getByLabelText('Radio Label 1')).not.toBeChecked()
    expect(screen.getByLabelText('Radio Label 2')).toBeChecked()

    expect(screen.getByText('selected value: value 2')).toBeInTheDocument()
  })
})
