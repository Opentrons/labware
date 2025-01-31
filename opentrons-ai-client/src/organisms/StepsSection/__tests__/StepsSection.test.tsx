import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { FormProvider, useForm } from 'react-hook-form'
import { StepsSection } from '../../StepsSection'

const TestFormProviderComponent = () => {
  const methods = useForm({
    defaultValues: {
      steps: [''],
    },
  })

  const steps = methods.watch('steps')

  return (
    <FormProvider {...methods}>
      <StepsSection />

      {Array.isArray(steps) ? (
        steps.map((step, index) => <p key={index}>{step}</p>)
      ) : (
        <p>{steps}</p>
      )}

      <p>{`form is ${methods.formState.isValid ? 'valid' : 'invalid'}`}</p>
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('StepsSection', () => {
  it('should render StepsSection', () => {
    render()

    expect(
      screen.getByText(
        'Give step-by-step instructions on how to handle liquids, with quantities in microliters (uL) and exact source and destination locations within labware. Always err on the side of providing extra information!'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Add individual steps')).toBeInTheDocument()
    expect(screen.getByText('Paste from document')).toBeInTheDocument()
  })

  it('should render the Add individual steps part', () => {
    render()

    expect(screen.getByText('Add individual steps')).toBeInTheDocument()
    expect(screen.getByText('Add step')).toBeInTheDocument()
    expect(screen.getByText('Step 1')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render the Paste from document part', () => {
    render()

    fireEvent.click(screen.getByText('Paste from document'))

    expect(
      screen.getByText(
        'Paste the steps from your document. Make sure your steps are clearly numbered.'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should add a step when the Add step button is clicked', () => {
    render()

    fireEvent.click(screen.getByText('Add step'))

    expect(screen.getByText('Step 2')).toBeInTheDocument()
  })

  it('should add step descriptions when the text area is filled', () => {
    render()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'description test' },
    })

    expect(screen.getByText('Step 1: description test')).toBeInTheDocument()
  })

  it('should add multiple step descriptions when the text area is filled multiple times', () => {
    render()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'description test' },
    })
    fireEvent.click(screen.getByText('Add step'))
    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: 'description test 2' },
    })

    expect(screen.getByText('Step 1: description test')).toBeInTheDocument()
    expect(screen.getByText('Step 2: description test 2')).toBeInTheDocument()
  })

  it('should add a step description when pasting from a document', () => {
    render()

    fireEvent.click(screen.getByText('Paste from document'))

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'description test' },
    })

    expect(screen.getAllByText('description test')[1]).toBeInTheDocument()
  })

  it('should update form state to valid when steps have been added', async () => {
    render()

    expect(screen.getByText('form is invalid')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'description test' },
    })

    await waitFor(() => {
      expect(screen.getByText('form is valid')).toBeInTheDocument()
    })
  })
})
