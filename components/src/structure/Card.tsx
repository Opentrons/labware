// Card component with drop shadow
import styled, { css } from 'styled-components'
import { isntStyleProp, styleProps } from '../primitives'
import * as styles from '../styles'

import type { ReactNode } from 'react'
import type { StyleProps, PrimitiveComponent } from '../primitives'
export interface CardProps extends StyleProps {
  /** Title for card, all cards should receive a title. */
  title?: ReactNode
  /** Card contents */
  children?: ReactNode
  /** If card can not be used, gray it out and remove pointer events */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Renders a basic card element with a white background, dropshadow, and zero padding.
 *
 * Titles and other children handle their own styles and layout.
 */
export function Card(props: CardProps): JSX.Element {
  const { title, children, className, disabled, ...styleProps } = props

  return (
    <Section disabled={disabled} className={className} {...styleProps}>
      {title && <Title className={className}>{title}</Title>}
      {children}
    </Section>
  )
}

const Section: PrimitiveComponent<'section'> = styled.section.withConfig({
  shouldForwardProp: isntStyleProp,
})`
  font-size: ${styles.FONT_SIZE_BODY_2};
  position: relative;
  overflow: visible;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.33);
  ${({ disabled }) =>
    disabled &&
    css`
      pointer-events: none;
      background-color: transparent;

      & * {
        color: ${styles.C_FONT_DISABLED};
        fill: ${styles.C_FONT_DISABLED};
        background-color: transparent;
      }
    `}
  ${styleProps}
`

const Title = styled.h3`
  ${styles.FONT_HEADER_DARK}
  font-weight: ${styles.FONT_WEIGHT_REGULAR};
  margin: 0;
  padding: ${styles.SPACING_3} ${styles.SPACING_3} 0;
  text-transform: capitalize;
`
