import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { SelectField } from '/app/atoms/SelectField'
import {
  getUpdateChannel,
  getUpdateChannelOptions,
  updateConfigValue,
} from '/app/redux/config'

import type { ComponentProps } from 'react'
import type { SelectOption } from '/app/atoms/SelectField/Select'
import type { Dispatch } from '/app/redux/types'

export function UpdatedChannel(): JSX.Element {
  const { t } = useTranslation('app_settings')
  const dispatch = useDispatch<Dispatch>()
  const channel = useSelector(getUpdateChannel)
  const channelOptions: SelectOption[] = useSelector(getUpdateChannelOptions)
  const handleChannel = (_: string, value: string): void => {
    dispatch(updateConfigValue('update.channel', value))
  }

  const formatOptionLabel: ComponentProps<
    typeof SelectField
  >['formatOptionLabel'] = (option, index): JSX.Element => {
    const { label, value } = option
    return (
      <LegacyStyledText
        as="p"
        textTransform={TYPOGRAPHY.textTransformCapitalize}
        id={index}
      >
        {value === 'latest' ? label : value}
      </LegacyStyledText>
    )
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      gridGap={SPACING.spacing40}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <LegacyStyledText
          css={TYPOGRAPHY.h3SemiBold}
          paddingBottom={SPACING.spacing8}
          id="AdvancedSettings_updatedChannel"
        >
          {t('update_channel')}
        </LegacyStyledText>
        <LegacyStyledText as="p" paddingBottom={SPACING.spacing8}>
          {t('update_description')}
        </LegacyStyledText>
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        <LegacyStyledText css={TYPOGRAPHY.labelSemiBold}>
          {t('channel')}
        </LegacyStyledText>
        <SelectField
          name={'__UpdateChannel__'}
          options={channelOptions}
          onValueChange={handleChannel}
          value={channel}
          placeholder={channel}
          formatOptionLabel={formatOptionLabel}
          isSearchable={false}
          width="10rem"
        />
      </Flex>
    </Flex>
  )
}
