import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  RadioButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ANALYTICS_LANGUAGE_UPDATED_ODD_UNBOXING_FLOW } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { MediumButton } from '/app/atoms/buttons'
import { LANGUAGES, US_ENGLISH } from '/app/i18n'
import { RobotSetupHeader } from '/app/organisms/ODD/RobotSetupHeader'
import { getAppLanguage, updateConfigValue } from '/app/redux/config'

import type { Dispatch } from '/app/redux/types'

export function ChooseLanguage(): JSX.Element {
  const { i18n, t } = useTranslation(['app_settings', 'shared'])
  const navigate = useNavigate()
  const dispatch = useDispatch<Dispatch>()
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()

  const appLanguage = useSelector(getAppLanguage)

  useEffect(() => {
    // initialize en-US language on mount
    dispatch(updateConfigValue('language.appLanguage', US_ENGLISH))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      height="100%"
      padding={`0 ${SPACING.spacing40} ${SPACING.spacing40} ${SPACING.spacing40}`}
    >
      <RobotSetupHeader header={t('choose_your_language')} />
      <Flex
        flex="1"
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
          <StyledText
            oddStyle="level4HeaderRegular"
            textAlign={TYPOGRAPHY.textAlignCenter}
          >
            {t('select_a_language')}
          </StyledText>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            {LANGUAGES.map(lng => (
              <RadioButton
                key={lng.value}
                buttonLabel={lng.name}
                buttonValue={lng.value}
                isSelected={lng.value === appLanguage}
                onChange={() => {
                  dispatch(updateConfigValue('language.appLanguage', lng.value))
                }}
              ></RadioButton>
            ))}
          </Flex>
        </Flex>
        <MediumButton
          buttonText={i18n.format(t('shared:continue'), 'capitalize')}
          onClick={() => {
            trackEventWithRobotSerial({
              name: ANALYTICS_LANGUAGE_UPDATED_ODD_UNBOXING_FLOW,
              properties: {
                language: appLanguage,
              },
            })
            navigate('/welcome')
          }}
          width="100%"
        />
      </Flex>
    </Flex>
  )
}
