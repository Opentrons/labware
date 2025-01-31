import styled, { css } from 'styled-components'

import * as Styles from '../styles'
import { styleProps, isntStyleProp } from './style-props'

import { RESPONSIVENESS } from '../ui-style-constants'

import type { HTMLProps } from 'react'
import type { StyledComponent } from 'styled-components'
import type { StyleProps } from './types'

export const BUTTON_TYPE_SUBMIT: 'submit' = 'submit'
export const BUTTON_TYPE_RESET: 'reset' = 'reset'
export const BUTTON_TYPE_BUTTON: 'button' = 'button'

const BUTTON_BASE_STYLE = css`
  appearance: none;
  padding: 0;
  border-width: 0;
  border-style: solid;
  background-color: transparent;
  cursor: ${Styles.CURSOR_POINTER};

  &:disabled,
  &.disabled {
    cursor: ${Styles.CURSOR_DEFAULT};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${Styles.CURSOR_DEFAULT};
  }
`

const BUTTON_VARIANT_STYLE = css`
  border-color: inherit;
  border-radius: ${Styles.BORDER_RADIUS_DEFAULT};
  display: ${Styles.DISPLAY_INLINE_BLOCK};
  font-size: ${Styles.FONT_SIZE_BODY_2};
  font-weight: ${Styles.FONT_WEIGHT_SEMIBOLD};
  line-height: 1.4;
  padding-left: ${Styles.SPACING_4};
  padding-right: ${Styles.SPACING_4};
  padding-top: ${Styles.SPACING_2};
  padding-bottom: ${Styles.SPACING_2};
  text-align: ${Styles.TEXT_ALIGN_CENTER};
  text-transform: ${Styles.TEXT_TRANSFORM_UPPERCASE};
`

/**
 * Button primitive
 *
 * @component
 */
export const Btn: StyledComponent<
  'button',
  any,
  StyleProps,
  any
> = styled.button
  .withConfig({
    shouldForwardProp: isntStyleProp,
  })
  .attrs((props: HTMLProps<HTMLButtonElement>) => ({
    type: props.type ?? BUTTON_TYPE_BUTTON,
  }))`
  ${BUTTON_BASE_STYLE}
  ${styleProps}
`

/**
 * Primary button variant
 *
 * @component
 */
export const PrimaryBtn = styled(Btn)`
  ${BUTTON_VARIANT_STYLE}
  background-color: ${Styles.C_DARK_GRAY};
  color: ${Styles.C_WHITE};
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.2);

  &:hover,
  &:focus {
    background-color: ${Styles.C_BLACK};
  }

  &:active {
    background-color: ${Styles.C_MED_DARK_GRAY};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_LIGHT_GRAY};
    color: ${Styles.C_MED_GRAY};
    box-shadow: none;
  }

  ${styleProps}
`

/**
 * Secondary button variant
 *
 * @component
 */
export const SecondaryBtn = styled(Btn)`
  ${BUTTON_VARIANT_STYLE}
  background-color: ${Styles.C_WHITE};
  border-width: ${Styles.BORDER_WIDTH_DEFAULT};
  color: ${Styles.C_DARK_GRAY};

  &:hover,
  &:focus {
    background-color: ${Styles.C_LIGHT_GRAY};
  }

  &:active {
    background-color: ${Styles.C_MED_LIGHT_GRAY};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_WHITE};
    color: ${Styles.C_MED_GRAY};
  }

  ${styleProps}
`

/**
 * New primary button variant used in app
 *
 * @component
 */
export const NewPrimaryBtn = styled(PrimaryBtn)`
  background-color: ${Styles.C_BLUE};
  color: ${Styles.C_WHITE};

  &:hover,
  &:focus {
    background-color: ${Styles.C_BLUE};
    box-shadow: 0px 3px 6px 0px rgba(0, 0, 0, 0.23);
  }

  &:active {
    background-color: #004aaa;
    box-shadow: none;
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_FONT_DISABLED};
    color: ${Styles.C_WHITE};
    box-shadow: none;
  }

  ${styleProps}
`

/**
 * New secondary button variant used in app
 *
 * @component
 */
export const NewSecondaryBtn = styled(SecondaryBtn)`
  background-color: ${Styles.C_WHITE};
  color: ${Styles.C_BLUE};

  &:hover,
  &:focus {
    border-width: '2px';
    background-color: ${Styles.C_WHITE};
    color: ${Styles.C_BLUE};
    box-shadow: 0px 3px 6px 0px rgba(0, 0, 0, 0.23);
  }

  &:active {
    border-width: '2px';
    background-color: ${Styles.C_WHITE};
    color: ${Styles.C_BLUE};
    color: #004aaa;
    box-shadow: none;
  }

  &:disabled,
  &.disabled {
    border-width: '2px';
    background-color: ${Styles.C_WHITE};
    color: ${Styles.C_FONT_DISABLED};
    box-shadow: none;
  }

  ${styleProps}
`
/**
 * Red primary button variant used in app
 *
 * @component
 */
export const NewAlertPrimaryBtn = styled(NewPrimaryBtn)`
  background-color: ${Styles.C_ERROR_DARK};

  &:hover,
  &:focus {
    background-color: ${Styles.C_ERROR_DARK};
  }

  &:active {
    background-color: ${Styles.C_ERROR_LIGHT};
  }

  ${styleProps}
`

/**
 * Red secondary button variant used in app
 *
 * @component
 */
export const NewAlertSecondaryBtn = styled(NewSecondaryBtn)`
  color: ${Styles.C_ERROR_DARK};

  &:hover,
  &:focus {
    color: ${Styles.C_ERROR_DARK};
  }

  &:active {
    color: ${Styles.C_ERROR_LIGHT};
  }

  ${styleProps}
`

/**
 * Light secondary button variant
 *
 * @component
 */
export const LightSecondaryBtn = styled(SecondaryBtn)`
  background-color: ${Styles.C_TRANSPARENT};
  color: ${Styles.C_WHITE};

  &:hover,
  &:focus {
    background-color: ${Styles.OVERLAY_WHITE_10};
  }

  &:active {
    background-color: ${Styles.OVERLAY_WHITE_20};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_TRANSPARENT};
    color: ${Styles.C_MED_GRAY};
  }

  ${styleProps}
`

/**
 * Tertiary button variant
 *
 * @component
 */
export const TertiaryBtn = styled(LightSecondaryBtn)`
  border-width: 0;
`
