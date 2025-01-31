import { when } from 'vitest-when'
import { it, describe, beforeEach, vi, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import {
  useCreateProtocolAnalysisMutation,
  useCreateRunMutation,
  useHost,
  useUploadCsvFileMutation,
} from '@opentrons/react-api-client'
import { COLORS } from '@opentrons/components'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { ChooseEnum } from '../ChooseEnum'
import { ChooseNumber } from '../ChooseNumber'
import { ChooseCsvFile } from '../ChooseCsvFile'
import { mockRunTimeParameterData } from '../../__fixtures__'
import { useToaster } from '/app/organisms/ToasterOven'
import { ProtocolSetupParameters } from '..'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { HostConfig } from '@opentrons/api-client'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

const mockNavigate = vi.fn()

vi.mock('../ChooseEnum')
vi.mock('../ChooseNumber')
vi.mock('../ChooseCsvFile')
vi.mock('/app/redux/config')
vi.mock('/app/organisms/ToasterOven')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')
vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})
vi.mock('/app/redux/config')

const MOCK_HOST_CONFIG: HostConfig = { hostname: 'MOCK_HOST' }
const mockCreateProtocolAnalysis = vi.fn()
const mockUploadCsvFile = vi.fn()
const mockCreateRun = vi.fn()
const mockMostRecentAnalysis = ({
  commands: [],
  labware: [],
} as unknown) as CompletedProtocolAnalysis
const mockMakeSnackbar = vi.fn()

const render = (props: ComponentProps<typeof ProtocolSetupParameters>) => {
  return renderWithProviders(<ProtocolSetupParameters {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolSetupParameters', () => {
  let props: ComponentProps<typeof ProtocolSetupParameters>

  beforeEach(() => {
    props = {
      protocolId: 'mockId',
      labwareOffsets: [],
      runTimeParameters: mockRunTimeParameterData,
      mostRecentAnalysis: mockMostRecentAnalysis,
    }
    vi.mocked(ChooseEnum).mockReturnValue(<div>mock ChooseEnum</div>)
    vi.mocked(ChooseNumber).mockReturnValue(<div>mock ChooseNumber</div>)
    vi.mocked(ChooseCsvFile).mockReturnValue(<div>mock ChooseCsvFile</div>)
    vi.mocked(useHost).mockReturnValue(MOCK_HOST_CONFIG)
    when(vi.mocked(useCreateProtocolAnalysisMutation))
      .calledWith(expect.anything(), expect.anything())
      .thenReturn({ createProtocolAnalysis: mockCreateProtocolAnalysis } as any)
    when(vi.mocked(useCreateRunMutation))
      .calledWith(expect.anything())
      .thenReturn({ createRun: mockCreateRun } as any)
    when(vi.mocked(useUploadCsvFileMutation))
      .calledWith(expect.anything(), expect.anything())
      .thenReturn({ uploadCsvFile: mockUploadCsvFile } as any)
    vi.mocked(useToaster).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      makeToast: vi.fn(),
      eatToast: vi.fn(),
    })
  })

  it('renders the parameters labels and mock data', () => {
    render(props)
    screen.getByText('Parameters')
    screen.getByText('Restore default values')
    screen.getByRole('button', { name: 'Confirm values' })
    screen.getByText('Dry Run')
    screen.getByText('a dry run description')
  })

  it('renders the ChooseEnum component when a str param is selected', () => {
    render(props)
    fireEvent.click(screen.getByText('Default Module Offsets'))
    screen.getByText('mock ChooseEnum')
  })

  it('renders the ChooseNumber component when a str param is selected', () => {
    render(props)
    fireEvent.click(screen.getByText('PCR Cycles'))
    screen.getByText('mock ChooseNumber')
  })

  it('renders the ChooseCsvFile component when a str param is selected', () => {
    render(props)
    fireEvent.click(screen.getByText('CSV File'))
    screen.getByText('mock ChooseCsvFile')
  })

  it('renders the other setting when boolean param is selected', () => {
    render(props)
    expect(screen.getAllByText('On')).toHaveLength(2)
    fireEvent.click(screen.getByText('Dry Run'))
    expect(screen.getAllByText('On')).toHaveLength(3)
  })

  it('renders the other setting when int param', () => {
    render(props)
    screen.getByText('4 mL')
    screen.getByText('Columns of Samples')
  })

  it('renders the other setting when float param', () => {
    render(props)
    screen.getByText('6.5')
    screen.getByText('EtoH Volume')
  })

  it('renders the other setting when csv param', () => {
    render(props)
    screen.getByText('CSV File')
  })

  it('renders the back icon and calls useNavigate', () => {
    render(props)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(mockNavigate).toHaveBeenCalled()
  })

  // TODO(nd: 08/1/2024) We intentionally set file field for `csv_file` type parameter to null on mount
  // it('renders the confirm values button and clicking on it creates a run', () => {
  //   render(props)
  //   fireEvent.click(screen.getByRole('button', { name: 'Confirm values' }))
  //   expect(mockCreateRun).toHaveBeenCalled()
  // })

  // it('should restore default values button is disabled when tapping confirm values button', async () => {
  //   render(props)
  //   const resetButton = screen.getByTestId('ChildNavigation_Secondary_Button')
  //   fireEvent.click(screen.getByText('Confirm values'))
  //   expect(resetButton).toBeDisabled()
  // })

  it('renders the reset values modal', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore default values' })
    )
    screen.getByText(
      'This will discard any changes you have made. All parameters will have their default values.'
    )
    const title = screen.getByText('Reset parameter values?')
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(title).not.toBeInTheDocument()
  })

  it('render csv file when a protocol requires a csv file and confirm values button has the disabled style', () => {
    const mockMostRecentAnalysisForCsv = ({
      commands: [],
      labware: [],
      result: 'parameter-value-required',
    } as unknown) as CompletedProtocolAnalysis
    render({
      ...props,
      runTimeParameters: mockRunTimeParameterData,
      mostRecentAnalysis: mockMostRecentAnalysisForCsv,
    })
    screen.getByText('CSV File')
    screen.getByText('Required')
    const button = screen.getByRole('button', { name: 'Confirm values' })
    expect(button).toHaveStyle(`background-color: ${COLORS.grey35}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey50}`)
  })

  it('when tapping aria-disabled button, snack bar will show up', () => {
    const mockMostRecentAnalysisForCsv = ({
      commands: [],
      labware: [],
      result: 'parameter-value-required',
    } as unknown) as CompletedProtocolAnalysis
    render({
      ...props,
      runTimeParameters: mockRunTimeParameterData,
      mostRecentAnalysis: mockMostRecentAnalysisForCsv,
    })

    const button = screen.getByRole('button', { name: 'Confirm values' })
    fireEvent.click(button)
    expect(mockMakeSnackbar).toBeCalledWith(
      'This protocol requires a CSV file. Tap the CSV row below to select one.'
    )
  })
})
