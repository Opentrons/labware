import * as React from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  Icon,
  Link,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
  ALIGN_FLEX_END,
  PrimaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getTopPortalEl } from '../../../../App/portal'
import { LegacyModal } from '../../../../molecules/LegacyModal'

const OFFSET_DATA_HELP_ARTICLE =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'
interface HowLPCWorksModalProps {
  onCloseClick: () => unknown
}

export const HowLPCWorksModal = (props: HowLPCWorksModalProps): JSX.Element => {
  const { t } = useTranslation(['protocol_setup', 'shared'])
  return createPortal(
    <LegacyModal
      title={t('how_offset_data_works')}
      onClose={props.onCloseClick}
      width="31.25rem"
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText as="p" marginBottom={SPACING.spacing16}>
          {t('what_labware_offset_is')}
        </StyledText>
        <Link
          css={TYPOGRAPHY.linkPSemiBold}
          href={OFFSET_DATA_HELP_ARTICLE}
          id="HowLPCWorksModal_helpArticleLink2"
          external
          marginBottom={SPACING.spacing16}
        >
          {t('learn_more_about_offset_data')}
          <Icon
            name="open-in-new"
            marginLeft={SPACING.spacing4}
            size="0.5rem"
          />
        </Link>
        <StyledText as="p" marginBottom={SPACING.spacing16}>
          {t('why_use_lpc')}
        </StyledText>
        <PrimaryButton
          onClick={props.onCloseClick}
          textTransform={TYPOGRAPHY.textTransformCapitalize}
          alignSelf={ALIGN_FLEX_END}
          id="LabwareSetupModal_closeButton"
        >
          {t('shared:close')}
        </PrimaryButton>
      </Flex>
    </LegacyModal>,
    getTopPortalEl()
  )
}
