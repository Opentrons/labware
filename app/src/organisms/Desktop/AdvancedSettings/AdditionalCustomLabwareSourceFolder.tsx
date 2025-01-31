import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  Link,
  SPACING_AUTO,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { TertiaryButton } from '/app/atoms/buttons'
import {
  changeCustomLabwareDirectory,
  getCustomLabwareDirectory,
  openCustomLabwareDirectory,
} from '/app/redux/custom-labware'
import {
  useTrackEvent,
  ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER,
} from '/app/redux/analytics'

import type { Dispatch } from '/app/redux/types'

export function AdditionalCustomLabwareSourceFolder(): JSX.Element {
  const { t } = useTranslation('app_settings')
  const dispatch = useDispatch<Dispatch>()
  const labwarePath = useSelector(getCustomLabwareDirectory)
  const trackEvent = useTrackEvent()

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
          id="AdvancedSettings_customLabware"
        >
          {t('additional_labware_folder_title')}
        </LegacyStyledText>
        <LegacyStyledText as="p" paddingBottom={SPACING.spacing8}>
          {t('additional_folder_description')}
        </LegacyStyledText>
        <LegacyStyledText
          as="h6"
          textTransform={TYPOGRAPHY.textTransformUppercase}
          color={COLORS.grey50}
          paddingBottom={SPACING.spacing4}
        >
          {t('additional_folder_location')}
        </LegacyStyledText>
        {labwarePath !== '' ? (
          <Link
            role="button"
            css={TYPOGRAPHY.pRegular}
            color={COLORS.black90}
            onClick={() => dispatch(openCustomLabwareDirectory())}
            id="AdvancedSettings_sourceFolderLink"
          >
            {labwarePath}
            <Icon
              height="0.75rem"
              marginLeft={SPACING.spacing8}
              name="open-in-new"
            />
          </Link>
        ) : (
          <LegacyStyledText as="p">{t('no_folder')}</LegacyStyledText>
        )}
      </Flex>
      {
        <TertiaryButton
          marginLeft={SPACING_AUTO}
          onClick={() => {
            dispatch(changeCustomLabwareDirectory())
            trackEvent({
              name: ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER,
              properties: {},
            })
          }}
          id="AdvancedSettings_changeLabwareSource"
        >
          {labwarePath !== ''
            ? t('change_folder_button')
            : t('add_folder_button')}
        </TertiaryButton>
      }
    </Flex>
  )
}
