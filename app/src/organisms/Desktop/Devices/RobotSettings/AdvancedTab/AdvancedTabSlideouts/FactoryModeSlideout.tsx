import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useForm, Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  InputField,
  LegacyStyledText,
  Link,
  PrimaryButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useCreateSplashMutation,
  useRobotSettingsQuery,
  useUpdateRobotSettingMutation,
} from '@opentrons/react-api-client'

import { ToggleButton } from '/app/atoms/buttons'
import { MultiSlideout } from '/app/atoms/Slideout/MultiSlideout'
import { FileUpload } from '/app/molecules/FileUpload'
import { UploadInput } from '/app/molecules/UploadInput'
import { restartRobot } from '/app/redux/robot-admin'

import type { ChangeEvent, MouseEventHandler } from 'react'
import type { FieldError, Resolver } from 'react-hook-form'
import type { RobotSettingsField } from '@opentrons/api-client'
import type { Dispatch } from '/app/redux/types'

interface FactoryModeSlideoutProps {
  isExpanded: boolean
  isRobotBusy: boolean
  onCloseClick: () => void
  robotName: string
  sn: string | null
}

interface FormValues {
  factoryModeInput: string
}

export function FactoryModeSlideout({
  isExpanded,
  isRobotBusy,
  onCloseClick,
  robotName,
  sn,
}: FactoryModeSlideoutProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared', 'branded'])

  const dispatch = useDispatch<Dispatch>()

  const { settings } = useRobotSettingsQuery().data ?? {}
  const oemModeSetting = (settings ?? []).find(
    (setting: RobotSettingsField) => setting?.id === 'enableOEMMode'
  )
  const isOEMMode = oemModeSetting?.value ?? null

  const last = sn?.substring(sn.length - 4)

  const [currentStep, setCurrentStep] = useState<number>(1)
  const [toggleValue, setToggleValue] = useState<boolean>(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

  const onFinishCompleteClick = (): void => {
    dispatch(restartRobot(robotName))
    onCloseClick()
    setIsUploading(false)
  }

  const { createSplash } = useCreateSplashMutation({
    onSuccess: () => {
      onFinishCompleteClick()
    },
  })

  const { updateRobotSetting } = useUpdateRobotSettingMutation({
    onSuccess: () => {
      if (toggleValue && file != null) {
        createSplash({ file })
      } else {
        onFinishCompleteClick()
      }
    },
  })

  const validate = (
    data: FormValues,
    errors: Record<string, FieldError>
  ): Record<string, FieldError> => {
    const factoryModeInput = data.factoryModeInput
    let errorMessage: string | undefined
    if (factoryModeInput !== last) {
      errorMessage = t('invalid_password')
    }

    const updatedErrors =
      errorMessage != null
        ? {
            ...errors,
            factoryModeInput: {
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
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
  } = useForm({
    defaultValues: {
      factoryModeInput: '',
    },
    mode: 'onSubmit',
    resolver,
    reValidateMode: 'onSubmit',
  })

  const onSubmit = (): void => {
    setCurrentStep(2)
  }

  const handleSubmitFactoryPassword = (): void => {
    void handleSubmit(onSubmit)()
  }

  const handleToggleClick: MouseEventHandler<Element> = () => {
    setToggleValue(toggleValue => !toggleValue)
  }

  const handleCompleteClick: MouseEventHandler<Element> = () => {
    setIsUploading(true)
    updateRobotSetting({ id: 'enableOEMMode', value: toggleValue })
  }

  const handleChooseFile = (file: File): void => {
    // validation for file type
    if (file.type !== 'image/png') {
      setFileError('Incorrect file type')
      setFile(file)
    } else {
      const imgUrl = URL.createObjectURL(file)
      const logoImage = new Image()
      logoImage.src = imgUrl
      logoImage.onload = () => {
        // validation for ODD screen size
        if (
          logoImage.naturalWidth !== 1024 ||
          logoImage.naturalHeight !== 600
        ) {
          setFileError('Incorrect image dimensions')
        }
        setFile(file)
      }
    }
  }

  useEffect(() => {
    // initialize local state to OEM mode value
    if (isOEMMode != null) {
      setToggleValue(isOEMMode)
    }
  }, [isOEMMode])

  return (
    <MultiSlideout
      title={currentStep === 1 ? t('enter_password') : t('manage_oem_settings')}
      maxSteps={2}
      currentStep={currentStep}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <>
          {currentStep === 1 ? (
            <PrimaryButton
              disabled={errors.factoryModeInput != null}
              onClick={handleSubmitFactoryPassword}
              width="100%"
            >
              {t('shared:next')}
            </PrimaryButton>
          ) : null}
          {currentStep === 2 ? (
            <PrimaryButton
              disabled={
                (toggleValue && file == null) ||
                isUploading ||
                fileError != null ||
                isRobotBusy
              }
              onClick={handleCompleteClick}
              width="100%"
            >
              {isUploading ? (
                <Icon name="ot-spinner" spin size="1rem" />
              ) : (
                t('complete_and_restart_robot')
              )}
            </PrimaryButton>
          ) : null}
        </>
      }
    >
      {currentStep === 1 ? (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Controller
            control={control}
            name="factoryModeInput"
            render={({ field }) => (
              <InputField
                id="factoryModeInput"
                name="factoryModeInput"
                type="text"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  field.onChange(e)
                  clearErrors()
                }}
                value={field.value}
                error={
                  errors.factoryModeInput != null
                    ? errors.factoryModeInput.message
                    : null
                }
                onBlur={field.onBlur}
                title={t('enter_factory_password')}
              />
            )}
          />
        </Flex>
      ) : null}
      {currentStep === 2 ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
          <Flex flexDirection={DIRECTION_COLUMN}>
            <LegacyStyledText
              css={TYPOGRAPHY.pSemiBold}
              paddingBottom={SPACING.spacing4}
            >
              {t('oem_mode')}
            </LegacyStyledText>
            <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing6}>
              <ToggleButton
                label="oem_mode_toggle"
                toggledOn={toggleValue}
                onClick={handleToggleClick}
              />
              <LegacyStyledText as="p" marginBottom={SPACING.spacing4}>
                {toggleValue ? t('on') : t('off')}
              </LegacyStyledText>
            </Flex>
            <LegacyStyledText as="p">
              {t('branded:oem_mode_description')}
            </LegacyStyledText>
          </Flex>
          {toggleValue ? (
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing6}>
                <LegacyStyledText css={TYPOGRAPHY.pSemiBold}>
                  {t('upload_custom_logo')}
                </LegacyStyledText>
                <LegacyStyledText as="p">
                  {t('upload_custom_logo_description')}
                </LegacyStyledText>
                <LegacyStyledText as="p">
                  {t('upload_custom_logo_dimensions')}
                </LegacyStyledText>
              </Flex>
              {file == null ? (
                <UploadInput
                  uploadButtonText={t('choose_file')}
                  onUpload={(file: File) => {
                    handleChooseFile(file)
                  }}
                  dragAndDropText={
                    <LegacyStyledText as="p">
                      <Trans
                        t={t}
                        i18nKey="shared:drag_and_drop"
                        components={{
                          a: <Link color={COLORS.blue55} role="button" />,
                        }}
                      />
                    </LegacyStyledText>
                  }
                />
              ) : (
                <FileUpload
                  file={file}
                  fileError={fileError}
                  handleClick={() => {
                    setFile(null)
                    setFileError(null)
                  }}
                />
              )}
            </Flex>
          ) : null}
        </Flex>
      ) : null}
    </MultiSlideout>
  )
}
