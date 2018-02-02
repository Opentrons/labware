// @flow
import * as React from 'react'
import cx from 'classnames'
import {Icon} from '../icons'
import styles from './forms.css'

type Props = {
  /** text label */
  label?: string,
  /** form content */
  children?: React.Node,
  /** classes to apply */
  className?: string,
  /** if is included, FormGroup title will use error style. The content of the string is ignored. */
  error?: string
}

export default function FormGroup (props: Props) {
  const error = props.error !== undefined
  return (
    <div className={props.className}>
      <div className={cx(styles.formgroup_label, {[styles.error]: error})}>
        {error &&
          <div className={styles.error_icon}>
            <Icon name='alert' />
          </div>
        }
        {props.label}
      </div>
      {props.children}
    </div>
  )
}
