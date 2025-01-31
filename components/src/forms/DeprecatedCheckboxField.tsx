import cx from 'classnames'
import { Icon } from '../icons'

import type { ComponentProps, ChangeEventHandler } from 'react'

import styles from './forms.module.css'

/**
 * Checkbox Field Properties.
 */
export interface DeprecatedCheckboxFieldProps {
  /** change handler */
  onChange: ChangeEventHandler
  /** checkbox is checked if value is true */
  value?: boolean
  /** classes to apply */
  className?: string
  /** classes to apply to inner label text div. Deprecated. use labelProps.className */
  labelTextClassName?: string | null | undefined
  /** name of field in form */
  name?: string
  /** label text for checkbox */
  label?: string
  /** if is included, checkbox will use error style. The content of the string is ignored. */
  error?: string | null | undefined
  /** checkbox is disabled if value is true */
  disabled?: boolean
  /** html tabindex property */
  tabIndex?: number
  /** props passed into label div. TODO IMMEDIATELY what is the Flow type? */
  labelProps?: ComponentProps<'div'>
  /** if true, render indeterminate icon */
  isIndeterminate?: boolean
}

/**
 * Checkbox Form Field
 * @deprecated
 */
export function DeprecatedCheckboxField(
  props: DeprecatedCheckboxFieldProps
): JSX.Element {
  const error = props.error != null
  const outerClassName = cx(styles.form_field, props.className, {
    [styles.checkbox_disabled]: props.disabled,
  })

  const innerDivClassName = cx(styles.checkbox_icon, {
    [styles.error]: error,
    [styles.checkbox_disabled]: props.disabled,
  })

  // TODO(bc, 2021-03-09): this usage of the indeterminate prop of input
  // is in react types for input el. Remove ts expect error below and replace with
  // ref on input el (see: Dan Abramov https://github.com/facebook/react/issues/1798#issuecomment-333414857)
  const indeterminate = props.isIndeterminate ? 'true' : undefined

  return (
    <label className={outerClassName}>
      <div className={innerDivClassName}>
        <Icon
          name={
            props.isIndeterminate
              ? 'minus-box'
              : props.value
              ? 'ot-checkbox'
              : 'checkbox-blank-outline'
          }
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
        /* @ts-expect-error */
        indeterminate={indeterminate}
      />
      <div
        {...props.labelProps}
        className={cx(
          props.labelTextClassName,
          props.labelProps?.className,
          styles.label_text
        )}
      >
        {props.label}
      </div>
    </label>
  )
}
