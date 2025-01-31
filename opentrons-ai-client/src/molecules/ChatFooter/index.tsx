import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { InputPrompt } from '../InputPrompt'

export function ChatFooter(): JSX.Element {
  const { t } = useTranslation('protocol_generator')

  return (
    <Flex
      paddingTop={SPACING.spacing24}
      gridGap={SPACING.spacing24}
      flexDirection={DIRECTION_COLUMN}
    >
      <InputPrompt />
      <LegacyStyledText css={DISCLAIMER_TEXT_STYLE}>
        {t('disclaimer')}
      </LegacyStyledText>
    </Flex>
  )
}

const DISCLAIMER_TEXT_STYLE = css`
  color: ${COLORS.grey55};
  font-size: ${TYPOGRAPHY.fontSizeH3};
  line-height: ${TYPOGRAPHY.lineHeight24};
  text-align: ${TYPOGRAPHY.textAlignCenter};
`
