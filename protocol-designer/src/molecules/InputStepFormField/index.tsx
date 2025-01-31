import { useTranslation } from 'react-i18next'
import { Flex, InputField, SPACING } from '@opentrons/components'
import type { Dispatch, SetStateAction } from 'react'
import type { FieldProps } from '../../pages/Designer/ProtocolSteps/types'

interface InputStepFormFieldProps extends FieldProps {
  title: string
  type?: 'number' | 'text' | 'password'
  setIsPristine?: Dispatch<SetStateAction<boolean>>
  units?: string
  padding?: string
  showTooltip?: boolean
  caption?: string
  formLevelError?: string | null
  placeholder?: string
}

export function InputStepFormField(
  props: InputStepFormFieldProps
): JSX.Element {
  const {
    errorToShow,
    onFieldBlur,
    onFieldFocus,
    updateValue,
    value,
    name,
    title,
    units,
    showTooltip = true,
    padding = `0 ${SPACING.spacing16}`,
    tooltipContent,
    caption,
    formLevelError,
    setIsPristine,
    type,
    placeholder,
    ...otherProps
  } = props
  const { t } = useTranslation('tooltip')

  return (
    <Flex padding={padding} width="100%">
      <InputField
        {...otherProps}
        tooltipText={
          showTooltip ? t(`${tooltipContent}`) ?? undefined : undefined
        }
        type={type}
        title={title}
        caption={caption}
        name={name}
        error={formLevelError ?? errorToShow}
        onBlur={onFieldBlur}
        onFocus={onFieldFocus}
        onChange={e => {
          updateValue(e.currentTarget.value)
          if (setIsPristine != null) {
            setIsPristine(false)
          }
        }}
        value={value ? String(value) : null}
        units={units}
        placeholder={placeholder}
      />
    </Flex>
  )
}
