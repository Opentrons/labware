import { it, describe, beforeEach, vi, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useToaster } from '/app/organisms/ToasterOven'
import { mockRunTimeParameterData } from '../../__fixtures__'
import { ChooseNumber } from '../ChooseNumber'

import type { ComponentProps } from 'react'
import type { NumberParameter } from '@opentrons/shared-data'

vi.mock('/app/organisms/ToasterOven')

const mockHandleGoBack = vi.fn()
const mockIntNumberParameterData = mockRunTimeParameterData[5] as NumberParameter
const mockFloatNumberParameterData = mockRunTimeParameterData[6] as NumberParameter
const mockSetParameter = vi.fn()
const mockMakeSnackbar = vi.fn()

const render = (props: ComponentProps<typeof ChooseNumber>) => {
  return renderWithProviders(<ChooseNumber {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ChooseNumber', () => {
  let props: ComponentProps<typeof ChooseNumber>

  beforeEach(() => {
    props = {
      handleGoBack: mockHandleGoBack,
      parameter: mockIntNumberParameterData,
      setParameter: mockSetParameter,
    }
    vi.clearAllMocks()
    vi.mocked(useToaster).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      makeToast: vi.fn(),
      eatToast: vi.fn(),
    })
  })

  it('should render text and numerical keyboard non decimal and no negative number', () => {
    render(props)
    expect(screen.queryByRole('button', { name: '.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '-' })).not.toBeInTheDocument()
  })

  it('should render text and numerical keyboard non decimal and negative number', () => {
    const mockNegativeIntNumberParameterData = {
      ...mockIntNumberParameterData,
      min: -2,
    }
    props = { ...props, parameter: mockNegativeIntNumberParameterData }
    render(props)
    expect(screen.queryByRole('button', { name: '.' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument()
  })

  it('should render text and numerical keyboard decimal and no negative number', () => {
    props = { ...props, parameter: mockFloatNumberParameterData }
    render(props)
    expect(screen.getByRole('button', { name: '.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '-' })).not.toBeInTheDocument()
  })

  it('should render text and numerical keyboard decimal and negative number', () => {
    const mockNegativeFloatNumberParameterData = {
      ...mockFloatNumberParameterData,
      min: -10.2,
    }
    props = { ...props, parameter: mockNegativeFloatNumberParameterData }
    console.log(mockNegativeFloatNumberParameterData)
    render(props)
    expect(screen.getByRole('button', { name: '.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '-' })).toBeInTheDocument()
  })

  it('should call mock function when tapping go back button', () => {
    render(props)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(mockHandleGoBack).toHaveBeenCalled()
  })

  it('should render error message when inputting an out of range number', () => {
    render(props)
    const numKey = screen.getByRole('button', { name: '1' })
    fireEvent.click(numKey)
    fireEvent.click(numKey)
    screen.getByText('Value must be between 1-10')
  })

  it('should call mock snack bar function when inputting an out of range number', () => {
    render(props)
    const numKey = screen.getByRole('button', { name: '1' })
    fireEvent.click(numKey)
    fireEvent.click(numKey)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(mockMakeSnackbar).toHaveBeenCalledWith('Value must be in range')
  })
})
