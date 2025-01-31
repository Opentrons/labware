import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { ControlledAddTextAreaFields } from '..'
import { FormProvider, useForm } from 'react-hook-form'
import { LIQUIDS_FIELD_NAME } from '../../../organisms/LabwareLiquidsSection'

const TestFormProviderComponent = ({
  liquidsMock = [''],
}: {
  liquidsMock?: string[]
}) => {
  const methods = useForm({
    defaultValues: {
      liquids: liquidsMock,
    },
  })

  const liquids = methods.watch('liquids')

  return (
    <FormProvider {...methods}>
      <ControlledAddTextAreaFields
        fieldName={LIQUIDS_FIELD_NAME}
        name={'liquid'}
      />

      {liquids.map((liquid, index) => (
        <p key={index}>{liquid}</p>
      ))}
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('ControlledAddTextAreaFields', () => {
  it('should render the first input when rendered', () => {
    render()

    expect(screen.getByText('Liquid 1')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Example: "Add 1.5mL of master mix to all the wells in the first column of the deep well plate."'
      )
    ).toBeInTheDocument()
  })

  it('should update the value of the first input when the user types in it', () => {
    render()

    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'New liquid' } })

    expect(screen.getByText('Liquid 1: New liquid')).toBeInTheDocument()
  })

  it('should display another input if present in the form state', () => {
    const liquidsMock = ['Liquid 1: 10 abcd', 'Liquid 2: 20 efgh']
    renderWithProviders(
      <TestFormProviderComponent liquidsMock={liquidsMock} />,
      {
        i18nInstance: i18n,
      }
    )

    expect(screen.getByText('Liquid 1: 10 abcd')).toBeInTheDocument()
    expect(screen.getByText('Liquid 2: 20 efgh')).toBeInTheDocument()
  })

  it('should remove the second input when the user clicks the remove button', () => {
    const liquidsMock = ['Liquid 1: 10 abcd', 'Liquid 2: 20 efgh']
    renderWithProviders(
      <TestFormProviderComponent liquidsMock={liquidsMock} />,
      {
        i18nInstance: i18n,
      }
    )

    expect(screen.getByText('Liquid 2: 20 efgh')).toBeInTheDocument()

    const removeButton = screen.getByText('Remove')

    fireEvent.click(removeButton)

    expect(screen.queryByText('Liquid 2: 20 efgh')).not.toBeInTheDocument()
    expect(screen.queryByText('Liquid 2')).not.toBeInTheDocument()
  })
})
