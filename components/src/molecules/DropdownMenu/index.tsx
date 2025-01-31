import { Fragment, useEffect, useState } from 'react'
import { css } from 'styled-components'

import { BORDERS, COLORS } from '../../helix-design-system'
import {
  ALIGN_CENTER,
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_AUTO,
  OVERFLOW_HIDDEN,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
} from '../../styles'
import { SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import { Flex } from '../../primitives'
import { Icon } from '../../icons'
import { useHoverTooltip } from '../../tooltips'
import { useOnClickOutside } from '../../interaction-enhancers'
import { LegacyStyledText } from '../../atoms/StyledText/LegacyStyledText'
import { MenuItem } from '../../atoms/MenuList/MenuItem'
import { Tooltip } from '../../atoms/Tooltip'
import { StyledText } from '../../atoms/StyledText'
import { LiquidIcon } from '../LiquidIcon'
import { DeckInfoLabel } from '../DeckInfoLabel'

import type { FocusEventHandler } from 'react'

export interface DropdownOption {
  name: string
  value: string
  /** optional dropdown option for adding the liquid color icon */
  liquidColor?: string
  /** optional dropdown option for adding the deck label */
  deckLabel?: string
  /** subtext below the name */
  subtext?: string
  disabled?: boolean
  tooltipText?: string
}

export type DropdownBorder = 'rounded' | 'neutral'

export interface DropdownMenuProps {
  /** dropdown options */
  filterOptions: DropdownOption[]
  /** click handler */
  onClick: (value: string) => void
  /** current selected option */
  currentOption: DropdownOption
  /** dropdown */
  width?: string
  /** dropdown style type  */
  dropdownType?: DropdownBorder
  /** dropdown title */
  title?: string
  /** dropdown item caption */
  caption?: string | null
  /** text for tooltip */
  tooltipText?: string | null
  /** html tabindex property */
  tabIndex?: number
  /** optional error */
  error?: string | null
  /** focus handler */
  onFocus?: FocusEventHandler<HTMLButtonElement>
  /** blur handler */
  onBlur?: FocusEventHandler<HTMLButtonElement>
  /** optional disabled */
  disabled?: boolean
  /** optional placement of the menu */
  menuPlacement?: 'auto' | 'top' | 'bottom'
  onEnter?: (id: string) => void
  onExit?: () => void
}

// TODO: (smb: 4/15/22) refactor this to use html select for accessibility

export function DropdownMenu(props: DropdownMenuProps): JSX.Element {
  const {
    filterOptions,
    onClick,
    currentOption,
    width = '9.125rem',
    dropdownType = 'rounded',
    title,
    caption,
    tooltipText,
    tabIndex = 0,
    error,
    disabled = false,
    onFocus,
    onBlur,
    onEnter,
    onExit,
    menuPlacement = 'auto',
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()
  const [showDropdownMenu, setShowDropdownMenu] = useState<boolean>(false)
  const [optionTargetProps, optionTooltipProps] = useHoverTooltip({
    placement: 'top-end',
  })

  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>(
    'bottom'
  )
  const dropDownMenuWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowDropdownMenu(false)
    },
  })

  useEffect(() => {
    if (menuPlacement !== 'auto') {
      setDropdownPosition(menuPlacement)
      return
    }

    const handlePositionCalculation = (): void => {
      const dropdownRect = dropDownMenuWrapperRef.current?.getBoundingClientRect()
      if (!dropdownRect) return

      const parentElement = dropDownMenuWrapperRef.current?.parentElement
      const grandParentElement = parentElement?.parentElement?.parentElement

      let availableHeight = window.innerHeight
      let scrollOffset = 0

      if (grandParentElement) {
        const grandParentRect = grandParentElement.getBoundingClientRect()
        availableHeight = grandParentRect.bottom - grandParentRect.top
        scrollOffset = grandParentRect.top
      } else if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect()
        availableHeight = parentRect.bottom - parentRect.top
        scrollOffset = parentRect.top
      }

      const dropdownHeight = filterOptions.length * 34 + 10 // note (kk:2024/12/06) need to modify the value since design uses different height in desktop and pd
      const dropdownBottom = dropdownRect.bottom + dropdownHeight - scrollOffset

      const fitsBelow = dropdownBottom <= availableHeight
      const fitsAbove = dropdownRect.top - dropdownHeight >= scrollOffset

      if (menuPlacement === 'auto') {
        setDropdownPosition(fitsBelow ? 'bottom' : fitsAbove ? 'top' : 'bottom')
      } else {
        setDropdownPosition(menuPlacement)
      }
    }

    window.addEventListener('resize', handlePositionCalculation)
    window.addEventListener('scroll', handlePositionCalculation)
    handlePositionCalculation()

    return () => {
      window.removeEventListener('resize', handlePositionCalculation)
      window.removeEventListener('scroll', handlePositionCalculation)
    }
  }, [filterOptions.length, dropDownMenuWrapperRef])

  const toggleSetShowDropdownMenu = (): void => {
    if (!isDisabled) {
      setShowDropdownMenu(!showDropdownMenu)
    }
  }

  const isDisabled = filterOptions.length === 0

  let defaultBorderColor = COLORS.grey50
  let hoverBorderColor = COLORS.grey55
  if (showDropdownMenu) {
    defaultBorderColor = COLORS.blue50
    hoverBorderColor = COLORS.blue50
  } else if (error) {
    defaultBorderColor = COLORS.red50
    hoverBorderColor = COLORS.red50
  }

  const DROPDOWN_STYLE = css`
    flex-direction: ${DIRECTION_ROW};
    color: ${disabled ? COLORS.grey40 : COLORS.black90};
    background-color: ${COLORS.white};
    cursor: ${isDisabled ? CURSOR_DEFAULT : CURSOR_POINTER};
    padding: ${SPACING.spacing8} ${SPACING.spacing12};
    border: 1px ${BORDERS.styleSolid}
      ${disabled ? COLORS.grey35 : defaultBorderColor};
    border-radius: ${dropdownType === 'rounded'
      ? BORDERS.borderRadiusFull
      : BORDERS.borderRadius4};
    align-items: ${ALIGN_CENTER};
    justify-content: ${JUSTIFY_SPACE_BETWEEN};
    width: ${width};
    height: 2.25rem;

    &:hover {
      border: 1px ${BORDERS.styleSolid}
        ${disabled ? COLORS.grey35 : hoverBorderColor};
    }

    &:active {
      border: 1px ${BORDERS.styleSolid} ${error ? COLORS.red50 : COLORS.blue50};
    }

    &:focus-visible {
      border: 1px ${BORDERS.styleSolid} ${COLORS.grey55};
      outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
      outline-offset: 2px;
    }
  `
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      ref={dropDownMenuWrapperRef}
      gridGap={SPACING.spacing8}
      width={width}
    >
      {title !== null ? (
        <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
          <StyledText
            desktopStyle="bodyDefaultRegular"
            color={disabled ? COLORS.grey35 : COLORS.grey60}
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
                  data-testid="information_icon"
                />
              </Flex>
              <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
            </>
          ) : null}
        </Flex>
      ) : null}
      <Flex flexDirection={DIRECTION_COLUMN} position={POSITION_RELATIVE}>
        <Flex
          onClick={(e: MouseEvent) => {
            e.preventDefault()
            toggleSetShowDropdownMenu()
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          css={DROPDOWN_STYLE}
          tabIndex={tabIndex}
        >
          <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
            {currentOption.liquidColor != null ? (
              <LiquidIcon color={currentOption.liquidColor} />
            ) : null}
            {currentOption.deckLabel != null ? (
              <DeckInfoLabel deckLabel={currentOption.deckLabel} svgSize={13} />
            ) : null}
            <Flex
              flexDirection={DIRECTION_COLUMN}
              css={css`
                font-weight: ${dropdownType === 'rounded'
                  ? TYPOGRAPHY.pSemiBold
                  : TYPOGRAPHY.pRegular};
              `}
            >
              <StyledText
                desktopStyle="captionRegular"
                css={LINE_CLAMP_TEXT_STYLE}
              >
                {currentOption.name}
              </StyledText>
            </Flex>
          </Flex>
          {showDropdownMenu ? (
            <Icon size="0.75rem" name="menu-down" transform="rotate(180deg)" />
          ) : (
            <Icon size="0.75rem" name="menu-down" />
          )}
        </Flex>
        {showDropdownMenu && (
          <Flex
            zIndex={3}
            borderRadius={BORDERS.borderRadius8}
            boxShadow={BORDERS.tinyDropShadow}
            position={POSITION_ABSOLUTE}
            backgroundColor={COLORS.white}
            flexDirection={DIRECTION_COLUMN}
            width={width}
            top={dropdownPosition === 'bottom' ? '2.5rem' : undefined}
            bottom={dropdownPosition === 'top' ? '2.5rem' : undefined}
            overflowY={OVERFLOW_AUTO}
            maxHeight="20rem" // Set the maximum display number to 10.
          >
            {filterOptions.map((option, index) => (
              <Fragment key={`${option.name}-${index}`}>
                <MenuItem
                  disabled={option.disabled}
                  zIndex={3}
                  key={`${option.name}-${index}`}
                  onClick={() => {
                    onClick(option.value)
                    setShowDropdownMenu(false)
                  }}
                  border="none"
                  onMouseEnter={() => onEnter?.(option.value)}
                  onMouseLeave={onExit}
                >
                  <Flex
                    gridGap={SPACING.spacing8}
                    alignItems={ALIGN_CENTER}
                    {...optionTargetProps}
                  >
                    {option.liquidColor != null ? (
                      <LiquidIcon color={option.liquidColor} />
                    ) : null}
                    {option.deckLabel != null ? (
                      <DeckInfoLabel
                        deckLabel={option.deckLabel}
                        svgSize={13}
                      />
                    ) : null}
                    <Flex
                      flexDirection={DIRECTION_COLUMN}
                      gridGap={option.subtext != null ? SPACING.spacing4 : '0'}
                    >
                      <StyledText desktopStyle="captionRegular">
                        {option.name}
                      </StyledText>
                      <StyledText
                        desktopStyle="captionRegular"
                        color={COLORS.black70}
                      >
                        {option.subtext}
                      </StyledText>
                    </Flex>
                  </Flex>
                </MenuItem>
                {option.tooltipText != null ? (
                  <Tooltip tooltipProps={optionTooltipProps}>
                    {option.tooltipText}
                  </Tooltip>
                ) : null}
              </Fragment>
            ))}
          </Flex>
        )}
      </Flex>
      {caption != null ? (
        <LegacyStyledText as="label" color={COLORS.grey60}>
          {caption}
        </LegacyStyledText>
      ) : null}
      {error != null ? (
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.red50}>
          {error}
        </StyledText>
      ) : null}
    </Flex>
  )
}

const LINE_CLAMP_TEXT_STYLE = css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: ${OVERFLOW_HIDDEN};
  text-overflow: ellipsis;
  word-wrap: break-word;
  -webkit-line-clamp: 1;
  word-break: break-all;
`
