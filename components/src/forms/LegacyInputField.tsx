import cx from 'classnames'
import { Icon } from '../icons'
import styles from './forms.module.css'

import type {
  ChangeEventHandler,
  FocusEvent,
  MouseEvent,
  ReactNode,
} from 'react'

export const INPUT_TYPE_TEXT: 'text' = 'text'
export const INPUT_TYPE_PASSWORD: 'password' = 'password'

// TODO: Ian 2018-09-14 remove 'label' prop when IngredientPropertiesForm gets updated

export interface LegacyInputFieldProps {
  /** field is disabled if value is true */
  disabled?: boolean
  /** change handler */
  onChange?: ChangeEventHandler<HTMLInputElement>
  /** classes to apply to outer element */
  className?: string
  /** inline label text. DEPRECATED */
  label?: string
  /** classes to apply to inner label text div */
  labelTextClassName?: string | null | undefined
  /** name of field in form */
  name?: string
  /** optional ID of <input> element */
  id?: string
  /** placeholder text */
  placeholder?: string
  /** optional suffix component, appears to the right of input text */
  units?: ReactNode // TODO: Ian 2018-10-30 rename to 'suffix'
  /** current value of text in box, defaults to '' */
  value?: string | null | undefined
  /** if included, InputField will use error style and display error instead of caption */
  error?: string | null | undefined
  /** optional caption. hidden when `error` is given */
  caption?: string | null | undefined
  /** appears to the right of the caption. Used for character limits, eg '0/45' */
  secondaryCaption?: string | null | undefined
  /** optional input type (default "text") */
  type?: typeof INPUT_TYPE_TEXT | typeof INPUT_TYPE_PASSWORD
  /** mouse click handler */
  onClick?: (event: MouseEvent<HTMLInputElement>) => unknown
  /** focus handler */
  onFocus?: (event: FocusEvent<HTMLInputElement>) => unknown
  /** blur handler */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => unknown
  /** makes input field read-only */
  readOnly?: boolean | undefined
  /** html tabindex property */
  tabIndex?: number
  /** automatically focus field on render */
  autoFocus?: boolean
  /** if true, clear out value and add '-' placeholder */
  isIndeterminate?: boolean
}

/**
 * @deprecated Use `InputField`
 */

export function LegacyInputField(props: LegacyInputFieldProps): JSX.Element {
  const error = props.error != null
  const labelClass = cx(styles.form_field, props.className, {
    [styles.error]: error,
    [styles.disabled]: props.disabled,
  })

  if (!props.label) {
    return (
      <div className={labelClass}>
        <Input {...props} />
      </div>
    )
  }

  return (
    <label className={labelClass}>
      <div className={cx(props.labelTextClassName, styles.label_text)}>
        {props.label && error && (
          <div className={styles.error_icon}>
            <Icon name="alert" />
          </div>
        )}
        {props.label}
      </div>
      <Input {...props} />
    </label>
  )
}

// TODO(mc, 2018-02-21): maybe simplify further and split out?
function Input(props: LegacyInputFieldProps): JSX.Element {
  const error = props.error != null
  const value = props.isIndeterminate ? '' : props.value ?? ''
  const placeHolder = props.isIndeterminate ? '-' : props.placeholder

  return (
    <div className={styles.input_field_container}>
      <div className={styles.input_field}>
        <input
          disabled={props.disabled}
          id={props.id}
          type={props.type ?? INPUT_TYPE_TEXT}
          value={value}
          name={props.name}
          placeholder={placeHolder}
          onChange={props.disabled ? undefined : props.onChange}
          onFocus={props.disabled ? undefined : props.onFocus}
          onBlur={props.onBlur}
          onClick={props.disabled ? undefined : props.onClick}
          readOnly={props.readOnly}
          tabIndex={props.tabIndex}
          autoFocus={props.autoFocus}
        />
        {props.units && <div className={styles.suffix}>{props.units}</div>}
      </div>
      {/* TODO(mc, 2018-10-20): do not render if no caption */}
      <div className={styles.input_caption}>
        <span>{error ? props.error : props.caption}</span>
        <span className={styles.right}>{props.secondaryCaption}</span>
      </div>
    </div>
  )
}
