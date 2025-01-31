import { useTranslation } from 'react-i18next'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  COLORS,
  SPACING,
  TEXT_TRANSFORM_CAPITALIZE,
  TYPOGRAPHY,
  PrimaryButton,
  SecondaryButton,
} from '@opentrons/components'
import { CheckPipettesButton } from './CheckPipettesButton'
import { SimpleWizardBody } from '/app/molecules/SimpleWizardBody'
import { LevelPipette } from './LevelPipette'

import type { Dispatch, SetStateAction } from 'react'
import type {
  PipetteNameSpecs,
  PipetteModelSpecs,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'
import type { PipetteOffsetCalibration } from '/app/redux/calibration/types'
import type { Mount } from '/app/redux/pipettes/types'

export interface ConfirmPipetteProps {
  robotName: string
  success: boolean
  //  attachedWrong is referring to when a user attaches a pipette that is different
  //  from wantedPipette
  attachedWrong: boolean
  wantedPipette: PipetteNameSpecs | null
  actualPipette: PipetteModelSpecs | null
  actualPipetteOffset: PipetteOffsetCalibration | null
  displayName: string
  displayCategory: PipetteDisplayCategory | null
  mount: Mount
  //  wrongWantedPipette is referring to if the user attaches a pipette that is different
  //  from wantedPipette and they want to use it anyway
  wrongWantedPipette: PipetteNameSpecs | null
  setWrongWantedPipette: Dispatch<SetStateAction<PipetteNameSpecs | null>>
  confirmPipetteLevel: boolean
  setConfirmPipetteLevel: Dispatch<SetStateAction<boolean>>
  tryAgain: () => void
  exit: () => void
  nextStep: () => void
  toCalibrationDashboard: () => void
  isDisabled: boolean
}

export function ConfirmPipette(props: ConfirmPipetteProps): JSX.Element {
  const {
    success,
    mount,
    nextStep,
    wrongWantedPipette,
    actualPipette,
    setConfirmPipetteLevel,
    confirmPipetteLevel,
    isDisabled,
  } = props
  const { t } = useTranslation('change_pipette')

  const getPipetteStatusDetails = (
    props: ConfirmPipetteProps
  ): { header: string; subHeader: string } => {
    const {
      displayName,
      wantedPipette,
      attachedWrong,
      actualPipette,
      success,
    } = props
    let header
    let subHeader

    if ((wantedPipette && success) || wrongWantedPipette) {
      header = t('pipette_attached')
      subHeader = t('pipette_is_ready_to_use', {
        pipette: wrongWantedPipette
          ? actualPipette?.displayName
          : wantedPipette?.displayName,
      })
    } else if (wantedPipette) {
      header = attachedWrong
        ? t('incorrect_pipette_attached')
        : t('unable_to_detect_pipette', {
            pipette: wantedPipette.displayName ?? 'pipette',
          })

      subHeader = attachedWrong
        ? t('attached_pipette_does_not_match', {
            name: displayName,
            pipette: wantedPipette.displayName,
          })
        : t('press_white_connector')
    } else {
      header = success
        ? t('successfully_detached_pipette')
        : t('pipette_still_detected')
      subHeader = success ? '' : t('check_pipette_is_unplugged')
    }

    return { header, subHeader }
  }

  const { header, subHeader } = getPipetteStatusDetails({ ...props })

  const isWrongWantedPipette = wrongWantedPipette != null

  return !confirmPipetteLevel &&
    (wrongWantedPipette != null || (props.wantedPipette != null && success)) &&
    actualPipette != null &&
    actualPipette.channels === 8 &&
    actualPipette.displayCategory === 'GEN2' ? (
    <LevelPipette
      mount={mount}
      pipetteModelName={actualPipette.name}
      confirm={() => {
        nextStep()
        setConfirmPipetteLevel(true)
      }}
    />
  ) : (
    <SimpleWizardBody
      iconColor={
        success || wrongWantedPipette || confirmPipetteLevel
          ? COLORS.green50
          : COLORS.red50
      }
      header={header}
      subHeader={subHeader}
      isSuccess={success || isWrongWantedPipette || confirmPipetteLevel}
      robotType={OT2_ROBOT_TYPE}
    >
      <>
        {!success && !wrongWantedPipette && !confirmPipetteLevel && (
          <TryAgainButton {...props} />
        )}
        {success || wrongWantedPipette || confirmPipetteLevel ? (
          <SuccessAndExitButtons
            {...props}
            confirmPipetteLevel={confirmPipetteLevel}
            isDisabled={isDisabled}
          />
        ) : null}
      </>
    </SimpleWizardBody>
  )
}

function TryAgainButton(props: ConfirmPipetteProps): JSX.Element {
  const {
    actualPipette,
    attachedWrong,
    wantedPipette,
    robotName,
    tryAgain,
    exit,
    setWrongWantedPipette,
    wrongWantedPipette,
    isDisabled,
  } = props
  const { t } = useTranslation(['change_pipette', 'shared'])

  if (wantedPipette && attachedWrong && !wrongWantedPipette) {
    return (
      <>
        <SecondaryButton
          marginRight={SPACING.spacing8}
          onClick={() => {
            setWrongWantedPipette(actualPipette)
          }}
          disabled={isDisabled}
        >
          {t('use_attached_pipette')}
        </SecondaryButton>
        <PrimaryButton onClick={tryAgain} disabled={isDisabled}>
          {t('detach_try_again')}
        </PrimaryButton>
      </>
    )
  } else if (!actualPipette) {
    return (
      <>
        <SecondaryButton
          marginRight={SPACING.spacing8}
          onClick={exit}
          disabled={isDisabled}
        >
          {t('cancel_attachment')}
        </SecondaryButton>
        <CheckPipettesButton robotName={robotName}>
          {t('recheck_connection')}
        </CheckPipettesButton>
      </>
    )
  }
  return (
    <>
      <SecondaryButton
        marginRight={SPACING.spacing8}
        onClick={exit}
        disabled={isDisabled}
      >
        {t('leave_attached')}
      </SecondaryButton>
      <PrimaryButton
        onClick={tryAgain}
        textTransform={TYPOGRAPHY.textTransformCapitalize}
        disabled={isDisabled}
      >
        {t('shared:try_again')}
      </PrimaryButton>
    </>
  )
}

function SuccessAndExitButtons(props: ConfirmPipetteProps): JSX.Element {
  const {
    actualPipette,
    actualPipetteOffset,
    exit,
    toCalibrationDashboard,
    success,
    wrongWantedPipette,
    isDisabled,
  } = props
  const { t } = useTranslation('change_pipette')
  return (
    <>
      {!actualPipetteOffset &&
      (wrongWantedPipette || (success && actualPipette)) ? (
        <SecondaryButton
          marginRight={SPACING.spacing8}
          onClick={toCalibrationDashboard}
          disabled={isDisabled}
        >
          {t('calibrate_pipette_offset')}
        </SecondaryButton>
      ) : null}
      <PrimaryButton
        textTransform={TEXT_TRANSFORM_CAPITALIZE}
        onClick={exit}
        disabled={isDisabled}
      >
        {t('shared:exit')}
      </PrimaryButton>
    </>
  )
}
