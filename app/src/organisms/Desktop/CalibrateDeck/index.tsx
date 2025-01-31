// Deck Calibration Orchestration Component
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
import type { CalibrationPanelProps } from '/app/organisms/Desktop/CalibrationPanels/types'
import type { CalibrateDeckParentProps } from './types'

const PANEL_BY_STEP: Partial<
  Record<CalibrationSessionStep, ComponentType<CalibrationPanelProps>>
> = {
  [Sessions.DECK_STEP_SESSION_STARTED]: Introduction,
  [Sessions.DECK_STEP_LABWARE_LOADED]: DeckSetup,
  [Sessions.DECK_STEP_PREPARING_PIPETTE]: TipPickUp,
  [Sessions.DECK_STEP_INSPECTING_TIP]: TipConfirmation,
  [Sessions.DECK_STEP_JOGGING_TO_DECK]: SaveZPoint,
  [Sessions.DECK_STEP_SAVING_POINT_ONE]: SaveXYPoint,
  [Sessions.DECK_STEP_SAVING_POINT_TWO]: SaveXYPoint,
  [Sessions.DECK_STEP_SAVING_POINT_THREE]: SaveXYPoint,
  [Sessions.DECK_STEP_CALIBRATION_COMPLETE]: DeckCalibrationComplete,
}
const STEPS_IN_ORDER: CalibrationSessionStep[] = [
  Sessions.DECK_STEP_SESSION_STARTED,
  Sessions.DECK_STEP_LABWARE_LOADED,
  Sessions.DECK_STEP_PREPARING_PIPETTE,
  Sessions.DECK_STEP_INSPECTING_TIP,
  Sessions.DECK_STEP_JOGGING_TO_DECK,
  Sessions.DECK_STEP_SAVING_POINT_ONE,
  Sessions.DECK_STEP_SAVING_POINT_TWO,
  Sessions.DECK_STEP_SAVING_POINT_THREE,
  Sessions.DECK_STEP_CALIBRATION_COMPLETE,
]

export function CalibrateDeck({
  session,
  robotName,
  dispatchRequests,
  requestIds,
  showSpinner,
  isJogging,
  exitBeforeDeckConfigCompletion,
  offsetInvalidationHandler,
}: CalibrateDeckParentProps): JSX.Element | null {
  const { t } = useTranslation('robot_calibration')

  const { currentStep, instrument, labware, supportedCommands } =
    session?.details || {}

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

  const isMulti = useMemo(() => {
    const spec = instrument && getPipetteModelSpecs(instrument.model)
    return spec ? spec.channels > 1 : false
  }, [instrument])

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
    queryClient.invalidateQueries([host, 'calibration']).catch((e: Error) => {
      console.error(`error invalidating calibration queries: ${e.message}`)
    })
    if (
      exitBeforeDeckConfigCompletion &&
      currentStep !== Sessions.DECK_STEP_CALIBRATION_COMPLETE
    ) {
      exitBeforeDeckConfigCompletion.current = true
    }
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

  const tipRack: CalibrationLabware | null =
    (labware && labware.find(l => l.isTiprack)) ?? null

  if (!session || !tipRack) {
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
          title={t('deck_calibration')}
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
            sessionType: t('deck_calibration'),
          })}
          body={t('confirm_exit_before_completion', {
            sessionType: t('deck_calibration'),
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
          currentStep={currentStep}
          sessionType={session.sessionType}
          supportedCommands={supportedCommands}
          defaultTipracks={instrument?.defaultTipracks}
          calInvalidationHandler={offsetInvalidationHandler}
          allowChangeTipRack
        />
      )}
    </ModalShell>,
    getTopPortalEl()
  )
}

function DeckCalibrationComplete(props: CalibrationPanelProps): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const { cleanUpAndExit } = props

  return (
    <CompleteConfirmation
      {...{
        proceed: cleanUpAndExit,
        flowName: t('deck_calibration'),
      }}
    />
  )
}
