import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DISPLAY_FLEX,
  Icon,
  JUSTIFY_SPACE_AROUND,
  StyledText,
} from '@opentrons/components'
import { useEffect, useState } from 'react'

interface SendButtonProps {
  handleClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

const progressTexts = [
  'Initializing...',
  'Processing...',
  'Generating...',
  'Finalizing...',
]

export function SendButton({
  handleClick,
  disabled = false,
  isLoading = false,
}: SendButtonProps): JSX.Element {
  const playButtonStyle = css`
    -webkit-tap-highlight-color: transparent;
    &:focus {
      background-color: ${COLORS.blue60};
      color: ${COLORS.white};
    }

    &:hover {
      background-color: ${COLORS.blue50};
      color: ${COLORS.white};
    }

    &:focus-visible {
      background-color: ${COLORS.blue50};
    }

    &:active {
      background-color: ${COLORS.blue60};
      color: ${COLORS.white};
    }

    &:disabled {
      background-color: ${COLORS.grey35};
      color: ${COLORS.grey50};
    }
  `

  const [buttonText, setButtonText] = useState(progressTexts[0])
  const [, setProgressIndex] = useState(0)

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgressIndex(prevIndex => {
          const newIndex = (prevIndex + 1) % progressTexts.length
          setButtonText(progressTexts[newIndex])
          return newIndex
        })
      }, 5000)

      return () => {
        setProgressIndex(0)
        clearInterval(interval)
      }
    }
  }, [isLoading])

  return (
    <Btn
      alignItems={ALIGN_CENTER}
      backgroundColor={disabled ? COLORS.grey35 : COLORS.blue50}
      borderRadius={BORDERS.borderRadiusFull}
      display={DISPLAY_FLEX}
      justifyContent={JUSTIFY_SPACE_AROUND}
      paddingX="20px"
      width={isLoading ? 'wrap' : '4.25rem'}
      height="3.75rem"
      disabled={disabled || isLoading}
      onClick={handleClick}
      aria-label="play"
      css={playButtonStyle}
    >
      {isLoading ? (
        <StyledText paddingLeft="0px" paddingRight="24px" as="i">
          {buttonText}
        </StyledText>
      ) : null}
      <Icon
        color={disabled ? COLORS.grey50 : COLORS.white}
        name={isLoading ? 'ot-spinner' : 'send'}
        spin={isLoading}
        size="2rem"
        data-testid={`SendButton_icon_${isLoading ? 'ot-spinner' : 'send'}`}
      />
    </Btn>
  )
}
