import { describe, it, beforeEach, vi, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { when } from 'vitest-when'

import { useAllCsvFilesQuery } from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'
import { getLocalRobot } from '/app/redux/discovery'
import { getShellUpdateDataFiles } from '/app/redux/shell'
import { EmptyFile } from '../EmptyFile'
import { ChooseCsvFile } from '../ChooseCsvFile'

import type { ComponentProps } from 'react'
import type { CsvFileParameter } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/shell')
vi.mock('../EmptyFile')

const mockHandleGoBack = vi.fn()
const mockSetParameter = vi.fn()
const mockParameter: CsvFileParameter = {} as any
const PROTOCOL_ID = 'fake_protocol_id'
const mockUsbData = [
  '/media/mock-usb-drive/mock-file1.csv',
  '/media/mock-usb-drive/mock-file2.csv',
  '/media/mock-usb-drive/mock-file3.csv',
]

const mockDataOnRobot = {
  data: {
    data: [
      {
        id: '1',
        createdAt: '2024-06-07T19:19:56.268029+00:00',
        name: 'rtp_mock_file1.csv',
      },
      {
        id: '2',
        createdAt: '2024-06-17T19:19:56.268029+00:00',
        name: 'rtp_mock_file2.csv',
      },
    ],
  },
}

const render = (props: ComponentProps<typeof ChooseCsvFile>) => {
  return renderWithProviders(<ChooseCsvFile {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ChooseCsvFile', () => {
  let props: ComponentProps<typeof ChooseCsvFile>
  beforeEach(() => {
    props = {
      protocolId: PROTOCOL_ID,
      handleGoBack: mockHandleGoBack,
      parameter: mockParameter,
      setParameter: mockSetParameter,
    }
    vi.mocked(getLocalRobot).mockReturnValue(mockConnectedRobot)
    vi.mocked(EmptyFile).mockReturnValue(<div>mock EmptyFile</div>)
    vi.mocked(getShellUpdateDataFiles).mockReturnValue(mockUsbData)
    vi.mocked(useAllCsvFilesQuery)
    when(useAllCsvFilesQuery)
      .calledWith(PROTOCOL_ID)
      .thenReturn([] as any)
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Choose CSV file')
    screen.getByText('CSV files on robot')
    screen.getByText('CSV files on USB')
    screen.getByText('Leave USB drive attached until run starts')
  })

  it('should render csv file names', () => {
    when(useAllCsvFilesQuery)
      .calledWith(PROTOCOL_ID)
      .thenReturn(mockDataOnRobot as any)
    render(props)
    screen.getByText('rtp_mock_file1.csv')
    screen.getByText('rtp_mock_file2.csv')
    screen.getByText('mock-file1.csv')
    screen.getByText('mock-file2.csv')
    screen.getByText('mock-file3.csv')
  })

  it('should call a mock function when tapping back button + without selecting a csv file', () => {
    render(props)

    fireEvent.click(screen.getAllByRole('button')[0])
    expect(props.setParameter).not.toHaveBeenCalled()
    expect(mockHandleGoBack).toHaveBeenCalled()
  })

  it('should render a selected radio button in Robot side when tapped', () => {
    when(useAllCsvFilesQuery)
      .calledWith(PROTOCOL_ID)
      .thenReturn(mockDataOnRobot as any)
    render(props)

    const selectedCsvFileOnRobot = screen.getByLabelText('rtp_mock_file2.csv')
    fireEvent.click(selectedCsvFileOnRobot)
    expect(selectedCsvFileOnRobot).toBeChecked()
  })

  it('should render a selected radio button in USB side when tapped', () => {
    render(props)

    const selectCsvFileOnUsb = screen.getByLabelText('mock-file2.csv')
    fireEvent.click(selectCsvFileOnUsb)
    expect(selectCsvFileOnUsb).toBeChecked()
  })

  it('call mock function (setParameter) with fileId + fileName when the selected file is a csv on Robot + tapping back button', () => {
    when(useAllCsvFilesQuery)
      .calledWith(PROTOCOL_ID)
      .thenReturn(mockDataOnRobot as any)
    render(props)

    const csvFileOnRobot = screen.getByRole('label', {
      name: 'rtp_mock_file2.csv',
    })

    fireEvent.click(csvFileOnRobot)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(props.setParameter).toHaveBeenCalledWith(
      {
        id: '2',
        fileName: 'rtp_mock_file2.csv',
      },
      props.parameter.variableName
    )
    expect(mockHandleGoBack).toHaveBeenCalled()
  })

  it('call mock function (setParameter) with filePath + fileName when the selected file is a csv on USB + tapping back button', () => {
    render(props)

    const csvFileOnUsb = screen.getByRole('label', { name: 'mock-file1.csv' })

    fireEvent.click(csvFileOnUsb)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(props.setParameter).toHaveBeenCalledWith(
      {
        filePath: '/media/mock-usb-drive/mock-file1.csv',
        fileName: 'mock-file1.csv',
      },
      props.parameter.variableName
    )
    expect(mockHandleGoBack).toHaveBeenCalled()
  })

  it('should render mock empty file component when there is no csv file', () => {
    vi.mocked(getShellUpdateDataFiles).mockReturnValue([])
    render(props)
    expect(screen.getAllByText('mock EmptyFile').length).toBe(2)
  })
})
