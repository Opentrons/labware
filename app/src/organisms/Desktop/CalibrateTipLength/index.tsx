// Tip Length Calibration Orchestration Component
import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { css } from 'styled-components'

import { useHost } from '@opentrons/react-api-client'
import { getPipetteModelSpecs } from '@opentrons/shared-data'
import { useConditionalConfirm, ModalShell } from '@opentrons/components'

import * as Sessions from '/app/redux/sessions'
import {
  Introduction,
  DeckSetup,
  TipPickUp,
  TipConfirmation,
  MeasureNozzle,
  MeasureTip,
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
import slotOneRemoveBlockAsset from '/app/assets/videos/tip-length-cal/Slot_1_Remove_CalBlock_(330x260)REV1.webm'
import slotThreeRemoveBlockAsset from '/app/assets/videos/tip-length-cal/Slot_3_Remove_CalBlock_(330x260)REV1.webm'

import type { ComponentType } from 'react'
import type { Mount } from '@opentrons/components'
import type {
  SessionCommandParams,
  CalibrationLabware,
  CalibrationSessionStep,
} from '/app/redux/sessions/types'
import type { CalibrationPanelProps } from '/app/organisms/Desktop/CalibrationPanels/types'
import type { CalibrateTipLengthParentProps } from './types'

export { AskForCalibrationBlockModal } from './AskForCalibrationBlockModal'
export { ConfirmRecalibrationModal } from './ConfirmRecalibrationModal'

const PANEL_BY_STEP: Partial<
  Record<CalibrationSessionStep, ComponentType<CalibrationPanelProps>>
> = {
  sessionStarted: Introduction,
  labwareLoaded: DeckSetup,
  measuringNozzleOffset: MeasureNozzle,
  preparingPipette: TipPickUp,
  inspectingTip: TipConfirmation,
  measuringTipOffset: MeasureTip,
  calibrationComplete: TipLengthCalibrationComplete,
}
const STEPS_IN_ORDER: CalibrationSessionStep[] = [
  Sessions.TIP_LENGTH_STEP_SESSION_STARTED,
  Sessions.TIP_LENGTH_STEP_LABWARE_LOADED,
  Sessions.TIP_LENGTH_STEP_MEASURING_NOZZLE_OFFSET,
  Sessions.TIP_LENGTH_STEP_PREPARING_PIPETTE,
  Sessions.TIP_LENGTH_STEP_INSPECTING_TIP,
  Sessions.TIP_LENGTH_STEP_MEASURING_TIP_OFFSET,
  Sessions.TIP_LENGTH_STEP_CALIBRATION_COMPLETE,
]

export function CalibrateTipLength({
  session,
  robotName,
  showSpinner,
  dispatchRequests,
  requestIds,
  isJogging,
  offsetInvalidationHandler,
  allowChangeTipRack = false,
}: CalibrateTipLengthParentProps): JSX.Element | null {
  const { t } = useTranslation('robot_calibration')
  const { currentStep, instrument, labware, supportedCommands } =
    session?.details ?? {}

  const queryClient = useQueryClient()
  const host = useHost()

  const isMulti = useMemo(() => {
    const spec =
      instrument != null ? getPipetteModelSpecs(instrument.model) : null
    return spec != null ? spec.channels > 1 : false
  }, [instrument])

  const tipRack: CalibrationLabware | null =
    labware != null ? labware.find(l => l.isTiprack) ?? null : null
  const calBlock: CalibrationLabware | null =
    labware != null ? labware.find(l => !l.isTiprack) ?? null : null

  const errorInfo = useCalibrationError(requestIds, session?.id)

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

  const {
    showConfirmation: showConfirmExit,
    confirm: confirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {
    cleanUpAndExit()
  }, true)

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
          title={t('tip_length_calibration')}
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
            sessionType: t('tip_length_calibration'),
          })}
          body={t('confirm_exit_before_completion', {
            sessionType: t('tip_length_calibration'),
          })}
        />
      ) : errorInfo != null ? (
        <CalibrationError {...errorInfo} onClose={cleanUpAndExit} />
      ) : (
        <Panel
          sendCommands={sendCommands}
          cleanUpAndExit={cleanUpAndExit}
          isMulti={isMulti}
          mount={instrument?.mount.toLowerCase() as Mount}
          tipRack={tipRack}
          calBlock={calBlock}
          currentStep={currentStep}
          sessionType={session.sessionType}
          supportedCommands={supportedCommands}
          calInvalidationHandler={offsetInvalidationHandler}
          allowChangeTipRack={allowChangeTipRack}
        />
      )}
    </ModalShell>,
    getTopPortalEl()
  )
}

const blockRemovalAssetBySlot: {
  [slot in CalibrationLabware['slot']]: string
} = {
  '1': slotOneRemoveBlockAsset,
  '3': slotThreeRemoveBlockAsset,
}

function TipLengthCalibrationComplete(
  props: CalibrationPanelProps
): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const { calBlock, cleanUpAndExit } = props

  const visualAid =
    calBlock != null ? (
      <video
        key={blockRemovalAssetBySlot[calBlock.slot]}
        css={css`
          max-width: 100%;
          max-height: 15rem;
        `}
        autoPlay={true}
        loop={true}
        controls={false}
      >
        <source src={blockRemovalAssetBySlot[calBlock.slot]} />
      </video>
    ) : null

  return (
    <CompleteConfirmation
      {...{
        proceed: cleanUpAndExit,
        flowName: t('tip_length_calibration'),
        body: t('you_can_remove_cal_block'),
        visualAid,
      }}
    />
  )
}
