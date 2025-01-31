import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DISPLAY_FLEX,
  Icon,
  SPACING,
  StyledText,
} from '@opentrons/components'

interface LiquidButtonProps {
  showLiquidOverflowMenu: (liquidOverflowMenu: boolean) => void
}

export function LiquidButton({
  showLiquidOverflowMenu,
}: LiquidButtonProps): JSX.Element {
  const { t } = useTranslation('starting_deck_state')
  return (
    <Btn
      css={LIQUID_BUTTON_STYLE}
      onClick={() => {
        showLiquidOverflowMenu(true)
      }}
    >
      <Icon size="1rem" name="water-drop" data-testid="water-drop" />
      <StyledText desktopStyle="bodyDefaultSemiBold">{t('liquid')}</StyledText>
    </Btn>
  )
}

const LIQUID_BUTTON_STYLE = css`
  display: ${DISPLAY_FLEX};
  padding: ${SPACING.spacing8} ${SPACING.spacing16};
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_CENTER};
  border-radius: ${BORDERS.borderRadius8};
  background-color: ${COLORS.grey30};

  &:focus-visible {
    outline-offset: 3px;
    outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
  }

  &:active {
    background-color: ${COLORS.grey40};
  }

  &:hover {
    box-shadow: 0 0 0;
    background-color: ${COLORS.grey35};
  }

  &:disabled {
    background-color: ${COLORS.grey30};
    color: ${COLORS.grey40};
  }
`
