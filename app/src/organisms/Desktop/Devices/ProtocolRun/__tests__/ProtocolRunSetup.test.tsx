import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'

import {
  getSimplestDeckConfigForProtocol,
  parseAllRequiredModuleModels,
  parseLiquidsInLoadOrder,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  simple_v4 as noModulesProtocol,
  test_modules_protocol as withModulesProtocol,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'
import {
  getIsFixtureMismatch,
  getRequiredDeckConfig,
} from '/app/resources/deck_configuration/utils'
import {
  useMostRecentCompletedAnalysis,
  useRunCalibrationStatus,
  useRunPipetteInfoByMount,
  useNotifyRunQuery,
  useRunHasStarted,
  useUnmatchedModulesForProtocol,
  useModuleCalibrationStatus,
  useProtocolAnalysisErrors,
} from '/app/resources/runs'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { useRequiredSetupStepsInOrder } from '/app/redux-resources/runs'
import { useStoredProtocolAnalysis } from '/app/resources/analysis'
import { getMissingSetupSteps } from '/app/redux/protocol-runs'
import { useLPCFlows } from '/app/organisms/LabwarePositionCheck'

import { SetupLabware } from '../SetupLabware'
import { SetupRobotCalibration } from '../SetupRobotCalibration'
import { SetupLiquids } from '../SetupLiquids'
import { SetupModuleAndDeck } from '../SetupModuleAndDeck'
import { EmptySetupStep } from '../EmptySetupStep'
import { ProtocolRunSetup } from '../ProtocolRunSetup'
import * as ReduxRuns from '/app/redux/protocol-runs'

import type { State } from '/app/redux/types'

import type * as SharedData from '@opentrons/shared-data'

vi.mock('../SetupLabware')
vi.mock('../SetupRobotCalibration')
vi.mock('../SetupModuleAndDeck')
vi.mock('../SetupLiquids')
vi.mock('../EmptySetupStep')
vi.mock('/app/resources/runs/useNotifyRunQuery')
vi.mock('/app/resources/runs/useMostRecentCompletedAnalysis')
vi.mock('/app/resources/runs/useRunCalibrationStatus')
vi.mock('/app/resources/runs/useRunPipetteInfoByMount')
vi.mock('/app/resources/runs/useRunHasStarted')
vi.mock('/app/resources/runs/useUnmatchedModulesForProtocol')
vi.mock('/app/resources/runs/useModuleCalibrationStatus')
vi.mock('/app/resources/runs/useProtocolAnalysisErrors')
vi.mock('/app/redux/config')
vi.mock('/app/redux/protocol-runs')
vi.mock('/app/resources/protocol-runs')
vi.mock('/app/resources/deck_configuration/utils')
vi.mock('/app/resources/deck_configuration/hooks')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/redux-resources/runs')
vi.mock('/app/resources/analysis')
vi.mock('/app/organisms/LabwarePositionCheck')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    parseAllRequiredModuleModels: vi.fn(),
    parseLiquidsInLoadOrder: vi.fn(),
    parseProtocolData: vi.fn(),
    getSimplestDeckConfigForProtocol: vi.fn(),
  }
})

const ROBOT_NAME = 'otie'
const RUN_ID = '1'
const MOCK_PROTOCOL_LIQUID_KEY = { liquids: [] }
const render = () => {
  return renderWithProviders<State>(
    <ProtocolRunSetup
      protocolRunHeaderRef={null}
      robotName={ROBOT_NAME}
      runId={RUN_ID}
    />,
    {
      initialState: {} as State,
      i18nInstance: i18n,
    }
  )[0]
}

