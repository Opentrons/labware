import cx from 'classnames'
import { Icon } from '../icons'
import styles from './forms.module.css'

import type { ChangeEventHandler, FocusEventHandler, ReactNode } from 'react'

export interface RadioOption {
  name: string
  value: string
  children?: ReactNode
}

export interface RadioGroupProps {
  /** blur handler */
  onBlur?: FocusEventHandler<HTMLInputElement>
  /** change handler */
  onChange: ChangeEventHandler
  /** value that is checked */
  value?: string
  /** Array of {name, value} data with optional children */
  options?: RadioOption[]
  /** Show radio buttons inline instead of stacked */
  inline?: boolean
  /** classes to apply to outer div */
  className?: string
  /** classes to apply to inner label text div */
  labelTextClassName?: string | null | undefined
  /** if is included, RadioGroup will use error style. The content of the string is ignored. */
  error?: string | null | undefined
  /** 'name' attr of input */
  name?: string
  /** optional prop to turn radio field blue when checked */
  useBlueChecked?: boolean
}

export function RadioGroup(props: RadioGroupProps): JSX.Element {
  const error = props.error != null

  const outerClassName = cx({
    [styles.inline]: props.inline,
    [styles.error]: error,
  })

  const itemClassName = cx(styles.form_field, props.className, {
    [styles.inline_item]: props.inline,
  })

  return (
    <div className={outerClassName}>
      {props.options?.map(radio => {
        const useStyleUpdates =
          props.useBlueChecked && radio.value === props.value
        return (
          <label key={radio.value} id={radio.value} className={itemClassName}>
            <div
              className={cx(styles.checkbox_icon, {
                [styles.checked]: useStyleUpdates,
              })}
            >
              <Icon
                name={
                  radio.value === props.value
                    ? 'radiobox-marked'
                    : 'radiobox-blank'
                }
                width={props.useBlueChecked ? '75%' : '100%'}
              />
            </div>

            <input
              className={cx(styles.input_field, styles.accessibly_hidden)}
              type="radio"
              name={props.name}
              value={radio.value}
              checked={radio.value === props.value}
              onBlur={props.onBlur}
              onChange={props.onChange}
            />
            <div className={cx(props.labelTextClassName, styles.label_text)}>
              {radio.name}
            </div>
            {radio.children}
          </label>
        )
      })}
    </div>
  )
}
