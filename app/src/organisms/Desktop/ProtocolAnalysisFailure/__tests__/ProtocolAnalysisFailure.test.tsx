import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { ProtocolAnalysisFailure } from '..'
import { analyzeProtocol } from '/app/redux/protocol-storage'

import type { ComponentProps } from 'react'

const render = (
  props: Partial<ComponentProps<typeof ProtocolAnalysisFailure>> = {}
) => {
  return renderWithProviders(
    <MemoryRouter>
      <ProtocolAnalysisFailure
        {...{
          protocolKey: 'fakeProtocolKey',
          errors: ['fake analysis error'],
          ...props,
        }}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ProtocolAnalysisFailure', () => {
  it('renders banner with no modal by default', () => {
    render()
    expect(screen.queryByRole('button', { name: 'close' })).toBeNull()
  })
  it('renders modal after clicking view details', () => {
    render()
    const viewDetailsButton = screen.getByRole('button', {
      name: 'error details',
    })
    fireEvent.click(viewDetailsButton)
    const closeButton = screen.getByRole('button', { name: 'close' })
    fireEvent.click(closeButton)
    expect(screen.queryByRole('button', { name: 'close' })).toBeNull()
  })
  it('dispatches reanalyze action on click', () => {
    const store = render()[1]
    const reanalyzeButton = screen.getByRole('button', { name: 'Reanalyze' })
    fireEvent.click(reanalyzeButton)
    expect(store.dispatch).toHaveBeenCalledWith(
      analyzeProtocol('fakeProtocolKey')
    )
  })
})
