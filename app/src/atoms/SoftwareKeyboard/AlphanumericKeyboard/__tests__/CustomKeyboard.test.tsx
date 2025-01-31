import { useRef } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, renderHook, screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { AlphanumericKeyboard } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof AlphanumericKeyboard>) => {
  return renderWithProviders(<AlphanumericKeyboard {...props} />)[0]
}

describe('AlphanumericKeyboard', () => {
  it('should render alphanumeric keyboard - lower case', () => {
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
    ]
    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })
  it('should render alphanumeric keyboard - upper case, when clicking ABC key', () => {
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
    ]
    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should render alphanumeric keyboard - numbers, when clicking number key', () => {
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
      'abc',
      '0',
      'del',
    ]
    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should render alphanumeric keyboard - lower case when layout is numbers and clicking abc ', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    const numberKey = screen.getByRole('button', { name: '123' })
    fireEvent.click(numberKey)
    const abcKey = screen.getByRole('button', { name: 'abc' })
    fireEvent.click(abcKey)
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
    ]
    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should switch each alphanumeric keyboard properly', () => {
    const { result } = renderHook(() => useRef(null))
    const props = {
      onChange: vi.fn(),
      keyboardRef: result.current,
    }
    render(props)
    // lower case keyboard -> upper case keyboard
    const ABCKey = screen.getByRole('button', { name: 'ABC' })
    fireEvent.click(ABCKey)
    screen.getByRole('button', { name: 'A' })
    // upper case keyboard -> number keyboard
    const numberKey = screen.getByRole('button', { name: '123' })
    fireEvent.click(numberKey)
    screen.getByRole('button', { name: '1' })
    // number keyboard -> lower case keyboard
    const abcKey = screen.getByRole('button', { name: 'abc' })
    fireEvent.click(abcKey)
    screen.getByRole('button', { name: 'a' })
  })
})
