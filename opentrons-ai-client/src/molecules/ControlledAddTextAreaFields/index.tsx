import {
  Flex,
  ALIGN_CENTER,
  SPACING,
  Link,
  TYPOGRAPHY,
  COLORS,
  StyledText,
} from '@opentrons/components'
import { Controller, useFormContext } from 'react-hook-form'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { TextAreaField } from '../../atoms/TextAreaField'

export interface ControlledAddTextAreaFieldsProps {
  fieldName: string
  name: string
  textAreaHeight?: string
}

export function ControlledAddTextAreaFields({
  fieldName,
  name,
  textAreaHeight,
}: ControlledAddTextAreaFieldsProps): JSX.Element {
  const { t } = useTranslation('create_protocol')
  const { watch } = useFormContext()

  const values: string[] = watch(fieldName) ?? ['']

  return (
    <Controller
      name={fieldName}
      rules={{
        required: true,
        validate: value => value.length > 0 && value[0] !== '',
      }}
      render={({ field }) => {
        return (
          <>
            {values.map((value, index) => (
              <Flex
                key={index}
                alignItems={ALIGN_CENTER}
                gap={SPACING.spacing8}
              >
                <TextAreaField
                  name={`${name}-${index + 1}`}
                  title={`${t(name)} ${index + 1}`}
                  caption={index === 0 && t(`add_${name}_caption`)}
                  value={value.replace(`${t(name)} ${index + 1}: `, '')}
                  onChange={e => {
                    const newValues = [...values]
                    newValues[index] = `${t(name)} ${index + 1}: ${
                      e.target.value
                    }`
                    field.onChange(newValues)
                  }}
                  onBlur={field.onBlur}
                  height={textAreaHeight}
                />
                {index >= 1 && (
                  <Link
                    role="button"
                    onClick={() => {
                      const newValues = values
                        .filter((_, i) => i !== index)
                        .map(
                          (value, i) =>
                            `${t(name)} ${i + 1}: ${value.split(': ')[1]}`
                        )
                      field.onChange(newValues)
                    }}
                    css={css`
                      justify-content: flex-end;
                      text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
                      color: ${COLORS.grey60};
                      &:hover {
                        color: ${COLORS.grey40};
                      }
                    `}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t(`remove_${name}`)}
                    </StyledText>
                  </Link>
                )}
              </Flex>
            ))}
          </>
        )
      }}
    />
  )
}
