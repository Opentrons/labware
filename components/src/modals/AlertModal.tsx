import cx from 'classnames'

import { OutlineButton } from '../buttons'
import { Icon } from '../icons'
import { LegacyModal } from './LegacyModal'
import styles from './modals.module.css'

import type { ReactNode } from 'react'
import type { ButtonProps } from '../buttons'
import type { IconName } from '../icons'

export interface AlertModalProps {
  /** optional handler for overlay click */
  onCloseClick?: () => unknown
  /** optional modal heading */
  heading?: ReactNode
  /** optional array of `ButtonProps` for `OutlineButton`s at bottom of modal */
  buttons?: Array<ButtonProps | null | undefined>
  /** modal contents */
  children: ReactNode
  /** optional classes to apply */
  className?: string
  /** optional classes to apply */
  contentsClassName?: string
  /** lightens overlay (alert modal over existing modal) */
  alertOverlay?: boolean
  /** override default alert icon */
  iconName?: IconName | null | undefined
  /** restricts scroll outside of Modal when open, true by default */
  restrictOuterScroll?: boolean
}

/**
 * @deprecated use Modal instead
 * Generic alert modal with a heading and a set of buttons at the bottom
 */
export function AlertModal(props: AlertModalProps): JSX.Element {
  const {
    heading,
    buttons,
    className,
    onCloseClick,
    alertOverlay,
    restrictOuterScroll,
  } = props
  const iconName = props.iconName || 'alert'
  const wrapperStyle = cx(
    styles.alert_modal_wrapper,
    {
      [styles.no_alert_header]: !heading,
    },
    props.contentsClassName
  )

  return (
    <LegacyModal
      className={className}
      contentsClassName={wrapperStyle}
      onCloseClick={onCloseClick}
      alertOverlay={alertOverlay}
      restrictOuterScroll={restrictOuterScroll}
    >
      {heading && (
        <div
          className={cx(styles.alert_modal_heading, {
            [styles.no_icon_heading]: props.iconName === null,
          })}
        >
          {props.iconName !== null && (
            <Icon name={iconName} className={styles.alert_modal_icon} />
          )}
          {heading}
        </div>
      )}
      <div className={styles.alert_modal_contents}>{props.children}</div>
      {buttons && (
        <div className={styles.alert_modal_buttons}>
          {(buttons.filter(Boolean) as ButtonProps[]).map((button, index) => (
            <OutlineButton
              {...button}
              className={cx(styles.alert_button, button.className)}
              key={index}
            />
          ))}
        </div>
      )}
    </LegacyModal>
  )
}
