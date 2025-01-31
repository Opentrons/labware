import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { CreateProtocol } from '..'
import { Provider } from 'jotai'
import {
  fillApplicationSectionAndClickConfirm,
  fillInstrumentsSectionAndClickConfirm,
  fillLabwareLiquidsSectionAndClickConfirm,
  fillModulesSectionAndClickConfirm,
} from '../../../resources/utils/createProtocolTestUtils'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockUseTrackEvent = vi.fn()

vi.mock('../../../resources/hooks/useTrackEvent', () => ({
  useTrackEvent: () => mockUseTrackEvent,
}))

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../../hooks/useTrackEvent', () => ({
  useTrackEvent: () => mockUseTrackEvent,
}))

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(
    <Provider>
      <CreateProtocol />
    </Provider>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CreateProtocol', () => {
  it('should update the active section when user fills the section information and clicks the confirm button', async () => {
    render()

    const buttonsAndAccordions = screen.getAllByRole('button')
    expect(buttonsAndAccordions[0]).toHaveAttribute('aria-expanded', 'true')

    await fillApplicationSectionAndClickConfirm()

    await waitFor(() => {
      expect(buttonsAndAccordions[0]).toHaveAttribute('aria-expanded', 'false')
    })
  })

  it('should display the Prompt preview correctly for Application section', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(4)
    expect(previewItems[0]).toHaveTextContent('Basic aliquoting')
    expect(previewItems[1]).toHaveTextContent('Test description')
  })

  it('should display the Prompt preview correctly for Application section if Other application is selected', () => {
    render()

    const applicationDropdown = screen.getByText('Select an option')
    fireEvent.click(applicationDropdown)

    const basicAliquotingOption = screen.getByText('Other')
    fireEvent.click(basicAliquotingOption)

    const [otherInput, describeInput] = screen.getAllByRole('textbox')

    fireEvent.change(otherInput, { target: { value: 'Test Application' } })
    fireEvent.change(describeInput, { target: { value: 'Test description' } })

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    const promptPreview = screen.getByText('Prompt')
    expect(promptPreview).toBeInTheDocument()

    const previewItems = screen.getAllByTestId('Tag_default')
    expect(previewItems).toHaveLength(2)
    expect(previewItems[0]).toHaveTextContent('Test Application')
    expect(previewItems[1]).toHaveTextContent('Test description')
  })

  it('should display a completed checkmark if the section is completed', async () => {
    render()

    expect(screen.queryByTestId('accordion-ot-check')).not.toBeInTheDocument()

    const buttonsAndAccordions = screen.getAllByRole('button')
    expect(buttonsAndAccordions[0]).toHaveAttribute('aria-expanded', 'true')

    await fillApplicationSectionAndClickConfirm()

    expect(screen.getByTestId('accordion-ot-check')).toBeInTheDocument()
  })

  it('should display the Prompt preview correctly for Instruments section', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(6)
    expect(previewItems[0]).toHaveTextContent('Basic aliquoting')
    expect(previewItems[1]).toHaveTextContent('Test description')
    expect(previewItems[2]).toHaveTextContent('Opentrons Flex')
    expect(previewItems[3]).toHaveTextContent('Flex 1-Channel 50 μL')
    expect(previewItems[4]).toHaveTextContent('Flex 8-Channel 50 μL')
  })

  it('should open the Modules section when the Instruments section is completed', async () => {
    render()

    expect(screen.getByRole('button', { name: 'Application' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Modules' })).toHaveAttribute(
        'aria-expanded',
        'true'
      )
    })
  })

  it('should display the Prompt preview correctly for Modules section', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(7)
    expect(previewItems[6]).toHaveTextContent(
      'Heater-Shaker Module GEN1 with Opentrons 96 Deep Well Heater-Shaker Adapter'
    )
  })

  it('should open the Labware & Liquids section when the Modules section is completed', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Labware & Liquids' })
      ).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('should display the Prompt preview correctly for Labware & Liquids section', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()
    await fillLabwareLiquidsSectionAndClickConfirm()

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(9)
    expect(previewItems[7]).toHaveTextContent(
      'Opentrons Flex 96 Tip Rack 1000 µL'
    )
    expect(previewItems[8]).toHaveTextContent('Test liquid')
  })

  it('should open the Steps section when the Labware & Liquids section is completed', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()
    await fillLabwareLiquidsSectionAndClickConfirm()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute(
        'aria-expanded',
        'true'
      )
    })
  })

  it('should display the Prompt preview correctly for Steps section', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()
    await fillLabwareLiquidsSectionAndClickConfirm()

    const textArea = screen.getByRole('textbox')
    fireEvent.change(textArea, { target: { value: 'Test step' } })

    expect(screen.getByRole('button', { name: 'Submit prompt' })).toBeDisabled()

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(10)
    expect(previewItems[9]).toHaveTextContent('Test step')

    expect(screen.getByRole('button', { name: 'Submit prompt' })).toBeEnabled()
  })

  it('should submit the prompt and redirect the user to the chat page when submit prompt button is clicked', async () => {
    render()

    await fillApplicationSectionAndClickConfirm()
    await fillInstrumentsSectionAndClickConfirm()
    await fillModulesSectionAndClickConfirm()
    await fillLabwareLiquidsSectionAndClickConfirm()

    const textArea = screen.getByRole('textbox')
    fireEvent.change(textArea, { target: { value: 'Test step' } })

    expect(screen.getByRole('button', { name: 'Submit prompt' })).toBeDisabled()

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    const previewItems = screen.getAllByTestId('Tag_default')

    expect(previewItems).toHaveLength(10)
    expect(previewItems[9]).toHaveTextContent('Test step')

    const submitPromptButton = screen.getByRole('button', {
      name: 'Submit prompt',
    })

    expect(submitPromptButton).toBeEnabled()

    fireEvent.click(submitPromptButton)

    expect(mockNavigate).toHaveBeenCalledWith('/chat')
    expect(mockUseTrackEvent).toHaveBeenCalledWith({
      name: 'submit-prompt',
      properties: { isCreateOrUpdate: 'create', prompt: expect.any(String) },
    })
  })
})
