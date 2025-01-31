import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import type { NavigateFunction } from 'react-router-dom'

import { UpdateProtocol } from '../index'
import { i18n } from '../../../i18n'

// global.Blob = BlobPolyfill as any
global.Blob = require('node:buffer').Blob

const mockNavigate = vi.fn()
const mockUseTrackEvent = vi.fn()
const mockUseChatData = vi.fn()

vi.mock('../../../resources/hooks/useTrackEvent', () => ({
  useTrackEvent: () => mockUseTrackEvent,
}))

File.prototype.text = vi.fn().mockResolvedValue('test file content')

vi.mock('../../../resources/chatDataAtom', () => ({
  chatDataAtom: () => mockUseChatData,
}))

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const render = () => {
  return renderWithProviders(<UpdateProtocol />, {
    i18nInstance: i18n,
  })
}

describe('Update Protocol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render', () => {
    render()
    expect(screen.getByText('Update an existing protocol')).toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
    expect(screen.getByText('Protocol file')).toBeInTheDocument()
    expect(screen.getByText('Choose file')).toBeInTheDocument()
    expect(screen.getByText('Type of update')).toBeInTheDocument()
    expect(screen.getByText('Select an option')).toBeInTheDocument()
    expect(
      screen.getByText('Provide details of changes you want to make')
    ).toBeInTheDocument()
  })

  it('should update the file value when the file is uploaded', async () => {
    render()

    const blobParts: BlobPart[] = [
      'x = 1\n',
      'x = 2\n',
      'x = 3\n',
      'x = 4\n',
      'print("x is 1.")\n',
    ]

    const file = new File(blobParts, 'test-file.py', { type: 'text/python' })

    fireEvent.drop(screen.getByTestId('file_drop_zone'), {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(screen.getByText('test-file.py')).toBeInTheDocument()
    })
  })

  it('should not proceed when you click the submit prompt when the progress percentage is not 1.0', () => {
    render()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it.skip('should call navigate to the chat page when the submit prompt button is clicked when progress is 1.0', async () => {
    render()

    // upload file
    const blobParts: BlobPart[] = [
      'x = 1\n',
      'x = 2\n',
      'x = 3\n',
      'x = 4\n',
      'print("x is 1.")\n',
    ]
    const file = new File(blobParts, 'test-file.py', { type: 'text/python' })
    fireEvent.drop(screen.getByTestId('file_drop_zone'), {
      dataTransfer: {
        files: [file],
      },
    })

    // input description
    const describeInput = screen.getByRole('textbox')
    fireEvent.change(describeInput, { target: { value: 'Test description' } })

    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()

    // select update type
    const applicationDropdown = screen.getByText('Select an option')
    fireEvent.click(applicationDropdown)

    const basicOtherOption = screen.getByText('Other')
    fireEvent.click(basicOtherOption)

    const submitPromptButton = screen.getByText('Submit prompt')
    await waitFor(() => {
      expect(submitPromptButton).toBeEnabled()
      submitPromptButton.click()
    })
    expect(mockNavigate).toHaveBeenCalledWith('/chat')
  })

  it('should call trackEvent when submit prompt button is clicked', async () => {
    render()

    // upload file
    const blobParts: BlobPart[] = [
      'x = 1\n',
      'x = 2\n',
      'x = 3\n',
      'x = 4\n',
      'print("x is 1.")\n',
    ]
    const file = new File(blobParts, 'test-file.py', { type: 'text/python' })
    fireEvent.drop(screen.getByTestId('file_drop_zone'), {
      dataTransfer: {
        files: [file],
      },
    })

    // input description
    const describeInput = screen.getByRole('textbox')
    fireEvent.change(describeInput, { target: { value: 'Test description' } })

    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()

    // select update type
    const applicationDropdown = screen.getByText('Select an option')
    fireEvent.click(applicationDropdown)

    const basicOtherOption = screen.getByText('Other')
    fireEvent.click(basicOtherOption)

    const submitPromptButton = screen.getByText('Submit prompt')
    await waitFor(() => {
      expect(submitPromptButton).toBeEnabled()
    })

    fireEvent.click(submitPromptButton)

    await waitFor(() => {
      expect(mockUseTrackEvent).toHaveBeenCalledWith({
        name: 'submit-prompt',
        properties: {
          isCreateOrUpdate: 'update',
          prompt: expect.any(String),
        },
      })
    })
  })
})
