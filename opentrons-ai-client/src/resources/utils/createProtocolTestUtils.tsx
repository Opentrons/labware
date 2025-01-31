import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'

export async function fillApplicationSectionAndClickConfirm(): Promise<void> {
  const applicationDropdown = screen.getByText('Select an option')
  fireEvent.click(applicationDropdown)

  const basicAliquotingOption = screen.getByText('Basic aliquoting')
  fireEvent.click(basicAliquotingOption)

  const describeInput = screen.getByRole('textbox')
  fireEvent.change(describeInput, { target: { value: 'Test description' } })

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}

export async function fillInstrumentsSectionAndClickConfirm(): Promise<void> {
  const leftMount = screen.getAllByText('Choose pipette')[0]
  fireEvent.click(leftMount)
  fireEvent.click(screen.getByText('Flex 1-Channel 50 μL'))

  const rightMount = screen.getAllByText('Choose pipette')[0]
  fireEvent.click(rightMount)
  fireEvent.click(screen.getByText('Flex 8-Channel 50 μL'))

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}

export async function fillModulesSectionAndClickConfirm(): Promise<void> {
  const firstModuleButton = screen.getByText('Heater-Shaker Module GEN1')
  fireEvent.click(firstModuleButton)

  expect(
    screen.getAllByText('Heater-Shaker Module GEN1')[1]
  ).toBeInTheDocument()

  const adapterDropdown = screen.getByText('Choose an adapter')
  fireEvent.click(adapterDropdown)

  const adapterOption = screen.getByText(
    'Opentrons 96 Deep Well Heater-Shaker Adapter'
  )
  fireEvent.click(adapterOption)

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}

export async function fillLabwareLiquidsSectionAndClickConfirm(): Promise<void> {
  const addButton = screen.getByText('Add Opentrons labware')
  fireEvent.click(addButton)

  fireEvent.click(screen.getByText('Tip rack'))
  fireEvent.click(await screen.findByText('Opentrons Flex 96 Tip Rack 1000 µL'))
  fireEvent.click(screen.getByText('Save'))

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Test liquid' },
  })

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}
