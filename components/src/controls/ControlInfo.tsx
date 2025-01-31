import styles from './styles.module.css'

import type { ReactNode } from 'react'

export interface ControlInfoProps {
  children: ReactNode
  className?: string
}

export function ControlInfo(props: ControlInfoProps): JSX.Element {
  const { children, className = styles.control_info } = props
  return <div className={className}>{children}</div>
}
