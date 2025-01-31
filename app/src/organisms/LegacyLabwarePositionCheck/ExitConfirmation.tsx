import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  AlertPrimaryButton,
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  RESPONSIVENESS,
  SecondaryButton,
  SIZE_3,
  SPACING,
  LegacyStyledText,
  TEXT_ALIGN_CENTER,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useSelector } from 'react-redux'
import { getIsOnDevice } from '/app/redux/config'
import { SmallButton } from '/app/atoms/buttons'

interface ExitConfirmationProps {
  onGoBack: () => void
  onConfirmExit: () => void
  shouldUseMetalProbe: boolean
}

export const ExitConfirmation = (props: ExitConfirmationProps): JSX.Element => {
  const { i18n, t } = useTranslation(['labware_position_check', 'shared'])
  const { onGoBack, onConfirmExit, shouldUseMetalProbe } = props
  const isOnDevice = useSelector(getIsOnDevice)
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={SPACING.spacing32}
      minHeight="29.5rem"
    >
      <Flex
        flex="1"
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
        paddingX={SPACING.spacing32}
      >
        <Icon name="ot-alert" size={SIZE_3} color={COLORS.yellow50} />
        {isOnDevice ? (
          <>
            <ConfirmationHeaderODD>
              {shouldUseMetalProbe
                ? t('remove_probe_before_exit')
                : t('exit_screen_title')}
            </ConfirmationHeaderODD>
            <Flex textAlign={TEXT_ALIGN_CENTER}>
              <ConfirmationBodyODD>
                {t('exit_screen_subtitle')}
              </ConfirmationBodyODD>
            </Flex>
          </>
        ) : (
          <>
            <ConfirmationHeader>
              {shouldUseMetalProbe
                ? t('remove_probe_before_exit')
                : t('exit_screen_title')}
            </ConfirmationHeader>
            <LegacyStyledText as="p" marginTop={SPACING.spacing8}>
              {t('exit_screen_subtitle')}
            </LegacyStyledText>
          </>
        )}
      </Flex>
      {isOnDevice ? (
        <Flex
          width="100%"
          justifyContent={JUSTIFY_FLEX_END}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing8}
        >
          <SmallButton
            onClick={onGoBack}
            buttonText={i18n.format(t('shared:go_back'), 'capitalize')}
            buttonType="secondary"
          />
          <SmallButton
            onClick={onConfirmExit}
            buttonText={
              shouldUseMetalProbe
                ? t('remove_calibration_probe')
                : i18n.format(t('shared:exit'), 'capitalize')
            }
            buttonType="alert"
          />
        </Flex>
      ) : (
        <Flex
          width="100%"
          marginTop={SPACING.spacing32}
          justifyContent={JUSTIFY_FLEX_END}
          alignItems={ALIGN_CENTER}
        >
          <Flex gridGap={SPACING.spacing8}>
            <SecondaryButton onClick={onGoBack}>
              {t('shared:go_back')}
            </SecondaryButton>
            <AlertPrimaryButton
              onClick={onConfirmExit}
              textTransform={TYPOGRAPHY.textTransformCapitalize}
            >
              {shouldUseMetalProbe
                ? t('remove_calibration_probe')
                : i18n.format(t('shared:exit'), 'capitalize')}
            </AlertPrimaryButton>
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

const ConfirmationHeader = styled.h1`
  margin-top: ${SPACING.spacing24};
  ${TYPOGRAPHY.h1Default}
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

const ConfirmationHeaderODD = styled.h1`
  margin-top: ${SPACING.spacing24};
  ${TYPOGRAPHY.level3HeaderBold}
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`
const ConfirmationBodyODD = styled.h1`
  ${TYPOGRAPHY.level4HeaderRegular}
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderRegular}
  }
  color: ${COLORS.grey60};
`
