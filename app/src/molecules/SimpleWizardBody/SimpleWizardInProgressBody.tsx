import { InProgressModal } from '../InProgressModal/InProgressModal'
import { SimpleWizardBodyContainer } from './SimpleWizardBodyContainer'

import type { ComponentProps } from 'react'
import type { StyleProps } from '@opentrons/components'

export type SimpleWizardInProgressBodyProps = ComponentProps<
  typeof InProgressModal
> &
  StyleProps

export function SimpleWizardInProgressBody({
  alternativeSpinner,
  description,
  body,
  children,
  ...styleProps
}: SimpleWizardInProgressBodyProps): JSX.Element {
  return (
    <SimpleWizardBodyContainer {...styleProps}>
      <InProgressModal
        alternativeSpinner={alternativeSpinner}
        description={description}
        body={body}
      >
        {children}
      </InProgressModal>
    </SimpleWizardBodyContainer>
  )
}
