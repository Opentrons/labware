import type { ReactNode } from 'react'

export type AlertLevel = 'timeline' | 'form'
type AlertType = 'error' | 'warning'

interface AlertData {
  title: string
  description: ReactNode
  dismissId?: string
}

export type MakeAlert = (
  alertType: AlertType,
  data: AlertData,
  key: number | string
) => JSX.Element
