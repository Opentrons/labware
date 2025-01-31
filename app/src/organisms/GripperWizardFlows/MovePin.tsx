import { useTranslation, Trans } from 'react-i18next'
import { EXTENSION } from '@opentrons/shared-data'
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  Flex,
  LegacyStyledText,
} from '@opentrons/components'
import { css } from 'styled-components'
import {
  SimpleWizardBody,
  SimpleWizardInProgressBody,
} from '/app/molecules/SimpleWizardBody'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import {
  MOVE_PIN_FROM_FRONT_JAW_TO_REAR_JAW,
  MOVE_PIN_TO_FRONT_JAW,
  REMOVE_PIN_FROM_REAR_JAW,
} from './constants'
import movePinStorageToFront from '/app/assets/videos/gripper-wizards/PIN_FROM_STORAGE_TO_FRONT_JAW.webm'
import movePinFrontToRear from '/app/assets/videos/gripper-wizards/PIN_FROM_FRONT_TO_REAR_JAW.webm'
import movePinRearToStorage from '/app/assets/videos/gripper-wizards/PIN_FROM_REAR_TO_STORAGE.webm'
import calibratingFrontJaw from '/app/assets/videos/gripper-wizards/CALIBRATING_FRONT_JAW.webm'
import calibratingRearJaw from '/app/assets/videos/gripper-wizards/CALIBRATING_REAR_JAW.webm'

import type { ReactNode } from 'react'
import type { Coordinates } from '@opentrons/shared-data'
import type { CreateMaintenanceCommand } from '/app/resources/runs'
import type { GripperWizardStepProps, MovePinStep } from './types'

interface MovePinProps extends GripperWizardStepProps, MovePinStep {
  setFrontJawOffset: (offset: Coordinates) => void
  frontJawOffset: Coordinates | null
  isExiting: boolean
  createRunCommand: CreateMaintenanceCommand
}

