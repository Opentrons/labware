import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'

import { RUN_STATUS_RUNNING } from '@opentrons/api-client'
import { useModulesQuery } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ProtocolRunHeader } from '..'
import { useIsRobotViewable } from '/app/redux-resources/robots'
import {
  useRunStatus,
  useProtocolDetailsForRun,
  useNotifyRunQuery,
} from '/app/resources/runs'
import { RunHeaderModalContainer } from '../RunHeaderModalContainer'
import { RunHeaderBannerContainer } from '../RunHeaderBannerContainer'
import { RunHeaderContent } from '../RunHeaderContent'
import { RunProgressMeter } from '../../../../RunProgressMeter'
import { RunHeaderProtocolName } from '../RunHeaderProtocolName'
import {
  useRunAnalytics,
  useRunErrors,
  useRunHeaderRunControls,
} from '../hooks'

import type { ComponentProps } from 'react'

vi.mock('react-router-dom')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/runs')
vi.mock('/app/redux/protocol-runs')
vi.mock('../RunHeaderModalContainer')
vi.mock('../RunHeaderBannerContainer')
vi.mock('../RunHeaderContent')
vi.mock('../../../../RunProgressMeter')
vi.mock('../RunHeaderProtocolName')
vi.mock('../hooks')

const MOCK_PROTOCOL = 'MOCK_PROTOCOL'
const MOCK_RUN_ID = 'MOCK_RUN_ID'
const MOCK_ROBOT = 'MOCK_ROBOT'

describe('ProtocolRunHeader', () => {
  let props: ComponentProps<typeof ProtocolRunHeader>
  const mockNavigate = vi.fn()

  beforeEach(() => {
    props = {
      protocolRunHeaderRef: null,
      robotName: MOCK_ROBOT,
      runId: MOCK_RUN_ID,
      makeHandleJumpToStep: vi.fn(),
    }

    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_RUNNING)
    vi.mocked(useIsRobotViewable).mockReturnValue(true)
    vi.mocked(useProtocolDetailsForRun).mockReturnValue({
      protocolData: {} as any,
      displayName: MOCK_PROTOCOL,
    } as any)
    vi.mocked(useNotifyRunQuery).mockReturnValue({
      data: { data: { hasEverEnteredErrorRecovery: false } },
    } as any)
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [] },
    } as any)
    vi.mocked(useRunAnalytics).mockImplementation(() => {})
    vi.mocked(useRunErrors).mockReturnValue([] as any)
    vi.mocked(useRunHeaderRunControls).mockReturnValue({} as any)

    vi.mocked(RunHeaderModalContainer).mockReturnValue(
      <div>MOCK_RUN_HEADER_MODAL_CONTAINER</div>
    )
    vi.mocked(RunHeaderBannerContainer).mockReturnValue(
      <div>MOCK_RUN_HEADER_BANNER_CONTAINER</div>
    )
    vi.mocked(RunHeaderContent).mockReturnValue(
      <div>MOCK_RUN_HEADER_CONTENT</div>
    )
    vi.mocked(RunProgressMeter).mockReturnValue(
      <div>MOCK_RUN_PROGRESS_METER</div>
    )
    vi.mocked(RunHeaderProtocolName).mockReturnValue(
      <div>MOCK_RUN_HEADER_PROTOCOL_NAME</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const render = (props: ComponentProps<typeof ProtocolRunHeader>) => {
    return renderWithProviders(<ProtocolRunHeader {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it('renders all components', () => {
    render(props)

    screen.getByText('MOCK_RUN_HEADER_MODAL_CONTAINER')
    screen.getByText('MOCK_RUN_HEADER_PROTOCOL_NAME')
    screen.getByText('MOCK_RUN_HEADER_BANNER_CONTAINER')
    screen.getByText('MOCK_RUN_HEADER_CONTENT')
    screen.getByText('MOCK_RUN_PROGRESS_METER')
  })

  it('navigates to /devices if robot is not viewable and protocolData is not null', () => {
    vi.mocked(useIsRobotViewable).mockReturnValue(false)
    vi.mocked(useProtocolDetailsForRun).mockReturnValue({
      protocolData: {} as any,
      displayName: MOCK_PROTOCOL,
    } as any)

    render(props)

    expect(mockNavigate).toHaveBeenCalledWith('/devices')
  })

  it('does not navigate if protocolData is null', () => {
    vi.mocked(useIsRobotViewable).mockReturnValue(false)
    vi.mocked(useProtocolDetailsForRun).mockReturnValue({
      protocolData: null,
      displayName: MOCK_PROTOCOL,
    } as any)

    render(props)

    expect(mockNavigate).not.toHaveBeenCalledWith('/devices')
  })

  it('calls useRunAnalytics with correct parameters', () => {
    render(props)

    expect(useRunAnalytics).toHaveBeenCalledWith({
      runId: MOCK_RUN_ID,
      robotName: MOCK_ROBOT,
      enteredER: false,
    })
  })

  it('passes correct props to RunHeaderModalContainer', () => {
    render(props)

    expect(RunHeaderModalContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        runStatus: RUN_STATUS_RUNNING,
        runErrors: [],
        protocolRunControls: expect.any(Object),
      }),
      expect.anything()
    )
  })

  it('passes correct props to RunHeaderBannerContainer', () => {
    render(props)

    expect(RunHeaderBannerContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        runStatus: RUN_STATUS_RUNNING,
        enteredER: false,
        isResetRunLoading: false,
        runErrors: [],
      }),
      expect.anything()
    )
  })

  it('passes correct props to RunHeaderContent', () => {
    render(props)

    expect(RunHeaderContent).toHaveBeenCalledWith(
      expect.objectContaining({
        runStatus: RUN_STATUS_RUNNING,
        isResetRunLoadingRef: expect.any(Object),
        attachedModules: [],
        protocolRunControls: expect.any(Object),
      }),
      expect.anything()
    )
  })
})
