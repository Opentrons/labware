import * as React from 'react'
import { css } from 'styled-components'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  Btn,
  COLORS,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_START,
  OverflowBtn,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getUnsavedForm } from '../../../../step-forms/selectors'
import { getTopPortalEl } from '../../../../components/portals/TopPortal'
import { StepOverflowMenu } from './StepOverflowMenu'

import type { IconName } from '@opentrons/components'

const STARTING_DECK_STATE = 'Starting deck state'
const FINAL_DECK_STATE = 'Final deck state'

export interface StepContainerProps {
  title: string
  iconName: IconName
  stepId?: string
  iconColor?: string
  onClick?: (event: React.MouseEvent) => void
  onMouseEnter?: (event: React.MouseEvent) => void
  onMouseLeave?: (event: React.MouseEvent) => void
  selected?: boolean
  hovered?: boolean
}

export function StepContainer(props: StepContainerProps): JSX.Element {
  const {
    stepId,
    iconName,
    onMouseEnter,
    onMouseLeave,
    selected,
    onClick,
    hovered,
    iconColor,
    title,
  } = props
  const formData = useSelector(getUnsavedForm)
  const [top, setTop] = React.useState<number>(0)
  const menuRoot = React.useRef<HTMLDivElement | null>(null)
  const [stepOverflowMenu, setStepOverflowMenu] = React.useState<boolean>(false)
  const isStartingOrEndingState =
    title === STARTING_DECK_STATE || title === FINAL_DECK_STATE

  let backgroundColor = isStartingOrEndingState ? COLORS.blue20 : COLORS.grey20
  let color = COLORS.black90
  if (selected) {
    backgroundColor = COLORS.blue50
    color = COLORS.white
  }
  if (hovered) {
    backgroundColor = COLORS.grey30
    color = COLORS.black90
  }

  const handleOverflowClick = (event: React.MouseEvent): void => {
    const clickY = event.clientY

    const screenH = window.innerHeight
    const rootH = menuRoot.current ? menuRoot.current.offsetHeight : 0
    const top = screenH - clickY > rootH ? clickY + 5 : clickY - rootH - 5

    setTop(top)
  }

  React.useEffect(() => {
    global.addEventListener('click', handleClick)
    return () => {
      global.removeEventListener('click', handleClick)
    }
  })

  const handleClick = (event: MouseEvent): void => {
    const wasOutside = !(
      event.target instanceof Node && menuRoot.current?.contains(event.target)
    )

    if (wasOutside && stepOverflowMenu) {
      setStepOverflowMenu(false)
    }
  }
  return (
    <>
      <Box id={stepId} {...{ onMouseEnter, onMouseLeave }}>
        <Btn
          onClick={onClick}
          padding={SPACING.spacing12}
          borderRadius={BORDERS.borderRadius8}
          width={formData != null ? '6rem' : '100%'}
          css={css`
            background-color: ${backgroundColor};
            color: ${color};
          `}
        >
          <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
            <Flex
              alignItems={ALIGN_CENTER}
              gridGap={SPACING.spacing8}
              justifyContent={formData != null ? JUSTIFY_CENTER : JUSTIFY_START}
            >
              {iconName && (
                <Icon size="1rem" name={iconName} color={iconColor ?? color} />
              )}
              {formData != null ? null : (
                <StyledText desktopStyle="bodyDefaultRegular">
                  {title}
                </StyledText>
              )}
            </Flex>
            {selected && !isStartingOrEndingState && formData == null ? (
              <OverflowBtn
                data-testid={`StepContainer_${stepId}`}
                color={COLORS.white}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setStepOverflowMenu(prev => !prev)
                  handleOverflowClick(e)
                }}
              />
            ) : null}
          </Flex>
        </Btn>
      </Box>
      {stepOverflowMenu && stepId != null
        ? createPortal(
            <StepOverflowMenu stepId={stepId} menuRoot={menuRoot} top={top} />,
            getTopPortalEl()
          )
        : null}
    </>
  )
}
