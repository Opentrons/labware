import { createContext, useRef } from 'react'
import { AlertsModal } from '.'
import { useToaster } from '/app/organisms/ToasterOven'

import type { ReactNode } from 'react'

export interface AlertsContextProps {
  removeActiveAppUpdateToast: () => void
}

export const AlertsContext = createContext<AlertsContextProps>({
  removeActiveAppUpdateToast: () => null,
})

interface AlertsProps {
  children: ReactNode
}

export function Alerts({ children }: AlertsProps): JSX.Element {
  const toastRef = useRef<string | null>(null)
  const { eatToast } = useToaster()

  const removeActiveAppUpdateToast = (): void => {
    if (toastRef.current) {
      eatToast(toastRef.current)
      toastRef.current = null
    }
  }

  return (
    <AlertsContext.Provider value={{ removeActiveAppUpdateToast }}>
      <AlertsModal toastIdRef={toastRef} />
      {children}
    </AlertsContext.Provider>
  )
}
