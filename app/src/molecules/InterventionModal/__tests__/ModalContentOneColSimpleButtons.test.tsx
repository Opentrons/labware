import { vi, describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { ModalContentOneColSimpleButtons } from '../ModalContentOneColSimpleButtons'

import type { ChangeEventHandler } from 'react'

/* eslint-disable testing-library/no-node-access */
const inputElForButtonFromButtonText = (text: string): HTMLInputElement =>
  ((screen.getByText(text)?.parentElement?.parentElement
    ?.firstChild as any) as HTMLInputElement) ||
  (() => {
    throw new Error(`Could not find el for ${text}`)
  })()
/* eslint-enable testing-library/no-node-access */

describe('InterventionModal', () => {
  it('renders headline', () => {
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{ label: 'first button', value: 'first' }}
        secondButton={{ label: 'second button', value: 'second' }}
      />
    )
    expect(screen.getByText('headline')).not.toBeNull()
  })
  it('renders buttons', () => {
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{ label: 'first button', value: 'first' }}
        secondButton={{ label: 'second button', value: 'second' }}
        furtherButtons={[
          { label: 'third button', value: 'third' },
          { label: 'fourth button', value: 'fourth' },
        ]}
      />
    )
    expect(screen.getByText('first button')).not.toBeNull()
    expect(screen.getByText('second button')).not.toBeNull()
    expect(screen.getByText('third button')).not.toBeNull()
    expect(screen.getByText('fourth button')).not.toBeNull()
  })
  it('enforces single-item selection', () => {
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{ label: 'first button', value: 'first' }}
        secondButton={{ label: 'second button', value: 'second' }}
        furtherButtons={[{ label: 'third button', value: 'third' }]}
      />
    )
    expect(inputElForButtonFromButtonText('first button').checked).toBeFalsy()
    expect(inputElForButtonFromButtonText('second button').checked).toBeFalsy()
    expect(inputElForButtonFromButtonText('third button').checked).toBeFalsy()

    fireEvent.click(inputElForButtonFromButtonText('first button'))
    expect(screen.getByLabelText('first button')).toBeChecked()
    expect(inputElForButtonFromButtonText('second button').checked).toBeFalsy()
    expect(inputElForButtonFromButtonText('third button').checked).toBeFalsy()

    fireEvent.click(inputElForButtonFromButtonText('third button'))
    expect(inputElForButtonFromButtonText('first button').checked).toBeFalsy()
    expect(inputElForButtonFromButtonText('second button').checked).toBeFalsy()
    expect(screen.getByLabelText('third button')).toBeChecked()
  })

  it('can start with a button selected', () => {
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{ label: 'first button', value: 'first' }}
        secondButton={{ label: 'second button', value: 'second' }}
        furtherButtons={[{ label: 'third button', value: 'third' }]}
        initialSelected="second"
      />
    )
    expect(inputElForButtonFromButtonText('first button').checked).toBeFalsy()
    expect(screen.getByLabelText('second button')).toBeChecked()
    expect(inputElForButtonFromButtonText('third button').checked).toBeFalsy()
  })

  it('propagates individual button onChange', () => {
    const onChange = vi.fn()
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{
          label: 'first button',
          value: 'first',
          onChange: onChange as ChangeEventHandler<HTMLInputElement>,
        }}
        secondButton={{ label: 'second button', value: 'second' }}
        furtherButtons={[{ label: 'third button', value: 'third' }]}
      />
    )
    fireEvent.click(inputElForButtonFromButtonText('first button'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'first' }),
      })
    )
    vi.restoreAllMocks()

    fireEvent.click(inputElForButtonFromButtonText('second button'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('propagates whole-list onSelect', () => {
    const onSelect = vi.fn()
    render(
      <ModalContentOneColSimpleButtons
        headline="headline"
        firstButton={{ label: 'first button', value: 'first' }}
        secondButton={{ label: 'second button', value: 'second' }}
        furtherButtons={[{ label: 'third button', value: 'third' }]}
        onSelect={onSelect}
      />
    )

    fireEvent.click(inputElForButtonFromButtonText('first button'))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'first' }),
      })
    )
    vi.restoreAllMocks()
    fireEvent.click(inputElForButtonFromButtonText('third button'))
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'third' }),
      })
    )
  })
})
