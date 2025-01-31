// presentational components for the wifi connect form
import styled from 'styled-components'
import { FONT_WEIGHT_SEMIBOLD, SPACING } from '@opentrons/components'

import type { ReactNode } from 'react'

export interface FormRowProps {
  label: string
  labelFor: string
  children: ReactNode
}

const StyledRow = styled.div`
  display: table-row;
`

const StyledLabel = styled.label`
  display: table-cell;
  padding-right: 1rem;
  text-align: right;
  font-weight: ${FONT_WEIGHT_SEMIBOLD};
`

const StyledInputWrapper = styled.div`
  padding-bottom: ${SPACING.spacing12};
  display: table-cell;

  & > *:not(:last-child) {
    margin-bottom: 0.25rem;
  }
`

export const FormRow = (props: FormRowProps): JSX.Element => {
  const { label, labelFor, children } = props

  return (
    <StyledRow>
      <StyledLabel htmlFor={labelFor}>{label}</StyledLabel>
      <StyledInputWrapper>{children}</StyledInputWrapper>
    </StyledRow>
  )
}
