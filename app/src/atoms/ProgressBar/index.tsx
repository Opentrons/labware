import { css } from 'styled-components'
import { COLORS, Box } from '@opentrons/components'

import type { ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'

interface ProgressBarProps {
  /** the completed progress the range 0-100  */
  percentComplete: number
  /** extra styles to be applied to container  */
  outerStyles?: FlattenSimpleInterpolation
  /** extra styles to be filled progress element */
  innerStyles?: FlattenSimpleInterpolation
  /** extra elements to be rendered within container */
  children?: ReactNode
}

export function ProgressBar({
  percentComplete,
  outerStyles,
  innerStyles,
  children,
}: ProgressBarProps): JSX.Element {
  const ratio = percentComplete / 100
  const progress = ratio > 1 ? '100%' : `${String(ratio * 100)}%`

  const LINER_PROGRESS_CONTAINER_STYLE = css`
    height: 0.5rem;
    background: ${COLORS.white};
    padding: 0;
    width: 100%;
    margin: 0;
    overflow: hidden;
    border-radius: 0;
    ${outerStyles}
  `

  const LINER_PROGRESS_FILLER_STYLE = css`
    height: 0.5rem;
    width: ${progress};
    background: ${COLORS.blue50};
    transition: width 0.5s ease-in-out;
    webkit-transition: width 0.5s ease-in-out;
    moz-transition: width 0.5s ease-in-out;
    o-transition: width 0.5s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: right;
    border-radius: inherit;
    ${innerStyles}
  `

  return (
    <Box
      role="progressbar"
      css={LINER_PROGRESS_CONTAINER_STYLE}
      data-testid="ProgressBar_Container"
    >
      <Box css={LINER_PROGRESS_FILLER_STYLE} data-testid="ProgressBar_Bar" />
      {children}
    </Box>
  )
}
