import { useState } from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_FLEX_END,
  Btn,
  COLORS,
  PrimaryButton,
  RESPONSIVENESS,
  SecondaryButton,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { LEFT, RIGHT, NINETY_SIX_CHANNEL } from '@opentrons/shared-data'
import { SmallButton } from '/app/atoms/buttons'
import {
  SimpleWizardBody,
  SimpleWizardInProgressBody,
} from '/app/molecules/SimpleWizardBody'
import { usePipetteNameSpecs } from '/app/local-resources/instruments'
import { CheckPipetteButton } from './CheckPipetteButton'
import { FLOWS } from './constants'

import type { Dispatch, SetStateAction } from 'react'
import type {
  LoadedPipette,
  MotorAxes,
  PipetteName,
} from '@opentrons/shared-data'
import type { PipetteWizardStepProps } from './types'

interface ResultsProps extends PipetteWizardStepProps {
  handleCleanUpAndClose: () => void
  currentStepIndex: number
  totalStepCount: number
  isFetching: boolean
  setFetching: Dispatch<SetStateAction<boolean>>
  hasCalData: boolean
  requiredPipette?: LoadedPipette
  nextMount?: string
}

export const Results = (props: ResultsProps): JSX.Element => {
  const {
    goBack,
    proceed,
    flowType,
    attachedPipettes,
    mount,
    handleCleanUpAndClose,
    chainRunCommands,
    currentStepIndex,
    totalStepCount,
    selectedPipette,
    isOnDevice,
    isFetching,
    setFetching,
    hasCalData,
    isRobotMoving,
    requiredPipette,
    errorMessage,
    setShowErrorMessage,
    nextMount,
  } = props
  const { t, i18n } = useTranslation([
    'pipette_wizard_flows',
    'shared',
    'branded',
  ])
  const pipetteName =
    attachedPipettes[mount] != null ? attachedPipettes[mount]?.displayName : ''

  const isCorrectPipette =
    requiredPipette != null &&
    requiredPipette.pipetteName === attachedPipettes[mount]?.instrumentName

  const requiredPipDisplayName =
    usePipetteNameSpecs(requiredPipette?.pipetteName as PipetteName)
      ?.displayName ?? null

  const [numberOfTryAgains, setNumberOfTryAgains] = useState<number>(0)
  let header: string = 'unknown results screen'
  let iconColor: string = COLORS.green50
  let isSuccess: boolean = true
  let buttonText: string = i18n.format(t('shared:exit'), 'capitalize')
  let subHeader
  switch (flowType) {
    case FLOWS.CALIBRATE: {
      header = t(hasCalData ? 'pip_recal_success' : 'pip_cal_success', {
        pipetteName,
      })
      break
    }
    case FLOWS.ATTACH: {
      // attachment flow success
      if (
        (attachedPipettes[mount] != null && requiredPipette == null) ||
        Boolean(isCorrectPipette)
      ) {
        header = t('pipette_attached', { pipetteName })
        buttonText = t('cal_pipette')
        // attached wrong pipette
      } else if (
        attachedPipettes[mount] != null &&
        Boolean(!isCorrectPipette)
      ) {
        header = i18n.format(t('wrong_pip'), 'capitalize')
        buttonText = i18n.format(t('detach_and_retry'), 'capitalize')
        iconColor = COLORS.red50
        isSuccess = false
      } else {
        // attachment flow fail
        header = i18n.format(t('pipette_failed_to_attach'), 'capitalize')
        iconColor = COLORS.red50
        isSuccess = false
      }
      break
    }
    case FLOWS.DETACH: {
      if (attachedPipettes[mount] != null) {
        header = t('pipette_failed_to_detach', { pipetteName })
        iconColor = COLORS.red50
        isSuccess = false
      } else {
        header = i18n.format(t('pipette_detached'), 'capitalize')
        if (requiredPipette != null) {
          buttonText = t('attach_pip')
        }
        if (selectedPipette === NINETY_SIX_CHANNEL) {
          if (currentStepIndex === totalStepCount) {
            header = t('ninety_six_detached_success', {
              pipetteName: NINETY_SIX_CHANNEL,
            })
          } else if (
            attachedPipettes[LEFT] == null &&
            attachedPipettes[RIGHT] == null
          ) {
            header = t('all_pipette_detached')
            subHeader = t('gantry_empty_for_96_channel_success')
            buttonText = t('attach_pip')
          } else {
            buttonText = t('detach_next_pipette')
          }
        }
      }
      break
    }
  }

  const handleProceed = (): void => {
    if (currentStepIndex === totalStepCount || !isSuccess) {
      handleCleanUpAndClose()
    } else if (isSuccess && nextMount != null) {
      // move the gantry into the correct position for the next step of strung together flows
      chainRunCommands?.(
        [
          {
            commandType: 'home' as const,
            params: {
              axes: ['leftZ', 'rightZ'],
            },
          },
          {
            commandType: 'calibration/moveToMaintenancePosition' as const,
            params: {
              mount: nextMount === 'right' ? RIGHT : 'left',
              maintenancePosition:
                nextMount === 'both' ? 'attachPlate' : 'attachInstrument',
            },
          },
        ],
        false
      )
        .then(() => {
          proceed()
        })
        .catch(error => {
          setShowErrorMessage(error.message as string)
        })
    } else if (
      isSuccess &&
      flowType === FLOWS.ATTACH &&
      currentStepIndex !== totalStepCount
    ) {
      // proceeding to attach probe for calibration
      const axes: MotorAxes =
        mount === LEFT ? ['leftPlunger'] : ['rightPlunger']
      chainRunCommands?.(
        [
          {
            commandType: 'loadPipette' as const,
            params: {
              pipetteName: attachedPipettes[mount]?.instrumentName ?? '',
              pipetteId: attachedPipettes[mount]?.serialNumber ?? '',
              mount,
            },
          },
          {
            commandType: 'home' as const,
            params: {
              axes,
            },
          },
        ],
        false
      )
        .then(() => {
          proceed()
        })
        .catch(error => {
          setShowErrorMessage(error.message as string)
        })
    } else {
      proceed()
    }
  }
  let button: JSX.Element = Boolean(isOnDevice) ? (
    <SmallButton
      textTransform={TYPOGRAPHY.textTransformCapitalize}
      onClick={handleProceed}
      buttonText={buttonText}
    />
  ) : (
    <PrimaryButton
      textTransform={TYPOGRAPHY.textTransformCapitalize}
      onClick={handleProceed}
      aria-label="Results_exit"
    >
      {buttonText}
    </PrimaryButton>
  )

  if (
    flowType === FLOWS.ATTACH &&
    requiredPipette != null &&
    requiredPipDisplayName != null &&
    Boolean(!isCorrectPipette)
  ) {
    subHeader = t('please_install_correct_pip', {
      pipetteName: requiredPipDisplayName,
    })
    button = (
      <CheckPipetteButton
        proceedButtonText={buttonText}
        setFetching={setFetching}
        isFetching={isFetching}
        isOnDevice={isOnDevice}
      />
    )
  } else if (
    !isSuccess &&
    requiredPipette == null &&
    requiredPipDisplayName == null &&
    (flowType === FLOWS.ATTACH || flowType === FLOWS.DETACH)
  ) {
    const GO_BACK_BUTTON_STYLE = css`
      ${TYPOGRAPHY.pSemiBold};
      color: ${COLORS.grey50};

      &:hover {
        opacity: 70%;
      }

      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
        font-size: ${TYPOGRAPHY.fontSize22};

        &:hover {
          opacity: 100%;
        }
      }
    `
    subHeader =
      numberOfTryAgains > 2 ? t('branded:something_seems_wrong') : undefined
    button = (
      <>
        {Boolean(isOnDevice) ? (
          <Btn onClick={goBack} aria-label="back">
            <LegacyStyledText css={GO_BACK_BUTTON_STYLE}>
              {t('shared:go_back')}
            </LegacyStyledText>
          </Btn>
        ) : (
          <SecondaryButton
            isDangerous
            onClick={handleCleanUpAndClose}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            disabled={isFetching}
            aria-label="Results_errorExit"
            marginRight={SPACING.spacing4}
          >
            {flowType === FLOWS.DETACH
              ? i18n.format(t('cancel_detachment'))
              : i18n.format(t('cancel_attachment'))}
          </SecondaryButton>
        )}
        <CheckPipetteButton
          proceed={() => {
            setNumberOfTryAgains(numberOfTryAgains + 1)
          }}
          proceedButtonText={i18n.format(t('try_again'), 'capitalize')}
          setFetching={setFetching}
          isFetching={isFetching}
          isOnDevice={isOnDevice}
        />
      </>
    )
  }
  if (isRobotMoving)
    return <SimpleWizardInProgressBody description={t('stand_back')} />
  if (errorMessage != null) {
    return (
      <SimpleWizardBody
        isSuccess={false}
        iconColor={COLORS.red50}
        header={t('shared:error_encountered')}
        subHeader={errorMessage}
      />
    )
  }
  return (
    <SimpleWizardBody
      iconColor={iconColor}
      header={header}
      isSuccess={isSuccess}
      subHeader={subHeader}
      isPending={isFetching}
      width="100%"
      justifyContentForOddButton={
        Boolean(isOnDevice) && isSuccess ? ALIGN_FLEX_END : undefined
      }
    >
      {button}
    </SimpleWizardBody>
  )
}
