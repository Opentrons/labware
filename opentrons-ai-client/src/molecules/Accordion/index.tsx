import { useRef } from 'react'
import styled from 'styled-components'
import {
  Icon,
  StyledText,
  COLORS,
  BORDERS,
  DIRECTION_COLUMN,
  SIZE_AUTO,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  CURSOR_POINTER,
  TEXT_ALIGN_LEFT,
  DISPLAY_FLEX,
  CURSOR_DEFAULT,
} from '@opentrons/components'

interface AccordionProps {
  id?: string
  handleClick: () => void
  isOpen?: boolean
  isCompleted?: boolean
  disabled?: boolean
  heading?: string
  children: React.ReactNode
}

const ACCORDION = 'accordion'
const BUTTON = 'button'
const CONTENT = 'content'
const OT_CHECK = 'ot-check'

export function Accordion({
  id = ACCORDION,
  handleClick,
  isOpen = false,
  isCompleted = false,
  disabled = false,
  heading = '',
  children,
}: AccordionProps): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleContainerClick = (e: React.MouseEvent): void => {
    if (
      (e.target as HTMLElement).tagName !== 'BUTTON' &&
      !disabled &&
      !isOpen
    ) {
      handleClick()
    }
  }

  const handleButtonClick = (e: React.MouseEvent): void => {
    if (!isOpen && !disabled) {
      e.stopPropagation()
      handleClick()
    }
  }

  return (
    <AccordionContainer
      id={id}
      onClick={handleContainerClick}
      isOpen={isOpen}
      disabled={disabled}
    >
      <AccordionButton
        id={`${id}-${BUTTON}`}
        aria-expanded={isOpen}
        aria-controls={`${id}-${CONTENT}`}
        isOpen={isOpen}
        onClick={handleButtonClick}
        disabled={disabled}
      >
        <HeadingText desktopStyle="headingSmallBold">{heading}</HeadingText>
        {isCompleted && (
          <Icon
            name={OT_CHECK}
            color={COLORS.green50}
            size="1.25rem"
            data-testid={`${id}-${OT_CHECK}`}
          />
        )}
      </AccordionButton>
      <AccordionContent
        id={`${id}-${CONTENT}`}
        role="region"
        aria-labelledby={`${id}-${BUTTON}`}
        isOpen={isOpen}
        ref={contentRef}
      >
        {children}
      </AccordionContent>
    </AccordionContainer>
  )
}

const AccordionContainer = styled.div<{
  isOpen: boolean
  disabled: boolean
}>`
  display: ${DISPLAY_FLEX};
  flex-direction: ${DIRECTION_COLUMN};
  width: 100%;
  height: ${SIZE_AUTO};
  padding: ${SPACING.spacing24} ${SPACING.spacing32};
  border-radius: ${BORDERS.borderRadius16};
  background-color: ${COLORS.white};
  cursor: ${props =>
    props.isOpen || props.disabled ? `${CURSOR_DEFAULT}` : `${CURSOR_POINTER}`};
`

const AccordionButton = styled.button<{ isOpen: boolean; disabled: boolean }>`
  display: ${DISPLAY_FLEX};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  width: 100%;
  background: none;
  border: none;
  cursor: ${props =>
    props.isOpen || props.disabled ? `${CURSOR_DEFAULT}` : `${CURSOR_POINTER}`};
  text-align: ${TEXT_ALIGN_LEFT};

  &:focus-visible {
    outline: 2px solid ${COLORS.blue50};
  }
`

const HeadingText = styled(StyledText)`
  flex: 1;
  margin-right: ${SPACING.spacing8};
`

const AccordionContent = styled.div<{
  id: string
  isOpen: boolean
}>`
  max-height: ${props => (props.isOpen ? `auto` : '0')};
  margin-top: ${props => (props.isOpen ? `${SPACING.spacing16}` : '0')};
  pointer-events: ${props => (props.isOpen ? 'auto' : 'none')};
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
`
