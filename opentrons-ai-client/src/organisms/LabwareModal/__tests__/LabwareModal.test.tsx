import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import type { DisplayLabware } from '..'
import { LabwareModal } from '..'
import { FormProvider, useForm } from 'react-hook-form'

let displaModalValue = false
const setDisplayModalMock = vi.fn()

const TestFormProviderComponent = () => {
  const methods = useForm({
    defaultValues: {
      labwares: [],
    },
  })

  const formLabwares: DisplayLabware[] = methods.watch('labwares')

  return (
    <FormProvider {...methods}>
      <LabwareModal
        displayLabwareModal={displaModalValue}
        setDisplayLabwareModal={setDisplayModalMock}
      />

      {formLabwares.map((labware, index) => (
        <p key={index}>{labware.labwareURI}</p>
      ))}
    </FormProvider>
  )
}

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<TestFormProviderComponent />, {
    i18nInstance: i18n,
  })
}

describe('LabwareModal', () => {
  it('should render if displayLabwareModal is true', () => {
    displaModalValue = true
    render()

    expect(screen.getByText('Add Opentrons labware')).toBeInTheDocument()
  })

  it('should not render if displayLabwareModal is false', () => {
    displaModalValue = false
    render()

    expect(screen.queryByText('Add Opentrons labware')).not.toBeInTheDocument()
  })

  it('should display the search input and category buttons', () => {
    displaModalValue = true
    render()

    expect(
      screen.getByPlaceholderText('Search for labware...')
    ).toBeInTheDocument()
    expect(screen.getByText('Tip rack')).toBeInTheDocument()
    expect(screen.getByText('Tube rack')).toBeInTheDocument()
    expect(screen.getByText('Well plate')).toBeInTheDocument()
    expect(screen.getByText('Reservoir')).toBeInTheDocument()
    expect(screen.getByText('Aluminum block')).toBeInTheDocument()
    expect(screen.getByText('Adapter')).toBeInTheDocument()
  })

  it('should display the labware list when category button is clicked', async () => {
    displaModalValue = true
    render()

    expect(
      screen.queryByText('Opentrons Flex 96 Tip Rack 1000 µL')
    ).not.toBeInTheDocument()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    await waitFor(() => {
      expect(
        screen.getByText('Opentrons Flex 96 Tip Rack 1000 µL')
      ).toBeInTheDocument()
    })
  })

  it('should select labware when labware is clicked', async () => {
    displaModalValue = true
    render()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    expect(labware).not.toBeChecked()

    labware.click()

    expect(labware).toBeChecked()
  })

  it('should allow multiple labwares to be selected', async () => {
    displaModalValue = true
    render()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware1 = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    const labware2 = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 50 µL'
    )

    labware1.click()
    labware2.click()

    expect(labware1).toBeChecked()
    expect(labware2).toBeChecked()
  })

  it('should deselect labware when labware is clicked again', async () => {
    displaModalValue = true
    render()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    labware.click()
    labware.click()

    expect(labware).not.toBeChecked()
  })

  it('should close the modal when the cancel button is clicked and make no changes to selected labwares', async () => {
    displaModalValue = true
    render()

    expect(
      screen.queryByText('opentrons/eppendorf_96_tiprack_1000ul_eptips/1')
    ).not.toBeInTheDocument()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware1 = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    labware1.click()

    const cancelButton = screen.getByText('Cancel')
    cancelButton.click()

    expect(setDisplayModalMock).toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(
        screen.queryByText('opentrons/eppendorf_96_tiprack_1000ul_eptips/1')
      ).not.toBeInTheDocument()
    })
  })

  it('should save the selected labwares when the save button is clicked', async () => {
    displaModalValue = true
    render()

    expect(
      screen.queryByText('opentrons/eppendorf_96_tiprack_1000ul_eptips/1')
    ).not.toBeInTheDocument()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware1 = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    labware1.click()

    const saveButton = screen.getByText('Save')
    saveButton.click()

    expect(setDisplayModalMock).toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(
        screen.getByText('opentrons/opentrons_flex_96_tiprack_1000ul/1')
      ).toBeInTheDocument()
    })
  })

  it('should not save the selected labwares and make no changes to the already saved labwares when Cancel is clicked', async () => {
    displaModalValue = true
    render()

    expect(
      screen.queryByText('opentrons/eppendorf_96_tiprack_1000ul_eptips/1')
    ).not.toBeInTheDocument()

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    const labware1 = await screen.findByLabelText(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    labware1.click()

    const saveButton = screen.getByText('Save')
    saveButton.click()

    expect(setDisplayModalMock).toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(
        screen.getByText('opentrons/opentrons_flex_96_tiprack_1000ul/1')
      ).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancel')
    cancelButton.click()

    expect(setDisplayModalMock).toHaveBeenCalledWith(false)

    await waitFor(() => {
      expect(
        screen.getByText('opentrons/opentrons_flex_96_tiprack_1000ul/1')
      ).toBeInTheDocument()
    })
  })

  it('should filter labwares when search input is used', async () => {
    displaModalValue = true
    render()

    const searchInput = screen.getByPlaceholderText('Search for labware...')
    fireEvent.change(searchInput, {
      target: { value: 'Opentrons Flex 96 Tip Rack 50 µL' },
    })

    const categoryButton = screen.getByText('Tip rack')
    categoryButton.click()

    await waitFor(() => {
      expect(
        screen.getByText('Opentrons Flex 96 Tip Rack 50 µL')
      ).toBeInTheDocument()
    })

    expect(
      screen.queryByText('Opentrons Flex 96 Tip Rack 1000 µL')
    ).not.toBeInTheDocument()
  })
})