export const MovePin = (props: MovePinProps): JSX.Element | null => {
  const {
    proceed,
    isRobotMoving,
    goBack,
    movement,
    setFrontJawOffset,
    maintenanceRunId,
    frontJawOffset,
    createRunCommand,
    errorMessage,
    setErrorMessage,
    isExiting,
  } = props
  const { t } = useTranslation(['gripper_wizard_flows', 'shared'])

  const handleOnClick = (): void => {
    if (movement === REMOVE_PIN_FROM_REAR_JAW) {
      proceed()
    } else if (maintenanceRunId != null) {
      const jaw = movement === MOVE_PIN_TO_FRONT_JAW ? 'front' : 'rear'
      createRunCommand({
        maintenanceRunId,
        command: {
          commandType: 'home' as const,
          params: {
            axes: ['extensionZ', 'extensionJaw'],
          },
        },
        waitUntilComplete: true,
      })
        .then(({ data }) => {
          if (data.status === 'failed') {
            setErrorMessage(data.error?.detail ?? null)
          }
          createRunCommand({
            maintenanceRunId,
            command: {
              commandType: 'home' as const,
              params: {
                skipIfMountPositionOk: 'extension',
              },
            },
            waitUntilComplete: true,
          })
            .then(({ data }) => {
              createRunCommand({
                maintenanceRunId,
                command: {
                  commandType: 'calibration/calibrateGripper' as const,
                  params:
                    jaw === 'rear' && frontJawOffset != null
                      ? { jaw, otherJawOffset: frontJawOffset }
                      : { jaw },
                },
                waitUntilComplete: true,
              })
                .then(({ data }) => {
                  if (data.status === 'failed') {
                    setErrorMessage(data.error?.detail ?? null)
                  }
                  if (jaw === 'front' && data?.result?.jawOffset != null) {
                    setFrontJawOffset(data.result.jawOffset as Coordinates)
                  }
                  createRunCommand({
                    maintenanceRunId,
                    command: {
                      commandType: 'calibration/moveToMaintenancePosition' as const,
                      params: {
                        mount: EXTENSION,
                      },
                    },
                    waitUntilComplete: true,
                  })
                    .then(({ data }) => {
                      if (data.status === 'failed') {
                        setErrorMessage(data.error?.detail ?? null)
                      }
                      proceed()
                    })
                    .catch(error => {
                      setErrorMessage(error.message as string)
                    })
                })
                .catch(error => {
                  setErrorMessage(error.message as string)
                })
            })
            .catch(error => {
              setErrorMessage(error.message as string)
            })
        })
        .catch(error => {
          setErrorMessage(error.message as string)
        })
    }
  }
  const infoByMovement: {
    [m in typeof movement]: {
      inProgressText: string
      header: string
      body: ReactNode
      buttonText: string
      prepImage: ReactNode
      inProgressImage?: ReactNode
    }
  } = {
    [MOVE_PIN_TO_FRONT_JAW]: {
      inProgressText: t('stand_back_gripper_is_calibrating'),
      inProgressImage: (
        <Flex height="10.2rem" paddingTop={SPACING.spacing4}>
          <video
            css={css`
              max-width: 100%;
              max-height: 100%;
            `}
            autoPlay={true}
            loop={true}
            controls={false}
            aria-label="calibrating front jaw"
          >
            <source src={calibratingFrontJaw} />
          </video>
        </Flex>
      ),
      header: t('insert_pin_into_front_jaw'),
      body: t('move_pin_from_storage_to_front_jaw'),
      buttonText: t('begin_calibration'),
      prepImage: (
        <video
          css={css`
            max-width: 100%;
            max-height: 20rem;
          `}
          autoPlay={true}
          loop={true}
          controls={false}
          aria-label="move calibration pin from storage location to front jaw"
        >
          <source src={movePinStorageToFront} />
        </video>
      ),
    },
    [MOVE_PIN_FROM_FRONT_JAW_TO_REAR_JAW]: {
      inProgressText: t('stand_back_gripper_is_calibrating'),
      inProgressImage: (
        <Flex height="10.2rem" paddingTop={SPACING.spacing4}>
          <video
            css={css`
              max-width: 100%;
              max-height: 100%;
            `}
            autoPlay={true}
            loop={true}
            controls={false}
            aria-label="calibrating rear jaw"
          >
            <source src={calibratingRearJaw} />
          </video>
        </Flex>
      ),
      header: t('insert_pin_into_rear_jaw'),
      body: t('move_pin_from_front_to_rear_jaw'),
      buttonText: t('continue_calibration'),
      prepImage: (
        <video
          css={css`
            max-width: 100%;
            max-height: 20rem;
          `}
          autoPlay={true}
          loop={true}
          controls={false}
          aria-label="move calibration pin from front jaw to rear jaw"
        >
          <source src={movePinFrontToRear} />
        </video>
      ),
    },
    [REMOVE_PIN_FROM_REAR_JAW]: {
      inProgressText: t('shared:stand_back_robot_is_in_motion'),
      header: t('remove_calibration_pin'),
      body: t('move_pin_from_rear_jaw_to_storage'),
      buttonText: t('complete_calibration'),
      prepImage: (
        <video
          css={css`
            max-width: 100%;
            max-height: 20rem;
          `}
          autoPlay={true}
          loop={true}
          controls={false}
          aria-label="move calibration rear jaw to storage"
        >
          <source src={movePinRearToStorage} />
        </video>
      ),
    },
  }

  const {
    inProgressText,
    header,
    body,
    buttonText,
    prepImage,
    inProgressImage,
  } = infoByMovement[movement]
  if (isRobotMoving)
    return (
      <SimpleWizardInProgressBody
        description={
          errorMessage == null && !isExiting
            ? inProgressText
            : t('shared:stand_back_robot_is_in_motion')
        }
        body={
          errorMessage == null && !isExiting
            ? t('calibration_pin_touching', { slot: 'C2' })
            : null
        }
        alternativeSpinner={
          errorMessage == null && !isExiting ? inProgressImage : undefined
        }
      />
    )

  return errorMessage != null ? (
    <SimpleWizardBody
      isSuccess={false}
      iconColor={COLORS.red50}
      header={t('shared:error_encountered')}
      subHeader={
        <Trans
          t={t}
          i18nKey={'return_pin_error'}
          values={{ error: errorMessage }}
          components={{
            block: <LegacyStyledText as="p" />,
            bold: (
              <LegacyStyledText
                as="p"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              />
            ),
          }}
        />
      }
    />
  ) : (
    <GenericWizardTile
      header={header}
      rightHandBody={prepImage}
      bodyText={<LegacyStyledText as="p">{body}</LegacyStyledText>}
      proceedButtonText={buttonText}
      proceed={handleOnClick}
      proceedIsDisabled={maintenanceRunId == null}
      back={movement !== MOVE_PIN_TO_FRONT_JAW ? goBack : undefined}
    />
  )
}
