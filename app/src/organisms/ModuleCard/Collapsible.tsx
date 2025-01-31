import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  Box,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  SIZE_1,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import type { IconName } from '@opentrons/components'

import type { ReactNode } from 'react'

interface CollapsibleProps {
  expanded: boolean
  title: ReactNode
  expandedIcon?: IconName
  collapsedIcon?: IconName
  toggleExpanded: () => void
  children: ReactNode
}

const EXPANDED_STYLE = css`
  transition: max-height 300ms ease-in, visibility 400ms ease;
  visibility: visible;
  max-height: 100vh;
  overflow: hidden;
`
const COLLAPSED_STYLE = css`
  transition: max-height 500ms ease-out, visibility 600ms ease;
  visibility: hidden;
  max-height: 0vh;
  overflow: hidden;
`
export function Collapsible({
  expanded,
  title,
  expandedIcon,
  collapsedIcon,
  toggleExpanded,
  children,
}: CollapsibleProps): JSX.Element {
  const expand = collapsedIcon ?? 'plus'
  const collapse = expandedIcon ?? 'minus'

  return (
    <Flex flexDirection={DIRECTION_COLUMN} paddingX={SPACING.spacing16}>
      <Flex
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        onClick={toggleExpanded}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <LegacyStyledText as="h5">{title}</LegacyStyledText>
        </Flex>
        <Icon
          size={SIZE_1}
          name={expanded ? collapse : expand}
          aria-label={`expandedIcon` ?? 'plus'}
        />
      </Flex>
      <Box css={expanded ? EXPANDED_STYLE : COLLAPSED_STYLE}>{children}</Box>
    </Flex>
  )
}
