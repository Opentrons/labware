import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { getPipetteModelSpecs } from '@opentrons/shared-data'
import { useConditionalConfirm, ModalShell } from '@opentrons/components'

import * as Sessions from '/app/redux/sessions'
import {
  Introduction,
  DeckSetup,
  TipPickUp,
  TipConfirmation,
  SaveZPoint,
  SaveXYPoint,
  MeasureNozzle,
  MeasureTip,
  LoadingState,
  ConfirmExit,
} from '/app/organisms/Desktop/CalibrationPanels'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { getTopPortalEl } from '/app/App/portal'
import { ReturnTip } from './ReturnTip'
import { ResultsSummary } from './ResultsSummary'
import { CHECK_PIPETTE_RANK_FIRST } from '/app/redux/sessions'

import type { ComponentType } from 'react'
import type { Mount } from '@opentrons/components'
import type {
  CalibrationLabware,
  RobotCalibrationCheckPipetteRank,
  RobotCalibrationCheckStep,
  SessionCommandParams,
} from '/app/redux/sessions/types'
import type { CalibrationPanelProps } from '/app/organisms/Desktop/CalibrationPanels/types'
import type { CalibrationCheckParentProps } from './types'

const ROBOT_CALIBRATION_CHECK_SUBTITLE = 'Calibration health check'

const PANEL_BY_STEP: {
  [step in RobotCalibrationCheckStep]?: ComponentType<CalibrationPanelProps>
} = {
  [Sessions.CHECK_STEP_SESSION_STARTED]: Introduction,
  [Sessions.CHECK_STEP_LABWARE_LOADED]: DeckSetup,
  [Sessions.CHECK_STEP_COMPARING_NOZZLE]: MeasureNozzle,
  [Sessions.CHECK_STEP_PREPARING_PIPETTE]: TipPickUp,
  [Sessions.CHECK_STEP_INSPECTING_TIP]: TipConfirmation,
  [Sessions.CHECK_STEP_COMPARING_TIP]: MeasureTip,
  [Sessions.CHECK_STEP_COMPARING_HEIGHT]: SaveZPoint,
  [Sessions.CHECK_STEP_COMPARING_POINT_ONE]: SaveXYPoint,
  [Sessions.CHECK_STEP_COMPARING_POINT_TWO]: SaveXYPoint,
  [Sessions.CHECK_STEP_COMPARING_POINT_THREE]: SaveXYPoint,
  [Sessions.CHECK_STEP_RETURNING_TIP]: ReturnTip,
  [Sessions.CHECK_STEP_RESULTS_SUMMARY]: ResultsSummary,
}

const STEPS_IN_ORDER_ONE_PIPETTE: RobotCalibrationCheckStep[] = [
  Sessions.CHECK_STEP_SESSION_STARTED,
  Sessions.CHECK_STEP_LABWARE_LOADED,
  Sessions.CHECK_STEP_COMPARING_NOZZLE,
  Sessions.CHECK_STEP_PREPARING_PIPETTE,
  Sessions.CHECK_STEP_INSPECTING_TIP,
  Sessions.CHECK_STEP_COMPARING_TIP,
  Sessions.CHECK_STEP_COMPARING_HEIGHT,
  Sessions.CHECK_STEP_COMPARING_POINT_ONE,
  Sessions.CHECK_STEP_COMPARING_POINT_TWO,
  Sessions.CHECK_STEP_COMPARING_POINT_THREE,
  Sessions.CHECK_STEP_RETURNING_TIP,
  Sessions.CHECK_STEP_RESULTS_SUMMARY,
]
const STEPS_IN_ORDER_BOTH_PIPETTES: RobotCalibrationCheckStep[] = [
  Sessions.CHECK_STEP_SESSION_STARTED,
  Sessions.CHECK_STEP_LABWARE_LOADED,
  Sessions.CHECK_STEP_COMPARING_NOZZLE,
  Sessions.CHECK_STEP_PREPARING_PIPETTE,
  Sessions.CHECK_STEP_INSPECTING_TIP,
  Sessions.CHECK_STEP_COMPARING_TIP,
  Sessions.CHECK_STEP_COMPARING_HEIGHT,
  Sessions.CHECK_STEP_COMPARING_POINT_ONE,
  Sessions.CHECK_STEP_RETURNING_TIP,
  Sessions.CHECK_STEP_LABWARE_LOADED,
  Sessions.CHECK_STEP_COMPARING_NOZZLE,
  Sessions.CHECK_STEP_PREPARING_PIPETTE,
  Sessions.CHECK_STEP_INSPECTING_TIP,
  Sessions.CHECK_STEP_COMPARING_TIP,
  Sessions.CHECK_STEP_COMPARING_HEIGHT,
  Sessions.CHECK_STEP_COMPARING_POINT_ONE,
  Sessions.CHECK_STEP_COMPARING_POINT_TWO,
  Sessions.CHECK_STEP_COMPARING_POINT_THREE,
  Sessions.CHECK_STEP_RETURNING_TIP,
  Sessions.CHECK_STEP_RESULTS_SUMMARY,
]
function getStepIndexCheckingBothPipettes(
  currentStep: RobotCalibrationCheckStep | null,
  rank: RobotCalibrationCheckPipetteRank | null
): number {
  if (currentStep == null || rank == null) return 0
  return rank === CHECK_PIPETTE_RANK_FIRST
    ? STEPS_IN_ORDER_BOTH_PIPETTES.findIndex(step => step === currentStep)
    : STEPS_IN_ORDER_BOTH_PIPETTES.slice(9).findIndex(
        step => step === currentStep
      ) + 9
}

