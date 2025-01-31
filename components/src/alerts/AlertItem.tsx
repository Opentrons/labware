import cx from 'classnames'
import { Icon } from '../icons'
import { IconButton } from '../buttons'
import styles from './alerts.module.css'

import type { ReactNode } from 'react'
import type { IconProps } from '../icons'

export type AlertType = 'success' | 'warning' | 'error' | 'info'

export interface AlertItemProps {
  /** name constant of the icon to display */
  type: AlertType
  /** title/main message of colored alert bar */
  title: ReactNode
  /** Alert message body contents */
  children?: ReactNode
  /** Additional class name */
  className?: string
  /** optional handler to show close button/clear alert  */
  onCloseClick?: () => unknown
  /** Override the default Alert Icon */
  icon?: IconProps
}

/**
 * Alert overlay,
 * change style and icon by using type 'success' 'warning' 'error'
 */

const ALERT_PROPS_BY_TYPE: Record<
  AlertType,
  { icon: IconProps; className: string }
> = {
  success: {
    icon: { name: 'check-circle' },
    className: styles.success,
  },
  error: {
    icon: { name: 'alert-circle' },
    className: styles.error,
  },
  warning: {
    icon: { name: 'alert-circle' },
    className: styles.warning,
  },
  info: {
    icon: { name: 'information' },
    className: styles.info,
  },
}

/**
 * @deprecated Use 'Banner' instead
 */

export function AlertItem(props: AlertItemProps): JSX.Element {
  const alertProps = ALERT_PROPS_BY_TYPE[props.type]
  const icon = props.icon ? props.icon : alertProps.icon
  const className = cx(styles.alert, alertProps.className, props.className)

  const iconProps = {
    ...icon,
    className: styles.icon,
  }

  return (
    <div className={className}>
      <div className={styles.title_bar}>
        <Icon {...iconProps} />
        <span className={styles.title} data-testid="alert_item_title">
          {props.title}
        </span>
        {props.onCloseClick && (
          <IconButton
            name="close"
            onClick={props.onCloseClick}
            className={styles.close}
          />
        )}
      </div>
      {props.children && <div className={styles.message}>{props.children}</div>}
    </div>
  )
}
