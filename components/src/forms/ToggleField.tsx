import cx from 'classnames'
import { Icon } from '../icons'

import type { ChangeEvent } from 'react'

import styles from './forms.module.css'

export interface ToggleFieldProps {
  /** change handler */
  onChange: (event: ChangeEvent<HTMLInputElement>) => unknown
  /** checkbox is checked if value is true */
  value?: boolean
  /** classes to apply */
  className?: string
  /** classes to apply to inner label text div */
  labelTextClassName?: string | null | undefined
  /** name of field in form */
  name?: string
  /** label text for toggled off */
  offLabel?: string
  /** label text for toggled on */
  onLabel?: string
  /** checkbox is disabled if value is true */
  disabled?: boolean
  /** html tabindex property */
  tabIndex?: number
}

export function ToggleField(props: ToggleFieldProps): JSX.Element {
  const outerClassName = cx(styles.form_field, props.className, {
    [styles.toggle_disabled]: props.disabled,
  })

  const innerDivClassName = cx(styles.toggle_icon, {
    [styles.toggle_disabled]: props.disabled,
  })

  return (
    <label className={outerClassName}>
      <div className={innerDivClassName}>
        <Icon
          name={props.value ? 'ot-toggle-field-on' : 'ot-toggle-field-off'}
          width="100%"
        />
      </div>
      <input
        className={cx(styles.input_field, styles.accessibly_hidden)}
        type="checkbox"
        name={props.name}
        checked={props.value || false}
        disabled={props.disabled}
        onChange={props.onChange}
        tabIndex={props.tabIndex}
      />
      <div className={cx(props.labelTextClassName, styles.label_text)}>
        {props.value ? props.onLabel : props.offLabel}
      </div>
    </label>
  )
}
