import cx from 'classnames'
import { Icon } from '../icons'
import styles from './forms.module.css'

import type { ReactNode } from 'react'
import type { HoverTooltipHandlers } from '../tooltips'

export interface FormGroupProps {
  /** text label */
  label?: string
  /** form content */
  children?: ReactNode
  /** classes to apply */
  className?: string | null | undefined
  /** if is included, FormGroup title will use error style. The content of the string is ignored. */
  error?: string | null | undefined
  /** enable disabled style. Overridden by truthy `error` */
  disabled?: boolean | null | undefined
  /** handlers for HoverTooltipComponent */
  hoverTooltipHandlers?: HoverTooltipHandlers | null | undefined
  /** boolean indicating formGroup used in pipette Settings slideout */
  isPipetteSettingsSlideout?: boolean
}

export function FormGroup(props: FormGroupProps): JSX.Element {
  const error = props.error != null
  const className = cx(props.className, {
    [styles.error]: error,
    [styles.disabled]: !error && props.disabled,
  })

  return (
    <div className={className}>
      {props.label && (
        <div
          {...props.hoverTooltipHandlers}
          className={
            props.isPipetteSettingsSlideout
              ? styles.form_group_label_pipette_settings_slideout
              : styles.form_group_label
          }
        >
          {error && (
            <div className={styles.error_icon}>
              <Icon name="alert" />
            </div>
          )}
          {props.label}
        </div>
      )}
      {props.children}
    </div>
  )
}
