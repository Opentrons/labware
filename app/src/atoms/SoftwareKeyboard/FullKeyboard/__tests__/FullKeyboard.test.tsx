import { useRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { FullKeyboard } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof FullKeyboard>) => {
  return renderWithProviders(<FullKeyboard {...props} />)[0]
}

describe('FullKeyboard', () => {
  it('should render FullKeyboard keyboard', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const buttons = screen.getAllByRole('button')

    const expectedButtonNames = [
      'q',
      'w',
      'e',
      'r',
      't',
      'y',
      'u',
      'i',
      'o',
      'p',
      '123',
      'a',
      's',
      'd',
      'f',
      'g',
      'h',
      'j',
      'k',
      'l',
      'ABC',
      'z',
      'x',
      'c',
      'v',
      'b',
      'n',
      'm',
      'del',
      'space',
    ]

    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should render full keyboard when hitting ABC key', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const shiftKey = screen.getByRole('button', { name: 'ABC' })
    fireEvent.click(shiftKey)
    const buttons = screen.getAllByRole('button')
    const expectedButtonNames = [
      'Q',
      'W',
      'E',
      'R',
      'T',
      'Y',
      'U',
      'I',
      'O',
      'P',
      '123',
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
      'L',
      'abc',
      'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      'del',
      'space',
    ]

    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should render full keyboard when hitting 123 key', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const numberKey = screen.getByRole('button', { name: '123' })
    fireEvent.click(numberKey)
    const buttons = screen.getAllByRole('button')
    const expectedButtonNames = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      'abc',
      '-',
      '/',
      ':',
      ';',
      '(',
      ')',
      '$',
      '&',
      '@',
      '"',
      '#+=',
      '.',
      ',',
      '?',
      '!',
      "'",
      '*',
      '~',
      'del',
      'space',
    ]

    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should render the software keyboards when hitting #+= key', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const numberKey = screen.getByRole('button', { name: '123' })
    fireEvent.click(numberKey)
    const symbolKey = screen.getByRole('button', { name: '#+=' })
    fireEvent.click(symbolKey)
    const buttons = screen.getAllByRole('button')
    const expectedButtonNames = [
      '[',
      ']',
      '{',
      '}',
      '%',
      '^',
      '+',
      'abc',
      '_',
      '\\',
      '|',
      '<',
      '>',
      '#',
      '=',
      '123',
      '.',
      ',',
      '?',
      '!',
      "'",
      '*',
      '~',
      'del',
      'space',
    ]

    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should call mock function when clicking a key', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const aKey = screen.getByRole('button', { name: 'a' })
    fireEvent.click(aKey)
    expect(props.onChange).toHaveBeenCalled()
  })
})
