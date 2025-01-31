import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { LabwareLiquidsSection } from '..'
import { FormProvider, useForm } from 'react-hook-form'

const TestFormProviderComponent = () => {
  const methods = useForm({
    defaultValues: {
      labwares: [],
    },
  })

  return (
    <FormProvider {...methods}>
      <LabwareLiquidsSection />

      <p>{`form is ${methods.formState.isValid ? 'valid' : 'invalid'}`}</p>
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('LabwareLiquidsSection', () => {
  it('should render LabwareLiquidsSection', () => {
    render()

    expect(screen.getByText('Add Opentrons labware')).toBeInTheDocument()
    expect(screen.getByText('No labware added yet')).toBeInTheDocument()
  })

  it('should not display the no labware added message if labwares have been added', async () => {
    render()

    expect(screen.getByText('No labware added yet')).toBeInTheDocument()

    const addButton = screen.getByText('Add Opentrons labware')
    fireEvent.click(addButton)

    fireEvent.click(screen.getByText('Tip rack'))
    fireEvent.click(
      await screen.findByText('Opentrons Flex 96 Tip Rack 1000 µL')
    )
    fireEvent.click(screen.getByText('Save'))

    expect(screen.queryByText('No labware added yet')).not.toBeInTheDocument()
  })

  it('should update form state to valid when labwares and liquids have been added', async () => {
    render()

    await waitFor(() => {
      expect(screen.getByText('form is invalid')).toBeInTheDocument()
    })
    const addButton = screen.getByText('Add Opentrons labware')
    fireEvent.click(addButton)

    fireEvent.click(screen.getByText('Tip rack'))
    fireEvent.click(
      await screen.findByText('Opentrons Flex 96 Tip Rack 1000 µL')
    )
    fireEvent.click(screen.getByText('Save'))

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'test liquid' },
    })

    await waitFor(() => {
      expect(screen.getByText('form is valid')).toBeInTheDocument()
    })
  })
})
