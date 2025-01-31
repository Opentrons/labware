import { useState, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  InputField,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  POSITION_ABSOLUTE,
  POSITION_FIXED,
  POSITION_RELATIVE,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useUpdateRobotNameMutation } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  removeRobot,
  getConnectableRobots,
  getReachableRobots,
  getUnreachableRobots,
  getLocalRobot,
} from '/app/redux/discovery'
import { useTrackEvent, ANALYTICS_RENAME_ROBOT } from '/app/redux/analytics'
import { AlphanumericKeyboard } from '/app/atoms/SoftwareKeyboard'
import { SmallButton } from '/app/atoms/buttons'
import { StepMeter } from '/app/atoms/StepMeter'
import { useIsUnboxingFlowOngoing } from '/app/redux-resources/config'
import { ConfirmRobotName } from '/app/organisms/ODD/NameRobot/ConfirmRobotName'

import type { FieldError, Resolver } from 'react-hook-form'
import type { UpdatedRobotName } from '@opentrons/api-client'
import type { State, Dispatch } from '/app/redux/types'

interface FormValues {
  newRobotName: string
}

export function NameRobot(): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const navigate = useNavigate()
  const trackEvent = useTrackEvent()
  const localRobot = useSelector(getLocalRobot)
  const ipAddress = localRobot?.ip
  const previousName = localRobot?.name != null ? localRobot.name : null
  const [newName, setNewName] = useState<string>('')
  const [isShowConfirmRobotName, setIsShowConfirmRobotName] = useState<boolean>(
    false
  )
  const keyboardRef = useRef(null)
  const dispatch = useDispatch<Dispatch>()
  const isUnboxingFlowOngoing = useIsUnboxingFlowOngoing()

  const connectableRobots = useSelector((state: State) =>
    getConnectableRobots(state)
  )
  const reachableRobots = useSelector((state: State) =>
    getReachableRobots(state)
  )
  const unreachableRobots = useSelector((state: State) =>
    getUnreachableRobots(state)
  )

  const validate = (
    data: FormValues,
    errors: Record<string, FieldError>
  ): Record<string, FieldError> => {
    const newName = data.newRobotName
    let errorMessage: string | undefined
    // In ODD users cannot input letters and numbers from software keyboard
    // so the app only checks the length of input string
    if (newName.length < 1) {
      errorMessage = t('name_rule_error_name_length')
    }

    if (
      [...connectableRobots, ...reachableRobots].some(
        robot => newName === robot.name && robot.ip !== ipAddress
      )
    ) {
      errorMessage = t('name_rule_error_exist')
    }

    const updatedErrors =
      errorMessage != null
        ? {
            ...errors,
            newRobotName: {
              type: 'error',
              message: errorMessage,
            },
          }
        : errors
    return updatedErrors
  }

  const resolver: Resolver<FormValues> = values => {
    let errors = {}
    errors = validate(values, errors)
    return { values, errors }
  }

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
    trigger,
    watch,
  } = useForm({
    defaultValues: {
      newRobotName: '',
    },
    resolver,
  })

  const newRobotName = watch('newRobotName')

  const onSubmit = (data: FormValues): void => {
    const newName = data.newRobotName
    const sameNameRobotInUnavailable = unreachableRobots.find(
      robot => robot.name === newName
    )
    if (sameNameRobotInUnavailable != null) {
      dispatch(removeRobot(sameNameRobotInUnavailable.name))
    }
    updateRobotName(newName)
    reset({ newRobotName: '' })
  }

  const { updateRobotName, isLoading: isNaming } = useUpdateRobotNameMutation({
    onSuccess: (data: UpdatedRobotName) => {
      if (data.name != null) {
        setNewName(data.name)
        if (!isUnboxingFlowOngoing) {
          navigate('/robot-settings')
        } else {
          setIsShowConfirmRobotName(true)
        }
        if (previousName != null) {
          dispatch(removeRobot(previousName))
        }
      }
    },
    onError: (error: Error) => {
      console.error('error', error.message)
    },
  })

  const handleConfirm = async (): Promise<void> => {
    await trigger('newRobotName')

    // check robot name in the same network
    trackEvent({
      name: ANALYTICS_RENAME_ROBOT,
      properties: {
        previousRobotName: previousName,
        newRobotName: newRobotName,
        robotType: FLEX_ROBOT_TYPE,
      },
    })
    handleSubmit(onSubmit)()
  }

  return (
    <>
      {isShowConfirmRobotName && isUnboxingFlowOngoing ? (
        <ConfirmRobotName robotName={newName} />
      ) : (
        <>
          {isUnboxingFlowOngoing ? (
            <StepMeter totalSteps={6} currentStep={5} />
          ) : null}
          <Flex
            flexDirection={DIRECTION_COLUMN}
            paddingY={SPACING.spacing32}
            paddingX={SPACING.spacing40}
          >
            <Flex
              flexDirection={DIRECTION_ROW}
              alignItems={ALIGN_CENTER}
              justifyContent={
                isUnboxingFlowOngoing ? JUSTIFY_CENTER : JUSTIFY_SPACE_BETWEEN
              }
              position={POSITION_RELATIVE}
            >
              <Flex position={POSITION_ABSOLUTE} left="0">
                <Btn
                  data-testid="name_back_button"
                  onClick={() => {
                    if (isUnboxingFlowOngoing) {
                      navigate('/emergency-stop')
                    } else {
                      navigate('/robot-settings')
                    }
                  }}
                >
                  <Icon name="back" size="3rem" color={COLORS.black90} />
                </Btn>
              </Flex>
              <Flex marginLeft={isUnboxingFlowOngoing ? '0' : '4rem'}>
                <LegacyStyledText
                  as="h2"
                  fontWeight={TYPOGRAPHY.fontWeightBold}
                >
                  {isUnboxingFlowOngoing
                    ? t('name_your_robot')
                    : t('rename_robot')}
                </LegacyStyledText>
              </Flex>
              <Flex position={POSITION_ABSOLUTE} right="0">
                {Boolean(isNaming) ? (
                  <Icon
                    name="ot-spinner"
                    size="1.25rem"
                    spin
                    marginRight={SPACING.spacing8}
                  />
                ) : (
                  <SmallButton
                    buttonText={t('shared:confirm')}
                    buttonCategory="rounded"
                    onClick={handleConfirm}
                  />
                )}
              </Flex>
            </Flex>
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            alignItems={ALIGN_CENTER}
            paddingX={SPACING.spacing40}
            height="15.125rem"
            paddingTop={isUnboxingFlowOngoing ? undefined : SPACING.spacing80}
          >
            <Flex
              flexDirection={DIRECTION_COLUMN}
              marginBottom={SPACING.spacing8}
              paddingX={SPACING.spacing60}
              width="100%"
            >
              {isUnboxingFlowOngoing ? (
                <LegacyStyledText
                  as="h4"
                  fontWeight={TYPOGRAPHY.fontWeightRegular}
                  color={COLORS.grey60}
                  marginBottom={SPACING.spacing24}
                >
                  {t('name_your_robot_description')}
                </LegacyStyledText>
              ) : null}
              <Controller
                control={control}
                name="newRobotName"
                render={({ field, fieldState }) => (
                  <InputField
                    data-testid="name-robot_input"
                    id="newRobotName"
                    name="newRobotName"
                    type="text"
                    value={field.value}
                    error={fieldState.error?.message && ''}
                    textAlign={TYPOGRAPHY.textAlignCenter}
                    onBlur={e => {
                      e.target.focus()
                    }}
                  />
                )}
              />
            </Flex>
            <LegacyStyledText
              as="p"
              color={COLORS.grey60}
              fontWeight={TYPOGRAPHY.fontWeightRegular}
            >
              {t('name_rule_description')}
            </LegacyStyledText>
            {errors.newRobotName != null ? (
              <LegacyStyledText
                as="p"
                fontWeight={TYPOGRAPHY.fontWeightRegular}
                color={COLORS.red50}
              >
                {errors.newRobotName.message}
              </LegacyStyledText>
            ) : null}
          </Flex>

          <Flex width="100%" position={POSITION_FIXED} left="0" bottom="0">
            <Controller
              control={control}
              name="newRobotName"
              render={({ field }) => (
                <AlphanumericKeyboard
                  onChange={(input: string) => {
                    field.onChange(input)
                    void trigger('newRobotName')
                  }}
                  keyboardRef={keyboardRef}
                />
              )}
            />
          </Flex>
        </>
      )}
    </>
  )
}
