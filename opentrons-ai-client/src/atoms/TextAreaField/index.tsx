import {
  TYPOGRAPHY,
  useHoverTooltip,
  RESPONSIVENESS,
  SPACING,
  COLORS,
  BORDERS,
  Flex,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  StyledText,
  Icon,
  Tooltip,
  TEXT_ALIGN_RIGHT,
} from '@opentrons/components'
import type { IconName } from '@opentrons/components'
import * as React from 'react'
import styled, { css } from 'styled-components'

export const INPUT_TYPE_NUMBER = 'number' as const
export const LEGACY_INPUT_TYPE_TEXT = 'text' as const
export const LEGACY_INPUT_TYPE_PASSWORD = 'password' as const
const COLOR_WARNING_DARK = '#9e5e00' // ToDo (kk:08/13/2024) replace this with COLORS

export interface TextAreaFieldProps {
  /** field is disabled if value is true */
  disabled?: boolean
  /** change handler */
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
  /** name of field in form */
  name?: string
  /** optional ID of <textarea> element */
  id?: string
  /** placeholder text */
  placeholder?: string
  /** optional suffix component, appears to the right of textarea text */
  units?: React.ReactNode
  /** current value of text in box, defaults to '' */
  value?: string | number | null
  /** if included, TextAreaField will use error style and display error instead of caption */
  error?: string | null
  /** optional title */
  title?: string | null
  /** optional text for tooltip */
  tooltipText?: string
  /** optional caption. hidden when `error` is given */
  caption?: string | null
  /** mouse click handler */
  onClick?: (event: React.MouseEvent<HTMLTextAreaElement>) => unknown
  /** focus handler */
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => unknown
  /** blur handler */
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => unknown
  /** makes textarea field read-only */
  readOnly?: boolean
  /** html tabindex property */
  tabIndex?: number
  /** automatically focus field on renders */
  autoFocus?: boolean
  /** if true, clear out value and add '-' placeholder */
  isIndeterminate?: boolean
  /** if textarea type is number, these are the min and max values */
  max?: number
  min?: number
  /** horizontal text alignment for title, textarea, and (sub)captions */
  textAlign?:
    | typeof TYPOGRAPHY.textAlignLeft
    | typeof TYPOGRAPHY.textAlignCenter
  /** react useRef to control textarea field instead of react event */
  ref?: React.MutableRefObject<HTMLTextAreaElement | null>
  /** optional IconName to display icon aligned to left of textarea field */
  leftIcon?: IconName
  /** if true, show delete icon aligned to right of textarea field */
  showDeleteIcon?: boolean
  /** callback passed to optional delete icon onClick */
  onDelete?: () => void
  /** if true, style the background of textarea field to error state */
  hasBackgroundError?: boolean
  /** optional prop to override textarea field border radius */
  borderRadius?: string
  /** optional prop to override textarea field padding */
  padding?: string
  /** optional prop to override textarea field height */
  height?: string
}

export const TextAreaField = React.forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(
  (props, ref): JSX.Element => {
    const {
      placeholder,
      textAlign = TYPOGRAPHY.textAlignLeft,
      title,
      tooltipText,
      tabIndex = 0,
      showDeleteIcon = false,
      hasBackgroundError = false,
      onDelete,
      borderRadius,
      padding,
      height,
      ...textAreaProps
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

    const TEXTAREA_FIELD = css`
      display: flex;
      background-color: ${hasBackgroundError ? COLORS.red30 : COLORS.white};
      border-radius: ${borderRadius ?? BORDERS.borderRadius4};
      padding: ${padding ?? SPACING.spacing8};
      border: ${hasBackgroundError
        ? 'none'
        : `1px ${BORDERS.styleSolid}
        ${hasError ? COLORS.red50 : COLORS.grey50}`};
      font-size: ${TYPOGRAPHY.fontSizeP};
      width: 100%;
      height: ${height};

      &:active:enabled {
        border: 1px ${BORDERS.styleSolid} ${COLORS.blue50};
      }

      & textarea {
        border-radius: inherit;
        color: ${COLORS.black90};
        border: none;
        flex: 1 1 auto;
        width: 100%;
        height: ${SPACING.spacing16};
        text-align: ${textAlign};
      }
      & textarea:focus {
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
      textarea[type='number']::-webkit-inner-spin-button,
      textarea[type='number']::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
        padding: ${SPACING.spacing16} ${SPACING.spacing24};
        border: 2px ${BORDERS.styleSolid}
          ${hasError ? COLORS.red50 : COLORS.grey50};

        &:focus-within {
          box-shadow: none;
          border: ${hasError ? '2px' : '3px'} ${BORDERS.styleSolid}
            ${hasError ? COLORS.red50 : COLORS.blue50};
        }

        & textarea {
          color: ${COLORS.black90};
          flex: 1 1 auto;
          width: 100%;
          height: 100%;
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
              <StyledTextArea
                {...textAreaProps}
                css={TEXTAREA_FIELD}
                data-testid={props.id}
                value={value}
                placeholder={placeHolder}
                onWheel={event => {
                  event.currentTarget.blur()
                }} // prevent value change with scrolling
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

const StyledTextArea = styled.textarea`
  background-color: transparent;
  width: 100%;
  min-height: 3.75rem;
  resize: vertical;
  white-space: pre-wrap;
  &::placeholder {
    color: ${COLORS.grey40};
  }
`
