import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trans, useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Banner,
  Btn,
  Flex,
  JUSTIFY_FLEX_END,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  Modal,
} from '@opentrons/components'

import { getTopPortalEl } from '/app/App/portal'

import type { MouseEventHandler } from 'react'
import type { AnalysisError } from '@opentrons/shared-data'

interface ProtocolAnalysisErrorBannerProps {
  errors: AnalysisError[]
}

export function ProtocolAnalysisErrorBanner(
  props: ProtocolAnalysisErrorBannerProps
): JSX.Element {
  const { errors } = props
  const { t } = useTranslation(['run_details'])
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  const handleToggleDetails: MouseEventHandler = e => {
    e.preventDefault()
    e.stopPropagation()
    setShowErrorDetails(!showErrorDetails)
  }

  return (
    <Banner type="error" marginBottom={SPACING.spacing16}>
      <Flex
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        width="100%"
      >
        <LegacyStyledText as="p">
          {t('protocol_analysis_failed')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          <Trans
            t={t}
            i18nKey="view_analysis_error_details"
            components={{
              errorLink: (
                <Btn
                  as="a"
                  role="button"
                  aria-label="error_link"
                  textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  onClick={handleToggleDetails}
                />
              ),
            }}
          />
        </LegacyStyledText>
      </Flex>
      {showErrorDetails
        ? createPortal(
            <Modal
              type="error"
              title={t('protocol_analysis_failure')}
              onClose={handleToggleDetails}
            >
              {errors.map((error, index) => (
                <LegacyStyledText as="p" key={index}>
                  {error?.detail}
                </LegacyStyledText>
              ))}
              <Flex justifyContent={JUSTIFY_FLEX_END}>
                <PrimaryButton
                  role="button"
                  aria-label="close_modal_button"
                  onClick={handleToggleDetails}
                  textTransform={TYPOGRAPHY.textTransformCapitalize}
                  marginTop={SPACING.spacing16}
                >
                  {t('shared:close')}
                </PrimaryButton>
              </Flex>
            </Modal>,
            getTopPortalEl()
          )
        : null}
    </Banner>
  )
}
