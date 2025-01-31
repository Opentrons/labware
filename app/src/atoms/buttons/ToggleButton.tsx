import { css } from 'styled-components'

import { Btn, COLORS, Icon } from '@opentrons/components'

import type { MouseEvent } from 'react'
import type { StyleProps } from '@opentrons/components'

const TOGGLE_DISABLED_STYLES = css`
  color: ${COLORS.grey50};

  &:hover {
    color: ${COLORS.grey55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`

const TOGGLE_ENABLED_STYLES = css`
  color: ${COLORS.blue50};

  &:hover {
    color: ${COLORS.blue55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`

interface ToggleButtonProps extends StyleProps {
  label: string
  toggledOn: boolean
  disabled?: boolean | null
  id?: string
  onClick?: (e: MouseEvent) => unknown
}

export const ToggleButton = (props: ToggleButtonProps): JSX.Element => {
  const { label, toggledOn, disabled, size, ...buttonProps } = props
  const iconName = toggledOn ? 'ot-toggle-input-on' : 'ot-toggle-input-off'

  return (
    <Btn
      disabled={disabled ?? false}
      role="switch"
      aria-label={label}
      aria-checked={toggledOn}
      size={size ?? '2rem'}
      css={props.toggledOn ? TOGGLE_ENABLED_STYLES : TOGGLE_DISABLED_STYLES}
      {...buttonProps}
    >
      {/* TODO(bh, 2022-10-05): implement small and large sizes from design system */}
      <Icon name={iconName} height="1rem" />
    </Btn>
  )
}