export function CheckCalibration(
  props: CalibrationCheckParentProps
): JSX.Element | null {
  const { t } = useTranslation('robot_calibration')
  const { session, robotName, dispatchRequests, showSpinner, isJogging } = props
  const {
    currentStep,
    activePipette,
    activeTipRack,
    instruments,
    comparisonsByPipette,
    labware,
  } = session?.details || {}

  const {
    showConfirmation: showConfirmExit,
    confirm: confirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {
    cleanUpAndExit()
  }, true)

  const isMulti = useMemo(() => {
    const spec = activePipette && getPipetteModelSpecs(activePipette.model)
    return spec ? spec.channels > 1 : false
  }, [activePipette])

  const calBlock: CalibrationLabware | null = labware
    ? labware.find(l => !l.isTiprack) ?? null
    : null

  function sendCommands(...commands: SessionCommandParams[]): void {
    if (session?.id && !isJogging) {
      const sessionCommandActions = commands.map(c =>
        Sessions.createSessionCommand(robotName, session.id, {
          command: c.command,
          data: c.data || {},
        })
      )
      dispatchRequests(...sessionCommandActions)
    }
  }

  function cleanUpAndExit(): void {
    if (session?.id) {
      dispatchRequests(
        Sessions.createSessionCommand(robotName, session.id, {
          command: Sessions.sharedCalCommands.EXIT,
          data: {},
        }),
        Sessions.deleteSession(robotName, session.id)
      )
    }
  }

  const checkBothPipettes = instruments?.length === 2
  const stepIndex = checkBothPipettes
    ? getStepIndexCheckingBothPipettes(
        currentStep ?? null,
        activePipette?.rank ?? null
      )
    : STEPS_IN_ORDER_ONE_PIPETTE.findIndex(step => step === currentStep) ?? 0

  if (!session || !activeTipRack) {
    return null
  }

  const Panel =
    currentStep != null && currentStep in PANEL_BY_STEP
      ? PANEL_BY_STEP[currentStep]
      : null
  return createPortal(
    <ModalShell
      width="47rem"
      header={
        <WizardHeader
          title={ROBOT_CALIBRATION_CHECK_SUBTITLE}
          currentStep={stepIndex}
          totalSteps={
            checkBothPipettes
              ? STEPS_IN_ORDER_BOTH_PIPETTES.length - 1
              : STEPS_IN_ORDER_ONE_PIPETTE.length - 1
          }
          onExit={confirmExit}
        />
      }
    >
      {showSpinner || currentStep == null || Panel == null ? (
        <LoadingState />
      ) : showConfirmExit ? (
        <ConfirmExit
          exit={confirmExit}
          back={cancelExit}
          heading={t('progress_will_be_lost', {
            sessionType: t('calibration_health_check'),
          })}
          body={t('confirm_exit_before_completion', {
            sessionType: t('calibration_health_check'),
          })}
        />
      ) : (
        <Panel
          sendCommands={sendCommands}
          cleanUpAndExit={cleanUpAndExit}
          tipRack={activeTipRack}
          calBlock={calBlock}
          isMulti={isMulti}
          mount={activePipette?.mount.toLowerCase() as Mount}
          currentStep={currentStep}
          sessionType={session.sessionType}
          checkBothPipettes={checkBothPipettes}
          instruments={instruments}
          comparisonsByPipette={comparisonsByPipette}
          activePipette={activePipette}
        />
      )}
    </ModalShell>,
    getTopPortalEl()
  )
}
