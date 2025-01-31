import { Route, MemoryRouter, Routes } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { vi, it, describe, expect, beforeEach } from 'vitest'

import { RUN_STATUS_IDLE, RUN_STATUS_STOPPED } from '@opentrons/api-client'
import {
  useAllPipetteOffsetCalibrationsQuery,
  useInstrumentsQuery,
  useProtocolQuery,
  useDoorQuery,
  useModulesQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { renderWithProviders } from '/app/__testing-utils__'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'
import {
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  flexDeckDefV5,
} from '@opentrons/shared-data'

import { i18n } from '/app/i18n'
import { useToaster } from '/app/organisms/ToasterOven'
import { mockRobotSideAnalysis } from '/app/molecules/Command/__fixtures__'
import { useAttachedModules } from '/app/resources/modules'
import { useRobotType } from '/app/redux-resources/robots'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import { getLocalRobot } from '/app/redux/discovery'
import { ANALYTICS_PROTOCOL_RUN_ACTION } from '/app/redux/analytics'
import { getProtocolModulesInfo } from '/app/transformations/analysis'
import {
  ProtocolSetupLabware,
  ProtocolSetupLiquids,
  ProtocolSetupModulesAndDeck,
  ProtocolSetupOffsets,
  ViewOnlyParameters,
  ProtocolSetupTitleSkeleton,
  ProtocolSetupStepSkeleton,
  getUnmatchedModulesForProtocol,
  getIncompleteInstrumentCount,
} from '/app/organisms/ODD/ProtocolSetup'
import { useLaunchLegacyLPC } from '/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC'
import { ConfirmCancelRunModal } from '/app/organisms/ODD/RunningProtocol'
import { mockProtocolModuleInfo } from '/app/organisms/ODD/ProtocolSetup/ProtocolSetupInstruments/__fixtures__'
import {
  useProtocolHasRunTimeParameters,
  useRunControls,
} from '/app/organisms/RunTimeControl/hooks'
import { useIsHeaterShakerInProtocol } from '/app/organisms/ModuleCard/hooks'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration/useNotifyDeckConfigurationQuery'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { ConfirmAttachedModal } from '../ConfirmAttachedModal'
import { ConfirmSetupStepsCompleteModal } from '../ConfirmSetupStepsCompleteModal'
import { ProtocolSetup } from '../'
import {
  useNotifyRunQuery,
  useRunStatus,
  useRunCreatedAtTimestamp,
  useLPCDisabledReason,
  useModuleCalibrationStatus,
  useProtocolAnalysisErrors,
} from '/app/resources/runs'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import { mockRunTimeParameterData } from '/app/organisms/ODD/ProtocolSetup/__fixtures__'
import { useScrollPosition } from '/app/local-resources/dom-utils'

import type { UseQueryResult } from 'react-query'
import type * as SharedData from '@opentrons/shared-data'
import type { NavigateFunction } from 'react-router-dom'

let mockNavigate = vi.fn()

vi.mock('@opentrons/shared-data', async importOriginal => {
  const sharedData = await importOriginal<typeof SharedData>()
  return {
    ...sharedData,
    getDeckDefFromRobotType: vi.fn(),
  }
})

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC')
vi.mock('/app/organisms/ODD/ProtocolSetup', async importOriginal => {
  const ACTUALS = ['ProtocolSetupStep']
  const actual = await importOriginal<object>()
  return Object.fromEntries(
    Object.entries(actual).map(([k, v]) =>
      ACTUALS.includes(k) ? [k, v] : [k, vi.fn()]
    )
  )
})

vi.mock('/app/transformations/analysis')
vi.mock('/app/organisms/ODD/RunningProtocol')
vi.mock('/app/organisms/RunTimeControl/hooks')
vi.mock('/app/organisms/ModuleCard/hooks')
vi.mock('/app/redux/discovery/selectors')
vi.mock('../ConfirmAttachedModal')
vi.mock('/app/organisms/ToasterOven')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/deck_configuration/hooks')
vi.mock('/app/resources/deck_configuration/useNotifyDeckConfigurationQuery')
vi.mock('../ConfirmSetupStepsCompleteModal')
vi.mock('/app/redux-resources/analytics')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/modules')
vi.mock('/app/local-resources/dom-utils')

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <Routes>
        <Route path="/runs/:runId/setup/" element={<ProtocolSetup />} />
      </Routes>
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const MockProtocolSetupLabware = vi.mocked(ProtocolSetupLabware)
const MockProtocolSetupLiquids = vi.mocked(ProtocolSetupLiquids)
const MockProtocolSetupOffsets = vi.mocked(ProtocolSetupOffsets)
const MockProtocolSetupTitleSkeleton = vi.mocked(ProtocolSetupTitleSkeleton)
const MockProtocolSetupStepSkeleton = vi.mocked(ProtocolSetupStepSkeleton)
const MockConfirmSetupStepsCompleteModal = vi.mocked(
  ConfirmSetupStepsCompleteModal
)
const ROBOT_NAME = 'fake-robot-name'
const RUN_ID = 'my-run-id'
const ROBOT_SERIAL_NUMBER = 'OT123'
const PROTOCOL_ID = 'my-protocol-id'
const PROTOCOL_NAME = 'Mock Protocol Name'
const CREATED_AT = 'top of the hour'
const mockGripperData = {
  instrumentModel: 'gripper_v1',
  instrumentType: 'gripper',
  mount: 'extension',
  serialNumber: 'ghi789',
}
const mockRightPipetteData = {
  instrumentModel: 'p300_single_v2',
  instrumentType: 'p300',
  mount: 'right',
  serialNumber: 'abc123',
}
const mockLeftPipetteData = {
  instrumentModel: 'p1000_single_v2',
  instrumentType: 'p1000',
  mount: 'left',
  serialNumber: 'def456',
}
const mockEmptyAnalysis = ({
  modules: [],
  labware: [],
  pipettes: [],
  commands: [],
} as unknown) as SharedData.CompletedProtocolAnalysis
const mockLiquids = [
  {
    id: 'm',
    displayName: 'mock',
    description: 'Mock liquid',
  },
]

const mockPlay = vi.fn()
const mockOffset = {
  id: 'fake_labware_offset',
  createdAt: 'timestamp',
  definitionUri: 'fake_def_uri',
  location: { slotName: 'A1' },
  vector: { x: 1, y: 2, z: 3 },
}

const mockDoorStatus = {
  data: {
    status: 'closed',
    doorRequiredClosedForProtocol: true,
  },
}
const mockFixture = {
  cutoutId: 'cutoutD1',
  cutoutFixtureId: STAGING_AREA_RIGHT_SLOT_FIXTURE,
}

const MOCK_MAKE_SNACKBAR = vi.fn()
const mockTrackProtocolRunEvent = vi.fn()

describe('ProtocolSetup', () => {
  let mockLaunchLPC = vi.fn()
  beforeEach(() => {
    mockLaunchLPC = vi.fn()
    mockNavigate = vi.fn()
    MockProtocolSetupLiquids.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLiquids</div>
      })
    )
    MockProtocolSetupLabware.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLabware</div>
      })
    )
    MockProtocolSetupOffsets.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupOffsets</div>
      })
    )
    MockConfirmSetupStepsCompleteModal.mockReturnValue(
      <div>Mock ConfirmSetupStepsCompleteModal</div>
    )
    vi.mocked(useLPCDisabledReason).mockReturnValue(null)
    vi.mocked(useAttachedModules).mockReturnValue([])
    vi.mocked(useModuleCalibrationStatus).mockReturnValue({ complete: true })
    vi.mocked(getLocalRobot).mockReturnValue({
      ...mockConnectableRobot,
      name: ROBOT_NAME,
      health: {
        ...mockConnectableRobot.health,
        robot_serial: ROBOT_SERIAL_NUMBER,
      },
    } as any)
    when(vi.mocked(useRobotType))
      .calledWith(ROBOT_NAME)
      .thenReturn(FLEX_ROBOT_TYPE)
    when(vi.mocked(useRunControls))
      .calledWith(RUN_ID)
      .thenReturn({
        play: mockPlay,
        pause: () => {},
        stop: () => {},
        reset: () => {},
        resumeFromRecovery: () => {},
        isPlayRunActionLoading: false,
        isPauseRunActionLoading: false,
        isStopRunActionLoading: false,
        isResetRunLoading: false,
        isResumeRunFromRecoveryActionLoading: false,
        isRunControlLoading: false,
      })
    when(vi.mocked(useRunStatus)).calledWith(RUN_ID).thenReturn(RUN_STATUS_IDLE)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: mockEmptyAnalysis,
    } as any)
    when(vi.mocked(useRunCreatedAtTimestamp))
      .calledWith(RUN_ID)
      .thenReturn(CREATED_AT)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(mockEmptyAnalysis, flexDeckDefV5 as any)
      .thenReturn([])
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], [])
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    when(vi.mocked(getDeckDefFromRobotType))
      .calledWith('OT-3 Standard')
      .thenReturn(flexDeckDefV5 as any)
    when(vi.mocked(useNotifyRunQuery))
      .calledWith(RUN_ID, { staleTime: Infinity })
      .thenReturn({
        data: {
          data: {
            protocolId: PROTOCOL_ID,
            labwareOffsets: [mockOffset],
          },
        },
      } as any)
    when(vi.mocked(useProtocolAnalysisErrors))
      .calledWith(RUN_ID)
      .thenReturn({ analysisErrors: null })
    when(vi.mocked(useProtocolQuery))
      .calledWith(PROTOCOL_ID, { staleTime: Infinity })
      .thenReturn({
        data: { data: { metadata: { protocolName: PROTOCOL_NAME } } },
      } as any)
    when(vi.mocked(useInstrumentsQuery))
      .calledWith()
      .thenReturn({
        data: {
          data: [mockLeftPipetteData, mockRightPipetteData, mockGripperData],
        },
      } as any)
    when(vi.mocked(useAllPipetteOffsetCalibrationsQuery))
      .calledWith()
      .thenReturn({ data: { data: [] } } as any)
    when(vi.mocked(useLaunchLegacyLPC))
      .calledWith(RUN_ID, FLEX_ROBOT_TYPE, PROTOCOL_NAME)
      .thenReturn({
        launchLegacyLPC: mockLaunchLPC,
        LegacyLPCWizard: <div>mock LPC Wizard</div>,
      })
    vi.mocked(useIsHeaterShakerInProtocol).mockReturnValue(false)
    vi.mocked(useDoorQuery).mockReturnValue({ data: mockDoorStatus } as any)
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [mockHeaterShaker] },
    } as any)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [mockFixture],
    } as UseQueryResult<SharedData.DeckConfiguration>)
    when(vi.mocked(useToaster))
      .calledWith()
      .thenReturn(({
        makeSnackbar: MOCK_MAKE_SNACKBAR,
      } as unknown) as any)
    vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([])
    vi.mocked(useProtocolHasRunTimeParameters).mockReturnValue(false)
    when(vi.mocked(useTrackProtocolRunEvent))
      .calledWith(RUN_ID, ROBOT_NAME)
      .thenReturn({ trackProtocolRunEvent: mockTrackProtocolRunEvent })
    vi.mocked(useScrollPosition).mockReturnValue({
      isScrolled: false,
      scrollRef: {} as any,
    })
  })

  it('should render text, image, and buttons', () => {
    render(`/runs/${RUN_ID}/setup/`)
    screen.getByText('Prepare to run')
    screen.getByText('Instruments')
    screen.getByText('Deck hardware')
    screen.getByText('Labware')
    screen.getByText('Labware Position Check')
    screen.getByText('Liquids')
  })

  it('should play protocol when click play button', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: { ...mockRobotSideAnalysis, liquids: mockLiquids },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        { ...mockRobotSideAnalysis, liquids: mockLiquids },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    vi.mocked(getIncompleteInstrumentCount).mockReturnValue(0)
    MockProtocolSetupLiquids.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLiquids</div>
      })
    )
    MockProtocolSetupLabware.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLabware</div>
      })
    )
    MockProtocolSetupOffsets.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupOffsets</div>
      })
    )
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByText('Labware Position Check'))
    fireEvent.click(screen.getByText('Labware'))
    fireEvent.click(screen.getByText('Liquids'))
    expect(mockPlay).toBeCalledTimes(0)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(MockConfirmSetupStepsCompleteModal).toBeCalledTimes(0)
    expect(mockPlay).toBeCalledTimes(1)
  })

  it('should launch cancel modal when click close button', () => {
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByRole('button', { name: 'close' }))
    expect(vi.mocked(ConfirmCancelRunModal)).toHaveBeenCalled()
  })

  it('should launch protocol setup modules screen when click modules', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: mockRobotSideAnalysis,
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(mockRobotSideAnalysis, flexDeckDefV5 as any)
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByText('Deck hardware'))
    expect(vi.mocked(ProtocolSetupModulesAndDeck)).toHaveBeenCalled()
  })

  it('should launch protocol setup liquids screen when click liquids', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: { ...mockRobotSideAnalysis, liquids: mockLiquids },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        { ...mockRobotSideAnalysis, liquids: mockLiquids },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    render(`/runs/${RUN_ID}/setup/`)
    screen.getByText('1 initial liquid')
    fireEvent.click(screen.getByText('Liquids'))
    expect(MockProtocolSetupLiquids).toHaveBeenCalled()
  })

  it('should launch protocol setup labware screen when click labware', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: { ...mockRobotSideAnalysis, liquids: mockLiquids },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        { ...mockRobotSideAnalysis, liquids: mockLiquids },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    render(`/runs/${RUN_ID}/setup`)
    fireEvent.click(screen.getByTestId('SetupButton_Labware'))
    expect(MockProtocolSetupLabware).toHaveBeenCalled()
  })

  it('should launch view only parameters screen when click parameters', () => {
    vi.mocked(useProtocolHasRunTimeParameters).mockReturnValue(true)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: {
        ...mockRobotSideAnalysis,
        runTimeParameters: mockRunTimeParameterData,
      },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        {
          ...mockRobotSideAnalysis,
          runTimeParameters: mockRunTimeParameterData,
        },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByText('Parameters'))
    expect(vi.mocked(ViewOnlyParameters)).toHaveBeenCalled()
  })

  it('should launch offsets screen when click offsets', () => {
    MockProtocolSetupOffsets.mockImplementation(
      vi.fn(() => <div>Mock ProtocolSetupOffsets</div>)
    )
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByText('Labware Position Check'))
    expect(MockProtocolSetupOffsets).toHaveBeenCalled()
    screen.getByText(/Mock ProtocolSetupOffsets/)
  })

  it('should render a confirmation modal when heater-shaker is in a protocol and it is not shaking', () => {
    vi.mocked(useIsHeaterShakerInProtocol).mockReturnValue(true)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: { ...mockRobotSideAnalysis, liquids: mockLiquids },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        { ...mockRobotSideAnalysis, liquids: mockLiquids },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    vi.mocked(getIncompleteInstrumentCount).mockReturnValue(0)
    MockProtocolSetupLiquids.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLiquids</div>
      })
    )
    MockProtocolSetupLabware.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupLabware</div>
      })
    )
    MockProtocolSetupOffsets.mockImplementation(
      vi.fn(({ setIsConfirmed, setSetupScreen }) => {
        setIsConfirmed(true)
        setSetupScreen('prepare to run')
        return <div>Mock ProtocolSetupOffsets</div>
      })
    )
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByText('Labware Position Check'))
    fireEvent.click(screen.getByText('Labware'))
    fireEvent.click(screen.getByText('Liquids'))
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(vi.mocked(ConfirmAttachedModal)).toHaveBeenCalled()
  })
  it('should go from skip steps to heater-shaker modal', () => {
    vi.mocked(useIsHeaterShakerInProtocol).mockReturnValue(true)
    MockConfirmSetupStepsCompleteModal.mockImplementation(
      ({ onConfirmClick }) => {
        onConfirmClick()
        return <div>Mock ConfirmSetupStepsCompleteModal</div>
      }
    )
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(MockConfirmSetupStepsCompleteModal).toHaveBeenCalled()
    expect(vi.mocked(ConfirmAttachedModal)).toHaveBeenCalled()
  })
  it('should render a loading skeleton while awaiting a response from the server', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: null,
    } as any)
    MockProtocolSetupTitleSkeleton.mockReturnValue(<div>SKELETON</div>)
    MockProtocolSetupStepSkeleton.mockReturnValue(<div>SKELETON</div>)
    render(`/runs/${RUN_ID}/setup/`)
    expect(screen.getAllByText('SKELETON').length).toBeGreaterThanOrEqual(2)
  })

  it('should render toast and make a button disabled when a robot door is open', () => {
    const mockOpenDoorStatus = {
      data: {
        status: 'open',
        doorRequiredClosedForProtocol: true,
      },
    }
    vi.mocked(useDoorQuery).mockReturnValue({ data: mockOpenDoorStatus } as any)
    render(`/runs/${RUN_ID}/setup/`)
    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(MOCK_MAKE_SNACKBAR).toBeCalledWith(
      'Close the robot door before starting the run.'
    )
  })

  it('calls trackProtocolRunEvent when tapping play button', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: { ...mockRobotSideAnalysis, liquids: mockLiquids },
    } as any)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(
        { ...mockRobotSideAnalysis, liquids: mockLiquids },
        flexDeckDefV5 as any
      )
      .thenReturn(mockProtocolModuleInfo)
    when(vi.mocked(getUnmatchedModulesForProtocol))
      .calledWith([], mockProtocolModuleInfo)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    vi.mocked(getIncompleteInstrumentCount).mockReturnValue(0)
    render(`/runs/${RUN_ID}/setup/`)

    fireEvent.click(screen.getByRole('button', { name: 'play' }))
    expect(mockTrackProtocolRunEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROTOCOL_RUN_ACTION.START,
      properties: {},
    })
  })

  it('should redirect to the protocols page when a run is stopped', () => {
    vi.mocked(useRunStatus).mockReturnValue(RUN_STATUS_STOPPED)
    render(`/runs/${RUN_ID}/setup/`)
    expect(mockNavigate).toHaveBeenCalledWith('/protocols')
  })
})
