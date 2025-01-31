import { ControlInfo } from './ControlInfo'
import styles from './styles.module.css'

import type { ReactNode } from 'react'

export interface StackedLabeledControlProps {
  label: string
  control: ReactNode
  children?: ReactNode
}

export function StackedLabeledControl(
  props: StackedLabeledControlProps
): JSX.Element {
  const { label, control, children } = props

  return (
    <div className={styles.labeled_control_wrapper}>
      <p className={styles.stacked_labeled_control_label}>{label}</p>
      {children && (
        <ControlInfo className={styles.stacked_control_info}>
          {children}
        </ControlInfo>
      )}
      <div className={styles.stacked_labeled_control}>{control}</div>
    </div>
  )
}
