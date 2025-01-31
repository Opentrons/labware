import { fireEvent, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_IMPORT_PROTOCOL_TO_APP,
} from '/app/redux/analytics'
import { ProtocolUploadInput } from '../ProtocolUploadInput'
import { remote } from '/app/redux/shell/remote'

import type { Mock } from 'vitest'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/shell/remote', () => ({
  remote: {
    getFilePathFrom: vi.fn(),
  },
}))

describe('ProtocolUploadInput', () => {
  let onUpload: Mock
  let trackEvent: Mock
  const render = () => {
    return renderWithProviders(
      <BrowserRouter>
        <ProtocolUploadInput onUpload={onUpload} />
      </BrowserRouter>,
      {
        i18nInstance: i18n,
      }
    )
  }

  beforeEach(() => {
    onUpload = vi.fn()
    trackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(trackEvent)
    vi.mocked(remote.getFilePathFrom).mockResolvedValue('mockFileName')
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders correct contents for empty state', () => {
    render()

    screen.getByRole('button', { name: 'Upload' })
    screen.getByText(/Drag and drop or/i)
    screen.getByText(/your files/i)
    screen.getByText(
      'Valid file types: Python files (.py) or Protocol Designer files (.json)'
    )
    screen.getByRole('button', { name: 'browse' })
  })

  it('opens file select on button click', () => {
    render()
    const button = screen.getByRole('button', { name: 'Upload' })
    const input = screen.getByTestId('file_input')
    input.click = vi.fn()
    fireEvent.click(button)
    expect(input.click).toHaveBeenCalled()
  })
  it('calls onUpload callback on choose file and trigger analytics event', async () => {
    render()
    const input = screen.getByTestId('file_input')

    const mockFile = new File(['mockContent'], 'mockFileName', {
      type: 'text/plain',
    })

    fireEvent.change(input, {
      target: { files: [mockFile] },
    })

    await vi.waitFor(() => {
      expect(onUpload).toHaveBeenCalled()
      expect(trackEvent).toHaveBeenCalledWith({
        name: ANALYTICS_IMPORT_PROTOCOL_TO_APP,
        properties: { protocolFileName: 'mockFileName' },
      })
    })
  })
})
