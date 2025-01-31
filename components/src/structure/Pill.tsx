import cx from 'classnames'

import styles from './Pill.module.css'

import type { ReactNode } from 'react'
import type { UseHoverTooltipTargetProps } from '../tooltips'

// TODO(bc, 2021-03-29): this component is only used in PD
// reconsider whether it belongs in components library
// TODO(bc, 2021-03-05): can this color prop actually be null or undefined if not present?
// if no, then remove the cast to string
export interface PillProps {
  /** background color of pill (any CSS color string) */
  color?: string | null | undefined
  /** text black, instead of default white */
  invertTextColor?: boolean | null | undefined
  /** additional class name */
  className?: string
  /** contents of the pill */
  children?: ReactNode
  /** handlers for HoverTooltipComponent */
  hoverTooltipHandlers?: UseHoverTooltipTargetProps | null | undefined
}

/**
 * Colored Pill containing text or other contents
 */
export function Pill(props: PillProps): JSX.Element {
  const className = cx(styles.pill, props.className, {
    [styles.invert_text]: props.invertTextColor,
  })
  const { color, children, hoverTooltipHandlers } = props

  return (
    <span
      style={{ backgroundColor: color as string }}
      className={className}
      {...hoverTooltipHandlers}
    >
      {children}
    </span>
  )
}
