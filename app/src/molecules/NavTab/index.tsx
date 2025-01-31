import styled, { css } from 'styled-components'
import { NavLink } from 'react-router-dom'

import { BORDERS, COLORS, SPACING, TYPOGRAPHY } from '@opentrons/components'

import type { ComponentProps } from 'react'

export const TAB_BORDER_STYLE = css`
  border-bottom-style: ${BORDERS.styleSolid};
  border-bottom-width: 2px;
  border-bottom-color: ${COLORS.purple50};
`

interface NavTabProps {
  to: string
  tabName: string
  disabled?: boolean
}

const StyledNavLink = styled(NavLink)<ComponentProps<typeof NavLink>>`
  padding: 0 ${SPACING.spacing4} ${SPACING.spacing8};
  ${TYPOGRAPHY.labelSemiBold}
  color: ${COLORS.grey50};

  &.active {
    color: ${COLORS.black90};
    ${TAB_BORDER_STYLE}
  }
`
const DisabledNavLink = styled.span`
  padding: 0 ${SPACING.spacing4} ${SPACING.spacing8};
  ${TYPOGRAPHY.labelSemiBold}
  color: ${COLORS.grey40};
`

export function NavTab({
  to,
  tabName,
  disabled = false,
}: NavTabProps): JSX.Element {
  return (
    <StyledNavLink as={disabled ? DisabledNavLink : undefined} to={to} replace>
      {tabName}
    </StyledNavLink>
  )
}
