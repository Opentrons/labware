import {
  Flex,
  ALIGN_CENTER,
  SPACING,
  InputField,
  Link,
  TYPOGRAPHY,
  COLORS,
  StyledText,
} from '@opentrons/components'
import { Controller, useFormContext } from 'react-hook-form'
import { css } from 'styled-components'
import { LIQUIDS_FIELD_NAME } from '../../organisms/LabwareLiquidsSection'
import { useTranslation } from 'react-i18next'

export function ControlledAddLiquidInputs(): JSX.Element {
  const { t } = useTranslation('create_protocol')
  const { watch } = useFormContext()

  const liquids: string[] = watch(LIQUIDS_FIELD_NAME) ?? ['']

  return (
    <Controller
      name={LIQUIDS_FIELD_NAME}
      defaultValue={['']}
      rules={{
        required: true,
        validate: value => value.length > 0 && value[0] !== '',
      }}
      render={({ field }) => {
        return (
          <>
            {liquids.map((liquid, index) => (
              <Flex
                key={index}
                alignItems={ALIGN_CENTER}
                gap={SPACING.spacing8}
              >
                <InputField
                  name={`liquid-${index + 1}`}
                  title={`${t('liquid')} ${index + 1}`}
                  caption={index === 0 && t('add_liquid_caption')}
                  value={liquids[index] === '' ? '' : liquids[index] ?? liquid}
                  onChange={e => {
                    const newLiquids = [...liquids]
                    newLiquids[index] = e.target.value
                    field.onChange(newLiquids)
                  }}
                  onBlur={field.onBlur}
                />
                {index >= 1 && (
                  <Link
                    role="button"
                    onClick={() => {
                      field.onChange(liquids.filter((_, i) => i !== index))
                    }}
                    css={css`
                      width: 10%;
                      text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
                      color: ${COLORS.grey60};
                      &:hover {
                        color: ${COLORS.grey40};
                      }
                    `}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('remove_liquid')}
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
