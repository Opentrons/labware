import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useDownloadRunLog } from '../../../../../hooks'
import { RunFailedModal } from '../RunFailedModal'

import { RUN_STATUS_FAILED } from '@opentrons/api-client'

import type { ComponentProps } from 'react'
import type { RunError } from '@opentrons/api-client'

vi.mock('../../../../../hooks')

const RUN_ID = '1'
const ROBOT_NAME = 'mockRobotName'
const mockError: RunError = {
  id: '5097b3e6-3900-482d-abb1-0a8d8a0e515d',
  errorType: 'ModuleNotAttachedError',
  isDefined: false,
  createdAt: '2023-08-07T20:16:57.720783+00:00',
  detail: 'No available thermocyclerModuleV2 found.',
  errorCode: '4000',
  errorInfo: {},
  wrappedErrors: [],
}

const render = (props: ComponentProps<typeof RunFailedModal>) => {
  return renderWithProviders(<RunFailedModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('RunFailedModal - DesktopApp', () => {
  let props: ComponentProps<typeof RunFailedModal>

  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
      runId: RUN_ID,
      toggleModal: vi.fn(),
      runStatus: RUN_STATUS_FAILED,
      runErrors: { highestPriorityError: mockError, commandErrorList: null },
    }
    vi.mocked(useDownloadRunLog).mockReturnValue({
      downloadRunLog: vi.fn(),
      isRunLogLoading: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render text, link and button', () => {
    render(props)
    screen.getByText('Run failed')
    screen.getByText('Error 4000: ModuleNotAttachedError')
    screen.getByText('No available thermocyclerModuleV2 found.')
    screen.getByText(
      'Download the run log and send it to support@opentrons.com for assistance.'
    )
    screen.getByText('Download Run Log')
    screen.getByRole('button', { name: 'Close' })
  })

  it('should call a mock function when clicking close button', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(props.toggleModal).toHaveBeenCalled()
  })

  it('should close the modal when clicking close icon', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: '' }))
    expect(props.toggleModal).toHaveBeenCalled()
  })

  it('should call a mock function when clicking download run log button', () => {
    render(props)
    fireEvent.click(screen.getByText('Download Run Log'))
    expect(vi.mocked(useDownloadRunLog)).toHaveBeenCalled()
  })
})
