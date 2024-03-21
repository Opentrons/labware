import * as React from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  Icon,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  PrimaryButton,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  BORDERS,
  TYPOGRAPHY,
  RESPONSIVENESS,
  TEXT_ALIGN_CENTER,
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  TEXT_TRANSFORM_CAPITALIZE,
  StyledText,
} from '@opentrons/components'
import { getTopPortalEl } from '../../App/portal'
import { LegacyModalShell } from '../../molecules/LegacyModal'
import { WizardHeader } from '../../molecules/WizardHeader'
import { i18n } from '../../i18n'

const SUPPORT_EMAIL = 'support@opentrons.com'

interface FatalErrorModalProps {
  errorMessage: string
  shouldUseMetalProbe: boolean
  onClose: () => void
}
export function FatalErrorModal(props: FatalErrorModalProps): JSX.Element {
  const { errorMessage, shouldUseMetalProbe, onClose } = props
  const { t } = useTranslation(['labware_position_check', 'shared'])
  return createPortal(
    <LegacyModalShell
      width="47rem"
      header={
        <WizardHeader
          title={t('labware_position_check_title')}
          onExit={onClose}
        />
      }
    >
      <Flex
        padding={SPACING.spacing32}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        gridGap={SPACING.spacing16}
      >
        <Icon
          name="ot-alert"
          size="2.5rem"
          color={COLORS.red50}
          aria-label="alert"
        />
        <ErrorHeader>
          {i18n.format(t('shared:something_went_wrong'), 'sentenceCase')}
        </ErrorHeader>
        {shouldUseMetalProbe ? (
          <StyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textAlign={TEXT_ALIGN_CENTER}
          >
            {t('remove_probe_before_exit')}
          </StyledText>
        ) : null}
        <StyledText as="p" textAlign={TEXT_ALIGN_CENTER}>
          {t('shared:help_us_improve_send_error_report', {
            support_email: SUPPORT_EMAIL,
          })}
        </StyledText>
        <ErrorTextArea readOnly value={errorMessage ?? ''} spellCheck={false} />
        <PrimaryButton
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
          alignSelf={ALIGN_FLEX_END}
          onClick={onClose}
        >
          {t('shared:exit')}
        </PrimaryButton>
      </Flex>
    </LegacyModalShell>,
    getTopPortalEl()
  )
}

const ErrorHeader = styled.h1`
  text-align: ${TEXT_ALIGN_CENTER};
  ${TYPOGRAPHY.h1Default}

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

const ErrorTextArea = styled.textarea`
  min-height: 6rem;
  width: 30rem;
  background-color: #f8f8f8;
  border: ${BORDERS.lineBorder};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  margin: ${SPACING.spacing16} 0;
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  font-family: monospace;
  resize: none;
`
