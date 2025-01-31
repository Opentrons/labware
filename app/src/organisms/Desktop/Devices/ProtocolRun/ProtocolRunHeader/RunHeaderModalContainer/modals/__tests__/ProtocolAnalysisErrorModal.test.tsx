import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ProtocolAnalysisErrorModal } from '../ProtocolAnalysisErrorModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ProtocolAnalysisErrorModal>) => {
  return renderWithProviders(<ProtocolAnalysisErrorModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolAnalysisErrorModal', () => {
  let props: ComponentProps<typeof ProtocolAnalysisErrorModal>

  beforeEach(() => {
    props = {
      displayName: 'test_protocol',
      robotName: 'test_robot',
      onClose: vi.fn(),
      errors: [
        {
          id: 'error_id',
          detail: 'protocol analysis error',
          errorType: 'analysis',
          createdAt: '100000',
        },
      ],
    }
  })
  it('renders error modal', () => {
    render(props)
    screen.getByText('protocol analysis error')
    screen.getByLabelText('close_analysis_error_modal')
  })
  it('calls onClose when close button clicked', () => {
    render(props)
    const btn = screen.getByLabelText('close_analysis_error_modal')
    fireEvent.click(btn)
    expect(props.onClose).toHaveBeenCalled()
  })
})
