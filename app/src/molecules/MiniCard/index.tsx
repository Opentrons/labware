import { css } from 'styled-components'
import {
  BORDERS,
  COLORS,
  CURSOR_POINTER,
  Flex,
  SPACING,
} from '@opentrons/components'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

interface MiniCardProps extends StyleProps {
  onClick: () => void
  isSelected: boolean
  children: ReactNode
  isError?: boolean
  isWarning?: boolean
}
const unselectedOptionStyles = css`
  background-color: ${COLORS.white};
  border: 1px solid ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius8};
  padding: ${SPACING.spacing8};
  width: 100%;
  cursor: ${CURSOR_POINTER};

  &:hover {
    background-color: ${COLORS.grey10};
    border: 1px solid ${COLORS.grey35};
  }
`
const selectedOptionStyles = css`
  ${unselectedOptionStyles}
  border: 1px solid ${COLORS.blue50};
  background-color: ${COLORS.blue10};

  &:hover {
    border: 1px solid ${COLORS.blue50};
    background-color: ${COLORS.blue10};
  }
`

const errorOptionStyles = css`
  ${selectedOptionStyles}
  border: 1px solid ${COLORS.red50};
  background-color: ${COLORS.red20};

  &:hover {
    border: 1px solid ${COLORS.red50};
    background-color: ${COLORS.red20};
  }
`

const warningOptionStyles = css`
  ${selectedOptionStyles}
  border: 1px solid ${COLORS.yellow50};
  background-color: ${COLORS.yellow20};

  &:hover {
    border: 1px solid ${COLORS.yellow50};
    background-color: ${COLORS.yellow20};
  }
`

export function MiniCard(props: MiniCardProps): JSX.Element {
  const {
    children,
    onClick,
    isSelected,
    isError = false,
    isWarning = false,
  } = props

  let wrapperStyles = unselectedOptionStyles
  if (isSelected && isError) {
    wrapperStyles = errorOptionStyles
  } else if (isSelected && isWarning) {
    wrapperStyles = warningOptionStyles
  } else if (isSelected) {
    wrapperStyles = selectedOptionStyles
  }

  return (
    <Flex onClick={onClick} css={wrapperStyles}>
      {children}
    </Flex>
  )
}
