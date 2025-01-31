import { css } from 'styled-components'
import { Tooltip } from '../../atoms'
import { COLORS, BORDERS } from '../../helix-design-system'
import { Btn, Flex } from '../../primitives'
import { POSITION_RELATIVE, DIRECTION_ROW } from '../../styles'
import { useHoverTooltip } from '../../tooltips'
import { TYPOGRAPHY, SPACING, RESPONSIVENESS } from '../../ui-style-constants'

const DEFAULT_TAB_STYLE = css`
  ${TYPOGRAPHY.pSemiBold}
  background-color: ${COLORS.purple30};
  border-radius: ${BORDERS.borderRadius8};
  padding: ${SPACING.spacing8} ${SPACING.spacing16};
  position: ${POSITION_RELATIVE};

  &:hover {
    background-color: ${COLORS.purple35};
  }

  &:focus-visible {
    outline-offset: 2px;
    outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
  }

  &:disabled {
    background-color: ${COLORS.grey30};
    color: ${COLORS.grey40};

    &:hover {
      background-color: ${COLORS.grey30};
    }
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-radius: ${BORDERS.borderRadius16};
    box-shadow: none;
    font-size: ${TYPOGRAPHY.fontSize22};
    font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
    line-height: ${TYPOGRAPHY.lineHeight28};
    padding: ${SPACING.spacing16} ${SPACING.spacing24};
    text-transform: ${TYPOGRAPHY.textTransformNone};

    &:focus-visible {
      outline-offset: 3px;
      outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
    }
  }
`
const CURRENT_TAB_STYLE = css`
  ${DEFAULT_TAB_STYLE}
  color: ${COLORS.white};
  background-color: ${COLORS.purple50};

  &:hover {
    background-color: ${COLORS.purple55};
  }
`
const DEFAULT_CONTAINER_STYLE = css`
  grid-gap: ${SPACING.spacing4};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing8};
  }
`

export interface TabProps {
  text: string
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  disabledReasonForTooltip?: string
}

export interface TabsProps {
  tabs: TabProps[]
}

export function Tabs(props: TabsProps): JSX.Element {
  const { tabs } = props

  return (
    <Flex flexDirection={DIRECTION_ROW} css={DEFAULT_CONTAINER_STYLE}>
      {tabs.map((tab, index) => (
        <Tab {...tab} data-testid={`tab_${index}_${tab.text}`} key={index} />
      ))}
    </Flex>
  )
}

function Tab(props: TabProps): JSX.Element {
  const {
    text,
    onClick,
    isActive,
    disabled = false,
    disabledReasonForTooltip,
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()
  return (
    <>
      <Btn
        onClick={onClick}
        css={isActive === true ? CURRENT_TAB_STYLE : DEFAULT_TAB_STYLE}
        disabled={disabled}
        {...targetProps}
      >
        {text}
      </Btn>
      {disabled && disabledReasonForTooltip != null ? (
        <Tooltip tooltipProps={tooltipProps}>
          {disabledReasonForTooltip}
        </Tooltip>
      ) : null}
    </>
  )
}
