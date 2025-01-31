import cx from 'classnames'
import omit from 'lodash/omit'

import { Icon } from '../icons'
import styles from './buttons.module.css'

import { BUTTON_TYPE_BUTTON } from '../primitives'

import type { ComponentType, MouseEventHandler, ReactNode } from 'react'
import type { BUTTON_TYPE_SUBMIT, BUTTON_TYPE_RESET } from '../primitives'
import type { IconName } from '../icons'
import type { UseHoverTooltipTargetProps } from '../tooltips'

export interface ButtonProps {
  /** id attribute */
  id?: string
  /** click handler */
  onClick?: MouseEventHandler
  /** name attribute */
  name?: string
  /** title attribute */
  title?: string
  /** disabled attribute (setting disabled removes onClick) */
  disabled?: boolean | null | undefined
  /** use hover style even when not hovered */
  hover?: boolean | null | undefined
  /** optional Icon name */
  iconName?: IconName
  /** classes to apply */
  className?: string
  /** inverts the default color/background/border of default button style */
  inverted?: boolean
  /** contents of the button */
  children?: ReactNode
  /** type of button (default "button") */
  type?:
    | typeof BUTTON_TYPE_SUBMIT
    | typeof BUTTON_TYPE_RESET
    | typeof BUTTON_TYPE_BUTTON
  /** ID of form that button is for */
  form?: string
  /** custom element or component to use instead of `<button>` */
  Component?: ComponentType<any> | keyof JSX.IntrinsicElements
  /** handlers for HoverTooltipComponent */
  hoverTooltipHandlers?: UseHoverTooltipTargetProps | null | undefined
  /** html tabindex property */
  tabIndex?: number
  /** catch all prop for pass-through props */
  [name: string]: any
}

// props to strip if using a custom component
const STRIP_PROPS = [
  'inverted',
  'iconName',
  'children',
  'Component',
  'hoverTooltipHandlers',
]

/**
 * Basic, un-styled button. You probably want to use a styled button
 * instead. All buttons take the same props.
 *
 * If you need access to the ButtonProps type, you can:
 * ```js
 * import {type ButtonProps} from '@opentrons/components'
 * ```
 * @deprecated Use {@link Btn}
 */
export function Button(props: ButtonProps): JSX.Element {
  const { id, name, title, disabled, hover, tabIndex, form } = props
  const className = cx(props.className, { [styles.hover]: hover })
  const onClick = !disabled ? props.onClick : undefined
  const Component: any = props.Component ?? 'button'
  const type = props.type ?? BUTTON_TYPE_BUTTON

  // pass all props if using a custom component
  const buttonProps = !props.Component
    ? { id, name, type, form, title, disabled, onClick, className, tabIndex }
    : {
        ...omit(props, STRIP_PROPS),
        className: cx(className, { [styles.disabled]: disabled }),
        onClick,
      }

  // TODO(mc, 2019-04-02): hoverTooltipHandlers should probably be named more
  // generically, and the Button component should probably be configured as a
  // ref forwarder
  return (
    <Component {...props.hoverTooltipHandlers} {...buttonProps}>
      {props.iconName && <Icon name={props.iconName} className={styles.icon} />}
      {props.children}
    </Component>
  )
}
