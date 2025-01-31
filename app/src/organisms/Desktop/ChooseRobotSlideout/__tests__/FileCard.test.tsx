import { vi, it, describe, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { FileCard } from '../FileCard'

import type { ComponentProps } from 'react'
import type { CsvFileParameter } from '@opentrons/shared-data'

vi.mock('/app/redux/discovery')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/networking')
vi.mock('/app/resources/useNotifyDataReady')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof FileCard>) => {
  return renderWithProviders(
    <MemoryRouter>
      <FileCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockSetRunTimeParametersOverrides = vi.fn()

const mockCsvRunTimeParameterSuccess: CsvFileParameter = {
  displayName: 'My sample file',
  file: { id: 'my_file_id', file: { name: 'my_file.csv' } as File },
  variableName: 'my_sample_csv',
  description: 'This is a mock CSV runtime parameter',
  type: 'csv_file',
}

const mockCsvRunTimeParameterError = {
  ...mockCsvRunTimeParameterSuccess,
  file: { id: 'my_bad_file_id', name: 'my_bad_file.pdf' },
}

const mockRunTimeParametersOverrides = [mockCsvRunTimeParameterSuccess]

describe('FileCard', () => {
  it('displays the file RTP filename', () => {
    render({
      error: null,
      fileRunTimeParameter: mockCsvRunTimeParameterSuccess,
      runTimeParametersOverrides: mockRunTimeParametersOverrides,
      setRunTimeParametersOverrides: mockSetRunTimeParametersOverrides,
    })
    screen.getByText('my_file.csv')
  })

  it('displays error message if the file type is incorrect', () => {
    render({
      error: 'CSV file type required',
      fileRunTimeParameter: mockCsvRunTimeParameterError,
      runTimeParametersOverrides: mockRunTimeParametersOverrides,
      setRunTimeParametersOverrides: mockSetRunTimeParametersOverrides,
    })
    screen.getByText('CSV file type required')
  })

  it('sets runtime parameters overrides file parameter to null on close', () => {
    render({
      error: 'CSV file type required',
      fileRunTimeParameter: mockCsvRunTimeParameterError,
      runTimeParametersOverrides: mockRunTimeParametersOverrides,
      setRunTimeParametersOverrides: mockSetRunTimeParametersOverrides,
    })
    const xButton = screen.getByTestId('close_button')
    fireEvent.click(xButton)
    expect(mockSetRunTimeParametersOverrides).toBeCalledWith([
      {
        ...mockCsvRunTimeParameterError,
        file: null,
      },
    ])
  })
})
