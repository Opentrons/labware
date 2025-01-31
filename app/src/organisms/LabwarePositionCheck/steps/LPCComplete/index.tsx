import { useEffect } from 'react'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCComplete(props: LPCWizardContentProps): JSX.Element {
  useEffect(() => {
    setTimeout(() => {
      props.onCloseClick()
    }, 5000)
  }, [])

  return <>LPC COMPLETE</>
}
