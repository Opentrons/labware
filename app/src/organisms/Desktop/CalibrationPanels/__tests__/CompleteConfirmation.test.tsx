import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { CompleteConfirmation } from '../CompleteConfirmation'

import type { ComponentProps } from 'react'

describe('CompleteConfirmation', () => {
  const mockCleanUpAndExit = vi.fn()
  const render = (
    props: Partial<ComponentProps<typeof CompleteConfirmation>> = {}
  ) => {
    const { proceed = mockCleanUpAndExit, flowName, body, visualAid } = props
    return renderWithProviders(
      <CompleteConfirmation
        proceed={proceed}
        flowName={flowName}
        body={body}
        visualAid={visualAid}
      />,
      { i18nInstance: i18n }
    )
  }

  it('clicking continue sends exit command and deletes session', () => {
    render()
    const button = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(button)
    expect(mockCleanUpAndExit).toHaveBeenCalled()
  })

  it('renders heading and body text if present', () => {
    render({
      flowName: 'fake flow name',
      body: 'fake body text',
    })
    screen.getByRole('heading', { name: 'fake flow name complete!' })
    screen.getByText('fake body text')
  })

  it('renders visual aid in place of icon if present', () => {
    render({ visualAid: 'fake visual aid' })
    screen.getByText('fake visual aid')
  })
})
