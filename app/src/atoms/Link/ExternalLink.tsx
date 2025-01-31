import { css } from 'styled-components'
import {
  DISPLAY_INLINE_BLOCK,
  Icon,
  Link,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { ReactNode } from 'react'
import type { LinkProps } from '@opentrons/components'
export interface ExternalLinkProps extends LinkProps {
  href: string
  id?: string
  children: ReactNode
}

export const ExternalLink = (props: ExternalLinkProps): JSX.Element => (
  <Link external {...props} css={TYPOGRAPHY.linkPSemiBold}>
    {props.children}
    <span css={SPAN_STYLE}></span>
    <Icon
      size={SPACING.spacing8}
      name="open-in-new"
      aria-label="open_in_new_icon"
    />
  </Link>
)

const SPAN_STYLE = css`
  display: ${DISPLAY_INLINE_BLOCK};
  width: 0.4375rem;
`
