import { COLORS } from '../../helix-design-system'
import { TYPOGRAPHY } from '../../ui-style-constants'
import { LegacyTooltip } from '../../tooltips'
import { FLEX_MAX_CONTENT } from '../../styles'

import type { ReactNode } from 'react'
import type { UseTooltipResultTooltipProps } from '../../tooltips'
import type { StyleProps } from '../../primitives'

export interface TooltipProps extends StyleProps {
  children: ReactNode
  tooltipProps: UseTooltipResultTooltipProps & { visible: boolean }
  key?: string
}

export function Tooltip(props: TooltipProps): JSX.Element {
  const {
    children,
    tooltipProps,
    width = FLEX_MAX_CONTENT,
    maxWidth = '8.75rem',
    ...styleProps
  } = props

  return (
    <LegacyTooltip
      {...tooltipProps}
      backgroundColor={COLORS.black90}
      fontSize={TYPOGRAPHY.fontSizeCaption}
      width={width}
      maxWidth={maxWidth}
      {...styleProps}
    >
      {children}
    </LegacyTooltip>
  )
}
