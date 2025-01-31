// Pipette Offset Calibration Orchestration Component
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'

import { useHost } from '@opentrons/react-api-client'
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
  ConfirmExit,
  LoadingState,
  CompleteConfirmation,
} from '/app/organisms/Desktop/CalibrationPanels'
import { WizardHeader } from '/app/molecules/WizardHeader'
import { getTopPortalEl } from '/app/App/portal'
import {
  CalibrationError,
  useCalibrationError,
} from '/app/organisms/Desktop/CalibrationError'

import type { ComponentType } from 'react'
import type { Mount } from '@opentrons/components'
import type {
  CalibrationLabware,
  CalibrationSessionStep,
  SessionCommandParams,
} from '/app/redux/sessions/types'
import type { CalibratePipetteOffsetParentProps } from './types'
import type { CalibrationPanelProps } from '/app/organisms/Desktop/CalibrationPanels/types'

const PANEL_BY_STEP: Partial<
  Record<CalibrationSessionStep, ComponentType<CalibrationPanelProps>>
> = {
  [Sessions.PIP_OFFSET_STEP_SESSION_STARTED]: Introduction,
  [Sessions.PIP_OFFSET_STEP_LABWARE_LOADED]: DeckSetup,
  [Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE]: TipPickUp,
  [Sessions.PIP_OFFSET_STEP_INSPECTING_TIP]: TipConfirmation,
  [Sessions.PIP_OFFSET_STEP_JOGGING_TO_DECK]: SaveZPoint,
  [Sessions.PIP_OFFSET_STEP_SAVING_POINT_ONE]: SaveXYPoint,
  [Sessions.PIP_OFFSET_STEP_TIP_LENGTH_COMPLETE]: PipetteOffsetCalibrationComplete,
  [Sessions.PIP_OFFSET_STEP_CALIBRATION_COMPLETE]: PipetteOffsetCalibrationComplete,
}
const STEPS_IN_ORDER: CalibrationSessionStep[] = [
  Sessions.PIP_OFFSET_STEP_SESSION_STARTED,
  Sessions.PIP_OFFSET_STEP_LABWARE_LOADED,
  Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE,
  Sessions.PIP_OFFSET_STEP_INSPECTING_TIP,
  Sessions.PIP_OFFSET_STEP_JOGGING_TO_DECK,
  Sessions.PIP_OFFSET_STEP_SAVING_POINT_ONE,
  Sessions.PIP_OFFSET_STEP_CALIBRATION_COMPLETE,
]

export function CalibratePipetteOffset({
  session,
  robotName,
  dispatchRequests,
  showSpinner,
  isJogging,
  requestIds,
}: CalibratePipetteOffsetParentProps): JSX.Element | null {
  const { t } = useTranslation('robot_calibration')
  const { currentStep, instrument, labware, supportedCommands } =
    session?.details ?? {}

  const queryClient = useQueryClient()
  const host = useHost()

  const {
    showConfirmation: showConfirmExit,
    confirm: confirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {
    cleanUpAndExit()
  }, true)

  const errorInfo = useCalibrationError(requestIds, session?.id)

  const tipRack: CalibrationLabware | null =
    labware != null ? labware.find(l => l.isTiprack) ?? null : null
  const calBlock: CalibrationLabware | null =
    labware != null ? labware.find(l => !l.isTiprack) ?? null : null

  const isMulti = useMemo(() => {
    const spec =
      instrument != null ? getPipetteModelSpecs(instrument.model) : null
    return spec != null ? spec.channels > 1 : false
  }, [instrument])

  function sendCommands(...commands: SessionCommandParams[]): void {
    if (session?.id != null && !isJogging) {
      const sessionCommandActions = commands.map(c =>
        Sessions.createSessionCommand(robotName, session.id, {
          command: c.command,
          data: c.data ?? {},
        })
      )
      dispatchRequests(...sessionCommandActions)
    }
  }

  function cleanUpAndExit(): void {
    queryClient.invalidateQueries([host, 'calibration']).catch((e: Error) => {
      console.error(`error invalidating calibration queries: ${e.message}`)
    })
    if (session?.id != null) {
      dispatchRequests(
        Sessions.createSessionCommand(robotName, session.id, {
          command: Sessions.sharedCalCommands.EXIT,
          data: {},
        }),
        Sessions.deleteSession(robotName, session.id)
      )
    }
  }

  if (session == null || tipRack == null) {
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
          title={t('pipette_offset_calibration')}
          currentStep={
            STEPS_IN_ORDER.findIndex(step => step === currentStep) ?? 0
          }
          totalSteps={STEPS_IN_ORDER.length - 1}
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
            sessionType: t('pipette_offset_calibration'),
          })}
          body={t('confirm_exit_before_completion', {
            sessionType: t('pipette_offset_calibration'),
          })}
        />
      ) : errorInfo != null ? (
        <CalibrationError {...errorInfo} onClose={cleanUpAndExit} />
      ) : (
        <Panel
          sendCommands={sendCommands}
          cleanUpAndExit={cleanUpAndExit}
          tipRack={tipRack}
          isMulti={isMulti}
          mount={instrument?.mount.toLowerCase() as Mount}
          calBlock={calBlock}
          currentStep={currentStep}
          sessionType={session.sessionType}
          robotName={robotName}
          supportedCommands={supportedCommands}
          defaultTipracks={instrument?.defaultTipracks}
        />
      )}
    </ModalShell>,
    getTopPortalEl()
  )
}

function PipetteOffsetCalibrationComplete(
  props: CalibrationPanelProps
): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const { cleanUpAndExit } = props

  return (
    <CompleteConfirmation
      {...{
        proceed: cleanUpAndExit,
        flowName: t('pipette_offset_calibration'),
      }}
    />
  )
}
