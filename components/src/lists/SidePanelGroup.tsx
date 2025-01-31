// SidePanelGroup component
import cx from 'classnames'

import styles from './lists.module.css'
import { Icon } from '../icons'

import type { ReactNode } from 'react'
import type { IconName } from '../icons'

// TODO(bc, 2021-03-31): this component is only used in one place
// reconsider whether it belongs in components library
export interface SidePanelGroupProps {
  /** text of title */
  title?: string
  /** optional icon left of the title */
  iconName?: IconName
  /** children, most likely one or more TitledList */
  children?: ReactNode
  /** additional classnames */
  className?: string
  /** disables the whole SidePanelGroup if true */
  disabled?: boolean
}

/**
 * A component for grouping and titling multiple lists
 */
export function SidePanelGroup(props: SidePanelGroupProps): JSX.Element {
  const { iconName, disabled } = props

  const className = cx(styles.panel_group, props.className, {
    [styles.disabled]: disabled,
  })

  return (
    <div className={className}>
      {props.title && (
        <div className={styles.title_bar}>
          {iconName && (
            <Icon className={styles.title_bar_icon} name={iconName} />
          )}
          <h2 className={styles.title}>{props.title}</h2>
        </div>
      )}
      {props.children}
    </div>
  )
}
