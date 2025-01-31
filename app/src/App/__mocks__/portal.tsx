// mock portal for enzyme tests
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

// replace Portal with a pass-through React.Fragment
export const Portal = ({ children }: Props): JSX.Element => <>{children}</>

export const PortalRoot = (): JSX.Element => <></>
export const TopPortalRoot = (): JSX.Element => <></>
