import { forwardRef } from 'react'
import styled, { css } from 'styled-components'

import { Flex } from '../../primitives'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  NO_WRAP,
  TEXT_ALIGN_RIGHT,
} from '../../styles'
import { BORDERS, COLORS } from '../../helix-design-system'
import { Icon } from '../../icons'
import { RESPONSIVENESS, SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import { Tooltip } from '../Tooltip'
import { useHoverTooltip } from '../../tooltips'
import { StyledText } from '../StyledText'

import type {
  ChangeEventHandler,
  FocusEvent,
  MouseEvent,
  MutableRefObject,
  ReactNode,
} from 'react'
import type { IconName } from '../../icons'

export const INPUT_TYPE_NUMBER = 'number' as const
export const LEGACY_INPUT_TYPE_TEXT = 'text' as const
export const LEGACY_INPUT_TYPE_PASSWORD = 'password' as const
const COLOR_WARNING_DARK = '#9e5e00' // ToDo (kk:08/13/2024) replace this with COLORS

export interface InputFieldProps {
  /** field is disabled if value is true */
  disabled?: boolean
  /** change handler */
  onChange?: ChangeEventHandler<HTMLInputElement>
  /** name of field in form */
  name?: string
  /** optional ID of <input> element */
  id?: string
  /** placeholder text */
  placeholder?: string
  /** optional suffix component, appears to the right of input text */
  units?: ReactNode
  /** current value of text in box, defaults to '' */
  value?: string | number | null
  /** if included, InputField will use error style and display error instead of caption */
  error?: string | null
  /** optional title */
  title?: string | null
  /** optional text for tooltip */
  tooltipText?: string
  /** optional caption. hidden when `error` is given */
  caption?: string | null
  /** optional input type (default "text") */
  type?:
    | typeof LEGACY_INPUT_TYPE_TEXT
    | typeof LEGACY_INPUT_TYPE_PASSWORD
    | typeof INPUT_TYPE_NUMBER
  /** mouse click handler */
  onClick?: (event: MouseEvent<HTMLInputElement>) => unknown
  /** focus handler */
  onFocus?: (event: FocusEvent<HTMLInputElement>) => unknown
  /** blur handler */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => unknown
  /** makes input field read-only */
  readOnly?: boolean
  /** html tabindex property */
  tabIndex?: number
  /** automatically focus field on renders */
  autoFocus?: boolean
  /** if true, clear out value and add '-' placeholder */
  isIndeterminate?: boolean
  /** if input type is number, these are the min and max values */
  max?: number | string
  min?: number | string
  /** horizontal text alignment for title, input, and (sub)captions */
  textAlign?:
    | typeof TYPOGRAPHY.textAlignLeft
    | typeof TYPOGRAPHY.textAlignCenter
  /** small or medium input field height, relevant only */
  size?: 'medium' | 'small'
  /** react useRef to control input field instead of react event */
  ref?: MutableRefObject<HTMLInputElement | null>
  /** optional IconName to display icon aligned to left of input field */
  leftIcon?: IconName
  /** if true, show delete icon aligned to right of input field */
  showDeleteIcon?: boolean
  /** callback passed to optional delete icon onClick */
  onDelete?: () => void
  /** if true, style the background of input field to error state */
  hasBackgroundError?: boolean
  /** optional prop to override input field border radius */
  borderRadius?: string
  /** optional prop to override input field padding */
  padding?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (props, ref): JSX.Element => {
    const {
      placeholder,
      textAlign = TYPOGRAPHY.textAlignLeft,
      size = 'small',
      title,
      tooltipText,
      tabIndex = 0,
      showDeleteIcon = false,
      hasBackgroundError = false,
      onDelete,
      borderRadius,
      padding,
      ...inputProps
    } = props
    const hasError = props.error != null
    const value = props.isIndeterminate ?? false ? '' : props.value ?? ''
    const placeHolder = props.isIndeterminate ?? false ? '-' : props.placeholder
    const [targetProps, tooltipProps] = useHoverTooltip()

    const OUTER_CSS = css`
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        grid-gap: ${SPACING.spacing8};
        &:focus-within {
          filter: ${hasError
            ? 'none'
            : `drop-shadow(0px 0px 10px ${COLORS.blue50})`};
        }
      }
    `

    const INPUT_FIELD = css`
      display: flex;
      background-color: ${hasBackgroundError ? COLORS.red30 : COLORS.white};
      border-radius: ${borderRadius != null
        ? borderRadius
        : BORDERS.borderRadius4};
      padding: ${padding != null ? padding : SPACING.spacing8};
      border: ${hasBackgroundError
        ? 'none'
        : `1px ${BORDERS.styleSolid}
        ${hasError ? COLORS.red50 : COLORS.grey50}`};
      font-size: ${TYPOGRAPHY.fontSizeP};
      width: 100%;
      height: ${size === 'small' ? '2rem' : '2.75rem'};

      &:active:enabled {
        border: 1px ${BORDERS.styleSolid} ${COLORS.blue50};
      }

      & input {
        border-radius: inherit;
        color: ${COLORS.black90};
        border: none;
        flex: 1 1 auto;
        width: 100%;
        height: ${SPACING.spacing16};
        text-align: ${textAlign};
      }
      & input:focus {
        outline: none;
      }

      &:hover {
        border: 1px ${BORDERS.styleSolid}
          ${hasError ? COLORS.red50 : COLORS.grey60};
      }

      &:focus-visible {
        border: 1px ${BORDERS.styleSolid} ${COLORS.grey55};
        outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
        outline-offset: 2px;
      }

      &:focus-within {
        border: 1px ${BORDERS.styleSolid}
          ${hasError ? COLORS.red50 : COLORS.blue50};
      }

      &:disabled {
        border: 1px ${BORDERS.styleSolid} ${COLORS.grey30};
      }
      input[type='number']::-webkit-inner-spin-button,
      input[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        height: ${size === 'small' ? '4.25rem' : '5rem'};
        font-size: ${size === 'small'
          ? TYPOGRAPHY.fontSize28
          : TYPOGRAPHY.fontSize38};
        padding: ${SPACING.spacing16} ${SPACING.spacing24};
        border: 2px ${BORDERS.styleSolid}
          ${hasError ? COLORS.red50 : COLORS.grey50};

        &:focus-within {
          box-shadow: none;
          border: ${hasError ? '2px' : '3px'} ${BORDERS.styleSolid}
            ${hasError ? COLORS.red50 : COLORS.blue50};
        }

        & input {
          color: ${COLORS.black90};
          flex: 1 1 auto;
          width: 100%;
          height: 100%;
          font-size: ${size === 'small'
            ? TYPOGRAPHY.fontSize28
            : TYPOGRAPHY.fontSize38};
          line-height: ${size === 'small'
            ? TYPOGRAPHY.lineHeight36
            : TYPOGRAPHY.lineHeight48};
        }

        /* the size of dot for password is handled by font-size */
        input[type='password'] {
          font-size: ${size === 'small' ? '71px' : '77px'};
        }
      }
    `

    const FORM_BOTTOM_SPACE_STYLE = css`
      padding-top: ${SPACING.spacing4};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        padding: ${SPACING.spacing8} 0rem;
        padding-bottom: 0;
      }
    `

    const TITLE_STYLE = css`
      color: ${COLORS.grey60};
      padding-bottom: ${SPACING.spacing4};
      text-align: ${textAlign};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        font-size: ${TYPOGRAPHY.fontSize22};
        font-weight: ${TYPOGRAPHY.fontWeightRegular};
        line-height: ${TYPOGRAPHY.lineHeight28};
        justify-content: ${textAlign};
      }
    `

    const ERROR_TEXT_STYLE = css`
      color: ${COLORS.red50};
      padding-top: ${SPACING.spacing4};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        font-size: ${TYPOGRAPHY.fontSize22};
        color: ${COLORS.red50};
        padding-top: ${SPACING.spacing8};
      }
    `

    const UNITS_STYLE = css`
      color: ${props.disabled ? COLORS.grey40 : COLORS.grey50};
      font: ${TYPOGRAPHY.bodyTextRegular};
      text-align: ${TYPOGRAPHY.textAlignRight};
      white-space: ${NO_WRAP};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        color: ${props.disabled ? COLORS.grey40 : COLORS.grey50};
        font-size: ${TYPOGRAPHY.fontSize22};
        font-weight: ${TYPOGRAPHY.fontWeightRegular};
        line-height: ${TYPOGRAPHY.lineHeight28};
        justify-content: ${textAlign};
      }
    `

    return (
      <Flex
        width="100%"
        alignItems={ALIGN_CENTER}
        lineHeight={1}
        fontSize={TYPOGRAPHY.fontSizeP}
        fontWeight={TYPOGRAPHY.fontWeightRegular}
        color={props.error != null ? COLOR_WARNING_DARK : COLORS.black90}
        opacity={props.disabled ?? false ? 0.5 : ''}
      >
        <Flex flexDirection={DIRECTION_COLUMN} width="100%">
          {title != null ? (
            <Flex
              flexDirection={DIRECTION_ROW}
              gridGap={SPACING.spacing8}
              alignItems={ALIGN_CENTER}
            >
              <StyledText
                desktopStyle="bodyDefaultRegular"
                htmlFor={props.id}
                css={TITLE_STYLE}
              >
                {title}
              </StyledText>
              {tooltipText != null ? (
                <>
                  <Flex {...targetProps}>
                    <Icon
                      name="information"
                      size={SPACING.spacing12}
                      color={COLORS.grey60}
                    />
                  </Flex>
                  <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
                </>
              ) : null}
            </Flex>
          ) : null}
          <Flex
            width="100%"
            flexDirection={DIRECTION_COLUMN}
            css={OUTER_CSS}
            onClick={!props.disabled ? props.onClick : null}
          >
            <Flex
              tabIndex={tabIndex}
              css={INPUT_FIELD}
              alignItems={ALIGN_CENTER}
              onClick={() => {
                if (props.id != null) {
                  document.getElementById(props.id)?.focus()
                }
              }}
            >
              {props.leftIcon != null ? (
                <Flex marginRight={SPACING.spacing8}>
                  <Icon
                    name={props.leftIcon}
                    color={COLORS.grey60}
                    size="1.25rem"
                  />
                </Flex>
              ) : null}
              <StyledInput
                {...inputProps}
                data-testid={props.id}
                value={value}
                placeholder={placeHolder}
                onWheel={event => {
                  event.currentTarget.blur()
                }} // prevent value change with scrolling
                type={props.type}
                ref={ref}
              />
              {props.units != null ? (
                <Flex css={UNITS_STYLE}>{props.units}</Flex>
              ) : null}
              {showDeleteIcon ? (
                <Flex
                  alignSelf={TEXT_ALIGN_RIGHT}
                  onClick={onDelete}
                  cursor="pointer"
                >
                  <Icon name="close" size="1.75rem" />
                </Flex>
              ) : null}
            </Flex>
          </Flex>
          {props.caption != null ? (
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={FORM_BOTTOM_SPACE_STYLE}
              color={COLORS.grey60}
            >
              {props.caption}
            </StyledText>
          ) : null}
          {hasError ? (
            <StyledText
              desktopStyle="bodyDefaultRegular"
              css={ERROR_TEXT_STYLE}
            >
              {props.error}
            </StyledText>
          ) : null}
        </Flex>
      </Flex>
    )
  }
)

const StyledInput = styled.input`
  background-color: transparent;
  &::placeholder {
    color: ${COLORS.grey40};
  }
`
