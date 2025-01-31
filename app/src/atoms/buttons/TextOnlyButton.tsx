import { css } from 'styled-components'
import { Btn, StyledText, COLORS, RESPONSIVENESS } from '@opentrons/components'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

const GO_BACK_BUTTON_STYLE = css`
  color: ${COLORS.grey50};

  &:hover {
    opacity: 70%;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    &:hover {
      opacity: 100%;
    }
    &:active {
      opacity: 70%;
    }
  }
`

const GO_BACK_BUTTON_DISABLED_STYLE = css`
  color: ${COLORS.grey60};
`

interface TextOnlyButtonProps extends StyleProps {
  onClick: () => void
  buttonText: ReactNode
  disabled?: boolean
}

export function TextOnlyButton({
  onClick,
  buttonText,
  disabled = false,
  ...styleProps
}: TextOnlyButtonProps): JSX.Element {
  return (
    <Btn onClick={onClick} disabled={disabled} {...styleProps}>
      <StyledText
        desktopStyle="bodyDefaultSemiBold"
        oddStyle="bodyTextSemiBold"
        css={disabled ? GO_BACK_BUTTON_DISABLED_STYLE : GO_BACK_BUTTON_STYLE}
      >
        {buttonText}
      </StyledText>
    </Btn>
  )
}
