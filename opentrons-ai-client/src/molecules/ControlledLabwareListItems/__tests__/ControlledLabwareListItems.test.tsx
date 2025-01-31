import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { ControlledLabwareListItems } from '..'
import { FormProvider, useForm } from 'react-hook-form'

const TestFormProviderComponent = () => {
  const methods = useForm({
    defaultValues: {
      labwares: [
        {
          labwareURI: 'opentrons/opentrons_flex_96_tiprack_1000ul/1',
          count: 1,
        },
        {
          labwareURI: 'opentrons/opentrons_flex_96_tiprack_50ul/1',
          count: 1,
        },
      ],
    },
  })

  return (
    <FormProvider {...methods}>
      <ControlledLabwareListItems />
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('ControlledLabwareListItems', () => {
  it('should render ControlledLabwareListItems', () => {
    render()

    expect(
      screen.getByText('Opentrons Flex 96 Tip Rack 1000 µL')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Opentrons Flex 96 Tip Rack 50 µL')
    ).toBeInTheDocument()
  })

  it('should update the count of a labware when the count is changed', async () => {
    render()

    const input = screen.getAllByText('1')[0]
    fireEvent.click(input)

    const option = screen.getByText('2')
    fireEvent.click(option)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('should remove a labware when the remove button is clicked', async () => {
    render()

    expect(
      screen.getByText('Opentrons Flex 96 Tip Rack 1000 µL')
    ).toBeInTheDocument()

    const removeButton = screen.getAllByText('Remove')[0]
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(
        screen.queryByText('Opentrons Flex 96 Tip Rack 1000 µL')
      ).not.toBeInTheDocument()
    })
  })
})
