import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  COLORS,
} from '@opentrons/components'
import { Header } from '../Header'
import styled from 'styled-components'

const SquareProgressBar = styled.progress`
  width: 100%;
  height: 4px;
  border-radius: 0;
  appearance: none;

  &::-webkit-progress-bar {
    background-color: ${COLORS.grey30}; /* Background color of the progress bar */
    border-radius: 0;
  }

  &::-webkit-progress-value {
    background-color: ${COLORS.blue50}; /* Color of the progress value */
    border-radius: 0;
    transition: width 1s;
  }

  &::-moz-progress-bar {
    background-color: ${COLORS.blue50}; /* Color of the progress value for Firefox */
    border-radius: 0;
  }
`

export interface ChatHeaderProps {
  progressPercentage: number
}

export function HeaderWithMeter({
  progressPercentage = 0.5,
}: ChatHeaderProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      width="100%"
    >
      <Header isExitButton />
      <SquareProgressBar value={progressPercentage}></SquareProgressBar>
    </Flex>
  )
}
