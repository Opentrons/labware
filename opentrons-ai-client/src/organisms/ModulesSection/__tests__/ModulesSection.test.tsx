import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { FormProvider, useForm } from 'react-hook-form'
import { ModulesSection } from '..'

const TestFormProviderComponent = () => {
  const methods = useForm({
    defaultValues: {
      modules: [],
    },
  })

  return (
    <FormProvider {...methods}>
      <ModulesSection />

      <p>{`form is ${methods.formState.isValid ? 'valid' : 'invalid'}`}</p>
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('ModulesSection', () => {
  it('should render modules buttons and no modules added yet', async () => {
    render()

    expect(screen.getAllByRole('button').length).toBe(4)
    expect(screen.getByText('No modules added yet')).toBeInTheDocument()
  })

  it('should render a list item with the selected module if user clicks the module button', () => {
    render()

    const moduleButton = screen.getByText('Heater-Shaker Module GEN1')
    fireEvent.click(moduleButton)

    expect(screen.getAllByText('Heater-Shaker Module GEN1').length).toBe(2)
    expect(screen.queryByText('No modules added yet')).not.toBeInTheDocument()
  })

  it('should render multiple list items with the selected modules if user clicks multiple module buttons', () => {
    render()

    const moduleButton1 = screen.getByText('Heater-Shaker Module GEN1')
    fireEvent.click(moduleButton1)

    const moduleButton2 = screen.getByText('Temperature Module GEN2')
    fireEvent.click(moduleButton2)

    expect(screen.getAllByText('Heater-Shaker Module GEN1').length).toBe(2)
    expect(screen.getAllByText('Temperature Module GEN2').length).toBe(2)
  })

  it('should remove the module list item if user clicks the remove link', () => {
    render()

    const moduleButton = screen.getByText('Heater-Shaker Module GEN1')
    fireEvent.click(moduleButton)

    expect(screen.getAllByText('Heater-Shaker Module GEN1').length).toBe(2)

    const removeLink = screen.getByText('remove')
    fireEvent.click(removeLink)

    expect(screen.getAllByText('Heater-Shaker Module GEN1').length).toBe(1)
  })

  it('should render with form state valid, modules are not required', async () => {
    render()

    await waitFor(() => {
      expect(screen.getByText('form is valid')).toBeInTheDocument()
    })
  })
})
