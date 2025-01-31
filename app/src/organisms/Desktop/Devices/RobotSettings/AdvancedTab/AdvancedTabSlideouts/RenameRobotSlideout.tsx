import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import {
  COLORS,
  Banner,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  LegacyStyledText,
  PrimaryButton,
  SPACING,
} from '@opentrons/components'
import { useUpdateRobotNameMutation } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  removeRobot,
  getConnectableRobots,
  getReachableRobots,
  getUnreachableRobots,
} from '/app/redux/discovery'
import { useTrackEvent, ANALYTICS_RENAME_ROBOT } from '/app/redux/analytics'
import { Slideout } from '/app/atoms/Slideout'
import { useIsFlex } from '/app/redux-resources/robots'

import type { ChangeEvent } from 'react'
import type { Resolver, FieldError } from 'react-hook-form'
import type { UpdatedRobotName } from '@opentrons/api-client'
import type { State, Dispatch } from '/app/redux/types'

interface RenameRobotSlideoutProps {
  isExpanded: boolean
  onCloseClick: () => void
  robotName: string
}
interface FormValues {
  newRobotName: string
}

/* max length is 17 and min length is 1
   allow users to use alphabets(a-z & A-Z) and numbers
   https://github.com/Opentrons/opentrons/issues/10214
*/
const REGEX_RENAME_ROBOT_PATTERN = /^([a-zA-Z0-9]{0,17})$/
const regexPattern = new RegExp(REGEX_RENAME_ROBOT_PATTERN)

export function RenameRobotSlideout({
  isExpanded,
  onCloseClick,
  robotName,
}: RenameRobotSlideoutProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const [previousRobotName, setPreviousRobotName] = useState<string>(robotName)
  const isFlex = useIsFlex(robotName)
  const trackEvent = useTrackEvent()
  const navigate = useNavigate()
  const dispatch = useDispatch<Dispatch>()
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
    let message: string | undefined
    if (!regexPattern.test(newName)) {
      message = t('name_rule_error_name_length')
    }
    if (
      [...connectableRobots, ...reachableRobots].some(
        robot => newName === robot.name
      )
    ) {
      message = t('name_rule_error_exist')
    }

    const updatedErrors =
      message != null
        ? {
            ...errors,
            newRobotName: {
              type: 'error',
              message: message,
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
    formState: { isDirty, isValid, errors },
    reset,
    watch,
    trigger,
  } = useForm({
    defaultValues: {
      newRobotName: '',
    },
    resolver: resolver,
  })
  const newRobotName = watch('newRobotName')

  const onSubmit = (data: FormValues): void => {
    const newName = data.newRobotName
    setPreviousRobotName(robotName)
    const sameNameRobotInUnavailable = unreachableRobots.find(
      robot => robot.name === newName
    )
    if (sameNameRobotInUnavailable != null) {
      dispatch(removeRobot(sameNameRobotInUnavailable.name))
    }
    updateRobotName(newName)
    reset({ newRobotName: '' })
  }

  const { updateRobotName } = useUpdateRobotNameMutation({
    onSuccess: (data: UpdatedRobotName) => {
      // TODO: 6/10/2022 kj for the robot name, we need to use GET: /server/name
      // data.name != null && navigate(`/devices/${data.name}/robot-settings`)
      // TODO 6/9/2022 kj this is a temporary fix to avoid the issue
      // https://github.com/Opentrons/opentrons/issues/10709
      data.name != null && navigate('/devices')
      dispatch(removeRobot(previousRobotName))
    },
    onError: (error: Error) => {
      // TODO kj 5/25/2022: when a user lost connection while the user is renaming a robot,
      // the app needs to show a message to inform that.
      console.error('error', error.message)
    },
  })

  const handleSubmitRobotRename = (): void => {
    trackEvent({
      name: ANALYTICS_RENAME_ROBOT,
      properties: {
        previousRobotName,
        newRobotName: newRobotName,
        robotType: isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE,
      },
    })
    handleSubmit(onSubmit)()
  }

  return (
    <Slideout
      title={t('rename_robot_title')}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          onClick={handleSubmitRobotRename}
          disabled={!(isDirty && isValid)}
          width="100%"
        >
          {t('rename_robot')}
        </PrimaryButton>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        {isFlex ? null : (
          <Banner type="informing" marginBottom={SPACING.spacing16}>
            {t('rename_robot_prefer_usb_connection')}
          </Banner>
        )}
        <LegacyStyledText as="p" marginBottom={SPACING.spacing16}>
          {t('rename_robot_input_limitation_detail')}
        </LegacyStyledText>
        <Controller
          control={control}
          name="newRobotName"
          render={({ field, fieldState }) => (
            <InputField
              data-testid="rename-robot_input"
              id="newRobotName"
              name="newRobotName"
              type="text"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                field.onChange(e)
                trigger('newRobotName')
              }}
              value={field.value}
              error={fieldState.error?.message && ' '}
              onBlur={field.onBlur}
              title={t('robot_name')}
            />
          )}
        />
        <LegacyStyledText as="label" color={COLORS.grey50}>
          {t('characters_max')}
        </LegacyStyledText>
        {errors.newRobotName != null ? (
          <LegacyStyledText
            as="label"
            color={COLORS.red50}
            marginTop={SPACING.spacing4}
          >
            {errors.newRobotName.message}
          </LegacyStyledText>
        ) : null}
      </Flex>
    </Slideout>
  )
}
