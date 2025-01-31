import cx from 'classnames'

import { OutlineButton } from '../buttons'
import { LabeledControl } from './LabeledControl'
import styles from './styles.module.css'

import type { ReactNode } from 'react'
import type { ButtonProps } from '../buttons'

export interface LabeledButtonProps {
  label: string
  buttonProps: ButtonProps
  children: ReactNode
}

export function LabeledButton(props: LabeledButtonProps): JSX.Element {
  const { label, buttonProps } = props
  const buttonClass = cx(styles.labeled_button, buttonProps.className)

  return (
    <LabeledControl
      label={label}
      control={<OutlineButton {...buttonProps} className={buttonClass} />}
    >
      {props.children}
    </LabeledControl>
  )
}
