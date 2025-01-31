// TitledList component
import { Children } from 'react'
import cx from 'classnames'

import { Icon } from '../icons'
import { LegacyStyledText } from '../atoms'
import { COLORS } from '../helix-design-system'

import type { MouseEvent, ReactNode } from 'react'
import type { IconName, IconProps } from '../icons'

import styles from './lists.module.css'

// TODO(bc, 2021-03-31): reconsider whether this belongs in components library
// it is bloated with application specific functionality

export interface TitledListProps {
  /** id attribute */
  id?: string
  /** text of title */
  title: string
  /** optional icon left of the title */
  iconName?: IconName | null | undefined
  /** props passed down to icon (`className` and `name` are ignored) */
  iconProps?: Omit<IconProps, 'name'>
  /** optional data test id for the container */
  'data-test'?: string
  // TODO(mc, 2018-01-25): enforce <li> children requirement with flow
  /** children must all be `<li>` */
  children?: ReactNode
  /** additional classnames */
  className?: string
  /** component with descriptive text about the list */
  description?: ReactNode
  /** optional click action (on title div, not children) */
  onClick?: (event: MouseEvent) => unknown
  /** optional right click action (on wrapping div) */
  onContextMenu?: (event: MouseEvent) => unknown
  /** optional mouseEnter action */
  onMouseEnter?: (event: MouseEvent) => unknown
  /** optional mouseLeave action */
  onMouseLeave?: (event: MouseEvent) => unknown
  /** caret click action; if defined, list is expandable and carat is visible */
  onCollapseToggle?: (event: MouseEvent) => unknown
  /** collapse the list if true (false by default) */
  collapsed?: boolean
  /** set to true when TitledList is selected (eg, user clicked it) */
  selected?: boolean
  /** set to true when TitledList is hovered (but not when its contents are hovered) */
  hovered?: boolean
  /** disables the whole TitledList if true */
  disabled?: boolean
  /** appear disabled, but preserve collapsibility */
  inert?: boolean
}

/**
 * An ordered list with optional title, icon, and description.
 */
export function TitledList(props: TitledListProps): JSX.Element {
  const {
    id,
    iconName,
    disabled,
    inert,
    'data-test': dataTest,
    onCollapseToggle,
    iconProps,
    onMouseEnter,
    onMouseLeave,
    onContextMenu,
  } = props
  const collapsible = onCollapseToggle != null

  const onClick = !disabled ? props.onClick : undefined

  // clicking on the carat will not call props.onClick,
  // so prevent bubbling up if there is an onCollapseToggle fn
  const handleCollapseToggle = (e: MouseEvent): void => {
    if (onCollapseToggle && !disabled) {
      e.stopPropagation()
      onCollapseToggle(e)
    }
  }

  const hasValidChildren = Children.toArray(props.children).some(child => child)

  const className = cx(styles.titled_list, props.className, {
    [styles.disabled]: disabled || inert,
    [styles.titled_list_selected]: !disabled && props.selected,
    [styles.hover_border]: !disabled && props.hovered,
  })
  // @ts-expect-error(sa, 2021-6-23): cast value to boolean
  const titleBarClass = cx(styles.titled_list_title_bar, {
    [styles.clickable]: props.onClick,
  })

  const iconClass = cx(
    styles.title_bar_icon,
    styles.icon_left_of_title,
    iconProps && iconProps.className
  )

  let textColor = ''
  if (disabled) {
    //  the below hex code is for our legacy --c-font-disabled to match other text colors
    textColor = '#9c9c9c'
  } else if (props.selected && !disabled) {
    //  the below hex code is for our legacy --c-highlight to match other text colors
    textColor = '#5fd8ee'
  }

  return (
    <div
      id={id}
      className={className}
      data-test={dataTest}
      {...{ onMouseEnter, onMouseLeave, onContextMenu }}
    >
      <div onClick={onClick} className={titleBarClass}>
        {iconName && (
          <Icon {...iconProps} className={iconClass} name={iconName} />
        )}
        <LegacyStyledText
          as="h3"
          backgroundColor={COLORS.white}
          color={textColor}
        >
          {props.title}
        </LegacyStyledText>
        {collapsible && (
          <div
            onClick={handleCollapseToggle}
            className={styles.title_bar_carat}
          >
            <Icon
              className={styles.title_bar_icon}
              name={
                props.selected
                  ? 'chevron-right'
                  : props.collapsed
                  ? 'chevron-down'
                  : 'chevron-up'
              }
            />
          </div>
        )}
      </div>
      {!props.collapsed && props.description}
      {!props.collapsed && hasValidChildren && (
        <ol className={styles.list}>{props.children}</ol>
      )}
    </div>
  )
}
