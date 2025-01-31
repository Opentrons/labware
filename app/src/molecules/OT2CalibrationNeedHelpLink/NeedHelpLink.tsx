import { useTranslation } from 'react-i18next'
import {
  Flex,
  Link,
  Icon,
  COLORS,
  TYPOGRAPHY,
  SIZE_1,
  ALIGN_CENTER,
  SPACING,
} from '@opentrons/components'

import type { ComponentProps } from 'react'

const SUPPORT_PAGE_URL = 'https://support.opentrons.com/s/ot2-calibration'

interface NeedHelpLinkProps extends ComponentProps<typeof Flex> {
  href?: string
}

export function NeedHelpLink(props: NeedHelpLinkProps): JSX.Element {
  const { href = SUPPORT_PAGE_URL, flexProps } = props
  const { t } = useTranslation('robot_calibration')
  return (
    <Flex alignItems={ALIGN_CENTER} {...flexProps}>
      <Icon
        color={COLORS.grey50}
        size={SIZE_1}
        marginRight={SPACING.spacing4}
        name="question-mark-circle"
      />
      <Link
        external
        fontSize={TYPOGRAPHY.fontSizeP}
        css={TYPOGRAPHY.darkLinkLabelSemiBold}
        href={href}
      >
        {t('need_help')}
      </Link>
    </Flex>
  )
}
