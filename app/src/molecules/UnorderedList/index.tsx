import { css } from 'styled-components'
import { SPACING, LegacyStyledText } from '@opentrons/components'

import type { ReactNode } from 'react'

interface UnorderedListProps {
  items: ReactNode[]
}
export function UnorderedList(props: UnorderedListProps): JSX.Element {
  const { items } = props
  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index}
          css={css`
            margin-left: ${SPACING.spacing24};
          `}
        >
          <LegacyStyledText as="p">{item}</LegacyStyledText>
        </li>
      ))}
    </ul>
  )
}
