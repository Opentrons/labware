import { useEffect, useRef, useState } from 'react'
import { Box, Btn, Flex } from '../../primitives'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  NO_WRAP,
  POSITION_RELATIVE,
} from '../../styles'
import { BORDERS, COLORS } from '../../helix-design-system'
import { SPACING } from '../../ui-style-constants'
import { PrimaryButton } from '../../atoms'
import { textDecorationUnderline } from '../../ui-style-constants/typography'

import type { ReactNode } from 'react'
import type { StyleProps } from '../../primitives'

export interface ToolboxProps extends StyleProps {
  title: JSX.Element
  children: ReactNode
  disableCloseButton?: boolean
  confirmButtonText?: string
  onConfirmClick?: () => void
  confirmButton?: JSX.Element
  onCloseClick?: () => void
  closeButton?: JSX.Element
  titlePadding?: string
  childrenPadding?: string
  subHeader?: JSX.Element | null
  secondaryHeaderButton?: JSX.Element
}

export function Toolbox(props: ToolboxProps): JSX.Element {
  const {
    title,
    children,
    confirmButtonText,
    onCloseClick,
    onConfirmClick,
    closeButton,
    height = '100%',
    disableCloseButton = false,
    width = '19.5rem',
    confirmButton,
    titlePadding = SPACING.spacing16,
    childrenPadding = SPACING.spacing16,
    subHeader,
    secondaryHeaderButton,
    position = POSITION_RELATIVE,
    ...styleProps
  } = props

  const slideOutRef = useRef<HTMLDivElement>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false)
  const handleScroll = (): void => {
    if (slideOutRef.current == null) return
    const { scrollTop, scrollHeight, clientHeight } = slideOutRef.current
    if (scrollTop + clientHeight === scrollHeight) {
      setIsScrolledToBottom(true)
    } else {
      setIsScrolledToBottom(false)
    }
  }

  useEffect(() => {
    handleScroll()
  }, [slideOutRef])

  return (
    <Flex
      cursor="auto"
      backgroundColor={COLORS.white}
      boxShadow="0px 3px 6px rgba(0, 0, 0, 0.23)"
      height={height}
      width={width}
      position={position}
      borderRadius={BORDERS.borderRadius8}
      flex="0"
      {...styleProps}
    >
      <Flex
        width={width}
        height="100%"
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <Flex
          padding={titlePadding}
          flexDirection={DIRECTION_COLUMN}
          borderBottom={`1px solid ${COLORS.grey30}`}
        >
          {subHeader ?? null}
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
            gridGap={SPACING.spacing12}
          >
            {title}
            <Flex gridGap={SPACING.spacing4}>
              {secondaryHeaderButton ?? null}
              {onCloseClick != null && closeButton != null ? (
                <Btn
                  disabled={disableCloseButton}
                  onClick={onCloseClick}
                  textDecoration={textDecorationUnderline}
                  data-testid="Toolbox_closeButton"
                  whiteSpace={NO_WRAP}
                >
                  {closeButton}
                </Btn>
              ) : null}
            </Flex>
          </Flex>
        </Flex>
        <Box
          padding={childrenPadding}
          flex="1 1 auto"
          overflowY="auto"
          ref={slideOutRef}
          onScroll={handleScroll}
        >
          {children}
        </Box>
        {(onConfirmClick != null && confirmButtonText != null) ||
        confirmButton != null ? (
          <Box
            padding={SPACING.spacing16}
            boxShadow={isScrolledToBottom ? 'none' : '0px -4px 12px #0000001a'}
            width="100%"
            borderTop={`1px solid ${COLORS.grey30}`}
            alignItems={ALIGN_CENTER}
          >
            {onConfirmClick != null && confirmButtonText != null ? (
              <PrimaryButton
                width="100%"
                data-testid="Toolbox_confirmButton"
                onClick={onConfirmClick}
              >
                {confirmButtonText}
              </PrimaryButton>
            ) : null}
            {confirmButton ?? null}
          </Box>
        ) : null}
      </Flex>
    </Flex>
  )
}