describe('ProtocolRunSetup', () => {
  beforeEach(() => {
    when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(false)
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn({
        ...noModulesProtocol,
        ...MOCK_PROTOCOL_LIQUID_KEY,
      } as any)
    when(vi.mocked(getMissingSetupSteps))
      .calledWith(expect.any(Object), RUN_ID)
      .thenReturn([])
    when(vi.mocked(useProtocolAnalysisErrors)).calledWith(RUN_ID).thenReturn({
      analysisErrors: null,
    })
    when(vi.mocked(useStoredProtocolAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(({
        ...noModulesProtocol,
        ...MOCK_PROTOCOL_LIQUID_KEY,
      } as unknown) as SharedData.ProtocolAnalysisOutput)
    when(vi.mocked(useRequiredSetupStepsInOrder))
      .calledWith({
        runId: RUN_ID,
        protocolAnalysis: expect.any(Object),
      })
      .thenReturn({
        orderedSteps: [
          ReduxRuns.ROBOT_CALIBRATION_STEP_KEY,
          ReduxRuns.MODULE_SETUP_STEP_KEY,
          ReduxRuns.LPC_STEP_KEY,
          ReduxRuns.LABWARE_SETUP_STEP_KEY,
          ReduxRuns.LIQUID_SETUP_STEP_KEY,
        ],
        orderedApplicableSteps: [
          ReduxRuns.ROBOT_CALIBRATION_STEP_KEY,
          ReduxRuns.MODULE_SETUP_STEP_KEY,
          ReduxRuns.LPC_STEP_KEY,
          ReduxRuns.LABWARE_SETUP_STEP_KEY,
          ReduxRuns.LIQUID_SETUP_STEP_KEY,
        ],
      })
    vi.mocked(parseAllRequiredModuleModels).mockReturnValue([])
    vi.mocked(parseLiquidsInLoadOrder).mockReturnValue([])
    when(vi.mocked(useRobot))
      .calledWith(ROBOT_NAME)
      .thenReturn(mockConnectedRobot)
    when(vi.mocked(useRunCalibrationStatus))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({ complete: true })
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(false)
    when(vi.mocked(SetupRobotCalibration))
      .calledWith(
        expect.objectContaining({
          robotName: ROBOT_NAME,
          runId: RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<span>Mock SetupRobotCalibration</span>)
    when(vi.mocked(SetupLabware))
      .calledWith(
        expect.objectContaining({
          robotName: ROBOT_NAME,
          runId: RUN_ID,
        }),
        // @ts-expect-error Potential Vitest issue. Seems this actually takes two args.
        expect.anything()
      )
      .thenReturn(<span>Mock SetupLabware</span>)
    vi.mocked(SetupRobotCalibration).mockReturnValue(
      <div>Mock SetupRobotCalibration</div>
    )
    vi.mocked(SetupModuleAndDeck).mockReturnValue(<div>Mock SetupModules</div>)
    vi.mocked(SetupLiquids).mockReturnValue(<div>Mock SetupLiquids</div>)
    vi.mocked(EmptySetupStep).mockReturnValue(<div>Mock EmptySetupStep</div>)
    vi.mocked(getSimplestDeckConfigForProtocol).mockReturnValue([])
    vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([])
    vi.mocked(getRequiredDeckConfig).mockReturnValue([])
    when(vi.mocked(useUnmatchedModulesForProtocol))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({ missingModuleIds: [], remainingAttachedModules: [] })
    vi.mocked(getIsFixtureMismatch).mockReturnValue(false)
    vi.mocked(useNotifyRunQuery).mockReturnValue({} as any)
    when(vi.mocked(useRunPipetteInfoByMount))
      .calledWith(RUN_ID)
      .thenReturn({ left: null, right: null })
    when(vi.mocked(useModuleCalibrationStatus))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({ complete: true })
    vi.mocked(useLPCFlows).mockReturnValue({
      launchLPC: vi.fn(),
      lpcProps: null,
      showLPC: false,
      isLaunchingLPC: false,
    })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders null if robot is null', () => {
    when(vi.mocked(useRobot)).calledWith(ROBOT_NAME).thenReturn(null)
    const { container } = render()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders loading data message if robot-analyzed and app-analyzed protocol data is null', () => {
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(null)
    when(vi.mocked(useStoredProtocolAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(null)
    when(vi.mocked(useRequiredSetupStepsInOrder))
      .calledWith({ runId: RUN_ID, protocolAnalysis: null })
      .thenReturn({
        orderedSteps: [
          ReduxRuns.ROBOT_CALIBRATION_STEP_KEY,
          ReduxRuns.LPC_STEP_KEY,
          ReduxRuns.LABWARE_SETUP_STEP_KEY,
        ],
        orderedApplicableSteps: [
          ReduxRuns.ROBOT_CALIBRATION_STEP_KEY,
          ReduxRuns.LPC_STEP_KEY,
          ReduxRuns.LABWARE_SETUP_STEP_KEY,
        ],
      })
    render()
    screen.getByText('Loading data...')
  })

  it('renders calibration ready when robot calibration complete', () => {
    render()
    screen.getByText('Calibration ready')
  })

  it('renders calibration needed when robot calibration not complete', () => {
    when(vi.mocked(useRunCalibrationStatus))
      .calledWith(ROBOT_NAME, RUN_ID)
      .thenReturn({ complete: false })
    render()
    screen.getByText('Calibration needed')
  })

  describe('when no modules are in the protocol', () => {
    it('renders robot calibration setup for OT-2', () => {
      render()

      screen.getByText(
        'Review required pipettes and tip length calibrations for this protocol.'
      )
      const robotCalibrationSetup = screen.getByText('Instruments')
      fireEvent.click(robotCalibrationSetup)
      expect(screen.getByText('Mock SetupRobotCalibration')).toBeVisible()
    })
    it('renders robot calibration setup for Flex', () => {
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      render()

      screen.getByText(
        'Review required instruments and calibrations for this protocol.'
      )
      const robotCalibrationSetup = screen.getByText('Instruments')
      fireEvent.click(robotCalibrationSetup)
      expect(screen.getByText('Mock SetupRobotCalibration')).toBeVisible()
    })
    it('renders labware setup', () => {
      render()

      screen.getByText(
        'Gather the following labware and full tip racks. To run your protocol without Labware Position Check, place and secure labware in their initial locations.'
      )
      const labwareSetup = screen.getByText('Labware')
      fireEvent.click(labwareSetup)
      expect(screen.getByText('Mock SetupLabware')).toBeVisible()
    })
    it('renders the empty states for modules and liquids when no modules in protocol', () => {
      render()
      screen.getAllByText('Mock EmptySetupStep')
    })

    it('defaults to no step expanded', () => {
      render()
      expect(screen.getByText('Mock SetupLabware')).not.toBeVisible()
    })

    it('renders view-only info message if run has started', async () => {
      when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(true)

      render()
      await new Promise(resolve => setTimeout(resolve, 1000))
      expect(screen.getByText('Mock SetupRobotCalibration')).not.toBeVisible()
      expect(screen.getByText('Mock SetupLabware')).not.toBeVisible()
      screen.getByText('Setup is view-only once run has started')
    })
  })

  describe('when modules are in the protocol', () => {
    beforeEach(() => {
      vi.mocked(parseAllRequiredModuleModels).mockReturnValue([
        'magneticModuleV1',
        'temperatureModuleV1',
      ])
      when(vi.mocked(useMostRecentCompletedAnalysis))
        .calledWith(RUN_ID)
        .thenReturn({
          ...withModulesProtocol,
          ...MOCK_PROTOCOL_LIQUID_KEY,
        } as any)
      when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(false)
      when(vi.mocked(useModuleCalibrationStatus))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({ complete: true })
    })
    afterEach(() => {
      vi.clearAllMocks()
    })

    it('renders calibration ready if robot is Flex and modules are calibrated', () => {
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      when(vi.mocked(useModuleCalibrationStatus))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({ complete: true })

      render()
      expect(screen.getAllByText('Calibration ready').length).toEqual(2)
    })

    it('renders calibration needed if robot is Flex and modules are not calibrated', () => {
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      when(vi.mocked(useModuleCalibrationStatus))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({ complete: false })

      render()
      screen.getByText('Deck hardware')
      screen.getByText('Calibration needed')
    })

    it('does not render calibration element if robot is OT-2', () => {
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(false)

      render()
      expect(screen.getAllByText('Calibration ready').length).toEqual(1)
    })

    it('renders action needed if robot is Flex and modules are not connected', () => {
      when(vi.mocked(useUnmatchedModulesForProtocol))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({
          missingModuleIds: ['temperatureModuleV1'],
          remainingAttachedModules: [],
        })
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      when(vi.mocked(useModuleCalibrationStatus))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({ complete: false })

      render()
      screen.getByText('Deck hardware')
      screen.getByText('Action needed')
    })

    it('renders action needed if robot is Flex and deck config is not configured', () => {
      vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([
        {
          cutoutId: 'cutoutA1',
          cutoutFixtureId: STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
          requiredAddressableAreas: ['D4'],
          compatibleCutoutFixtureIds: [
            STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
          ],
          missingLabwareDisplayName: null,
        },
      ])
      vi.mocked(getRequiredDeckConfig).mockReturnValue([
        {
          cutoutId: 'cutoutA1',
          cutoutFixtureId: STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
          requiredAddressableAreas: ['D4'],
          compatibleCutoutFixtureIds: [
            STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
          ],
        },
      ] as any)
      vi.mocked(getIsFixtureMismatch).mockReturnValue(true)
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      when(vi.mocked(useModuleCalibrationStatus))
        .calledWith(ROBOT_NAME, RUN_ID)
        .thenReturn({ complete: false })

      render()
      screen.getByText('Deck hardware')
      screen.getByText('Action needed')
    })

    it('renders module setup and allows the user to proceed to labware setup', () => {
      render()
      const moduleSetup = screen.getByText('Deck hardware')
      fireEvent.click(moduleSetup)
      screen.getByText('Mock SetupModules')
    })

    it('renders correct text contents for multiple modules', () => {
      render()

      screen.getByText('Instruments')
      screen.getByText(
        'Review required pipettes and tip length calibrations for this protocol.'
      )
      screen.getByText('Deck hardware')

      screen.getByText('Install the required modules.')
      screen.getByText('Labware')

      screen.getByText(
        'Gather the following labware and full tip racks. To run your protocol without Labware Position Check, place and secure labware in their initial locations.'
      )
    })

    it('renders correct text contents for single module', () => {
      when(vi.mocked(useMostRecentCompletedAnalysis))
        .calledWith(RUN_ID)
        .thenReturn({
          ...withModulesProtocol,
          ...MOCK_PROTOCOL_LIQUID_KEY,
          modules: [
            {
              id: '1d57adf0-67ad-11ea-9f8b-3b50068bd62d:magneticModuleType',
              location: { slot: '1' },
              model: 'magneticModuleV1',
            },
          ],
        } as any)
      vi.mocked(parseAllRequiredModuleModels).mockReturnValue([
        'magneticModuleV1',
      ])
      render()

      screen.getByText('Instruments')
      screen.getByText(
        'Review required pipettes and tip length calibrations for this protocol.'
      )
      screen.getByText('Deck hardware')

      screen.getByText('Install the required module.')
      screen.getByText('Labware')
      screen.getByText(
        'Gather the following labware and full tip racks. To run your protocol without Labware Position Check, place and secure labware in their initial locations.'
      )
    })

    it('renders correct text contents for modules and fixtures', () => {
      when(vi.mocked(useIsFlex)).calledWith(ROBOT_NAME).thenReturn(true)
      when(vi.mocked(useMostRecentCompletedAnalysis))
        .calledWith(RUN_ID)
        .thenReturn({
          ...withModulesProtocol,
          ...MOCK_PROTOCOL_LIQUID_KEY,
          modules: [
            {
              id: '1d57adf0-67ad-11ea-9f8b-3b50068bd62d:magneticModuleType',
              location: { slot: '1' },
              model: 'magneticModuleV1',
            },
          ],
        } as any)
      vi.mocked(parseAllRequiredModuleModels).mockReturnValue([
        'magneticModuleV1',
      ])
      render()

      screen.getByText('Deck hardware')
      screen.getByText(
        'Install and calibrate the required modules. Install the required fixtures.'
      )
    })

    it('renders view-only info message if run has started', async () => {
      when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(true)

      render()
      screen.getByText('Setup is view-only once run has started')
    })

    it('renders analysis error message if there is an analysis error', async () => {
      when(vi.mocked(useProtocolAnalysisErrors))
        .calledWith(RUN_ID)
        .thenReturn({
          analysisErrors: [
            {
              id: 'error_id',
              detail: 'protocol analysis error',
              errorType: 'analysis',
              createdAt: '100000',
            },
          ],
        })
      render()
      screen.getByText('Protocol analysis failed')
    })
  })
})
