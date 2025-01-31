import { SimpleWizardBodyContainer } from './SimpleWizardBodyContainer'
import { SimpleWizardBodyContent } from './SimpleWizardBodyContent'
import { SimpleWizardInProgressBody } from './SimpleWizardInProgressBody'

import type { ComponentProps } from 'react'

export {
  SimpleWizardBodyContainer,
  SimpleWizardBodyContent,
  SimpleWizardInProgressBody,
}

export function SimpleWizardBody(
  props: ComponentProps<typeof SimpleWizardBodyContent> &
    ComponentProps<typeof SimpleWizardBodyContainer>
): JSX.Element {
  const { children, ...rest } = props
  return (
    <SimpleWizardBodyContainer {...rest}>
      <SimpleWizardBodyContent {...rest}>{children}</SimpleWizardBodyContent>
    </SimpleWizardBodyContainer>
  )
}
