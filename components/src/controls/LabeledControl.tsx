import { ControlInfo } from './ControlInfo'
import styles from './styles.module.css'

import type { ReactNode } from 'react'

export interface LabeledControlProps {
  label: string
  control: ReactNode
  children?: ReactNode
}

export function LabeledControl(props: LabeledControlProps): JSX.Element {
  const { label, control, children } = props

  return (
    <div className={styles.labeled_control_wrapper}>
      <div className={styles.labeled_control}>
        <p className={styles.labeled_control_label}>{label}</p>
        {control}
      </div>
      {children && <ControlInfo>{children}</ControlInfo>}
    </div>
  )
}
