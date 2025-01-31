import { DIRECTION_COLUMN, Flex, SPACING } from '@opentrons/components'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ControlledDropdownMenu } from '../../atoms/ControlledDropdownMenu'
import { ControlledInputField } from '../../atoms/ControlledInputField'

export const BASIC_ALIQUOTING = 'basic_aliquoting'
export const PCR = 'pcr'
export const SERIAL_DILUTION = 'serial_dilution'
export const OTHER = 'other'
export const APPLICATION_SCIENTIFIC_APPLICATION =
  'application.scientificApplication'
export const APPLICATION_OTHER_APPLICATION = 'application.otherApplication'
export const APPLICATION_DESCRIBE = 'application.description'

export function ApplicationSection(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const { watch } = useFormContext()

  const options = [
    { name: t(BASIC_ALIQUOTING), value: BASIC_ALIQUOTING },
    { name: t(PCR), value: PCR },
    { name: t(SERIAL_DILUTION), value: SERIAL_DILUTION },
    { name: t(OTHER), value: OTHER },
  ]

  const isOtherSelected = watch(APPLICATION_SCIENTIFIC_APPLICATION) === OTHER

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      height="100%"
      gap={SPACING.spacing16}
    >
      <ControlledDropdownMenu
        width="100%"
        dropdownType="neutral"
        name={APPLICATION_SCIENTIFIC_APPLICATION}
        title={t('application_scientific_dropdown_title')}
        options={options}
        placeholder={t('application_scientific_dropdown_placeholder')}
        rules={{ required: true }}
      />

      {isOtherSelected && (
        <ControlledInputField
          name={APPLICATION_OTHER_APPLICATION}
          title={t('application_other_title')}
          caption={t('application_other_caption')}
          rules={{ required: isOtherSelected, minLength: 3 }}
        />
      )}

      <ControlledInputField
        name={APPLICATION_DESCRIBE}
        title={t('application_describe_title')}
        caption={t('application_describe_caption')}
        rules={{ required: true, minLength: 3 }}
      />
    </Flex>
  )
}
