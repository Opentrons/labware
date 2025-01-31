import { css, keyframes } from 'styled-components'
import cx from 'classnames'

import { Svg } from '../primitives'
import { ICON_DATA_BY_NAME } from './icon-data'

import type { ReactNode } from 'react'
import type { SvgProps } from '../primitives'

export type IconName = keyof typeof ICON_DATA_BY_NAME

export interface IconProps extends SvgProps {
  /** name constant of the icon to display */
  name: IconName
  /** classes to apply */
  className?: string
  /** spin the icon with a CSS animation */
  spin?: boolean
  /** x attribute as a number or string (for nesting inside another SVG) */
  x?: number | string
  /** y attribute as a number or string (for nesting inside another SVG) */
  y?: number | string
  /** width as a number or string (for nesting inside another SVG) */
  svgHeight?: number | string
  /** height as a number or string (for nesting inside another SVG) */
  svgWidth?: number | string
  /** inline style passed into the icon svg */
  style?: Record<string, string | number>
  /** optional children */
  children?: ReactNode
  id?: string
}

const spinAnimation = keyframes`
  100% {
    transform: rotate(360deg);
  }
`

const spinStyle = css`
  &.spin {
    animation: ${spinAnimation} 0.8s steps(8) infinite;
    transform-origin: center;
  }
`

/**
 * Inline SVG icon component
 *
 * If you need access to the IconName type, you can:
 * ```js
 * import type { IconName } from '@opentrons/components'
 * ```
 */
export function Icon(props: IconProps): JSX.Element | null {
  const { name, children, className, spin, id, ...svgProps } = props

  if (!(name in ICON_DATA_BY_NAME)) {
    console.error(`"${name}" is not a valid Icon name`)
    return null
  }

  const { viewBox, path } = ICON_DATA_BY_NAME[name]

  return (
    <Svg
      aria-hidden="true"
      fill="currentColor"
      viewBox={viewBox}
      className={cx(className, { spin })}
      css={spinStyle}
      {...svgProps}
      id={id}
    >
      <path aria-roledescription={name} fillRule="evenodd" d={path} />
      {props.children}
    </Svg>
  )
}
