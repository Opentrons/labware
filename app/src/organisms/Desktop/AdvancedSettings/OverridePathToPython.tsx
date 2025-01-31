import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  Box,
  COLORS,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING_AUTO,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { TertiaryButton } from '/app/atoms/buttons'
import { getPathToPythonOverride, resetConfigValue } from '/app/redux/config'
import {
  openPythonInterpreterDirectory,
  changePythonPathOverrideConfig,
} from '/app/redux/protocol-analysis'
import {
  useTrackEvent,
  ANALYTICS_CHANGE_PATH_TO_PYTHON_DIRECTORY,
} from '/app/redux/analytics'

import type { MouseEventHandler } from 'react'
import type { Dispatch } from '/app/redux/types'

export function OverridePathToPython(): JSX.Element {
  const { t } = useTranslation(['app_settings', 'branded'])
  const pathToPythonInterpreter = useSelector(getPathToPythonOverride)
  const dispatch = useDispatch<Dispatch>()
  const trackEvent = useTrackEvent()

  const handleClickPythonDirectoryChange: MouseEventHandler<HTMLButtonElement> = _event => {
    dispatch(changePythonPathOverrideConfig())
    trackEvent({
      name: ANALYTICS_CHANGE_PATH_TO_PYTHON_DIRECTORY,
      properties: {},
    })
  }

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <Box width="70%">
        <LegacyStyledText
          css={TYPOGRAPHY.h3SemiBold}
          paddingBottom={SPACING.spacing8}
          id="AdvancedSettings_overridePathToPython"
        >
          {t('override_path_to_python')}
        </LegacyStyledText>
        <LegacyStyledText as="p" paddingBottom={SPACING.spacing8}>
          {t('branded:opentrons_app_will_use_interpreter')}
        </LegacyStyledText>
        <LegacyStyledText
          as="h6"
          textTransform={TYPOGRAPHY.textTransformUppercase}
          color={COLORS.grey50}
          paddingBottom={SPACING.spacing4}
        >
          {t('override_path')}
        </LegacyStyledText>
        {pathToPythonInterpreter !== null ? (
          <Link
            role="button"
            css={TYPOGRAPHY.pRegular}
            color={COLORS.black90}
            onClick={() => dispatch(openPythonInterpreterDirectory())}
            id="AdvancedSettings_sourceFolderLinkPython"
          >
            {pathToPythonInterpreter}
            <Icon
              height="0.75rem"
              marginLeft={SPACING.spacing8}
              name="open-in-new"
            />
          </Link>
        ) : (
          <LegacyStyledText as="p">{t('no_specified_folder')}</LegacyStyledText>
        )}
      </Box>
      {pathToPythonInterpreter !== null ? (
        <TertiaryButton
          marginLeft={SPACING_AUTO}
          onClick={() =>
            dispatch(resetConfigValue('python.pathToPythonOverride'))
          }
          id="AdvancedSettings_changePythonInterpreterSource"
        >
          {t('reset_to_default')}
        </TertiaryButton>
      ) : (
        <TertiaryButton
          marginLeft={SPACING_AUTO}
          onClick={handleClickPythonDirectoryChange}
          id="AdvancedSettings_changePythonInterpreterSource"
        >
          {t('add_override_path')}
        </TertiaryButton>
      )}
    </Flex>
  )
}
