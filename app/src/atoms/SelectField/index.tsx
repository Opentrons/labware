import find from 'lodash/find'
import { Select } from './Select'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { css } from 'styled-components'

import type { ReactNode } from 'react'
import type { SelectProps, SelectOption } from './Select'
import type { ActionMeta, MultiValue, SingleValue } from 'react-select'

export interface SelectFieldProps {
  /** optional HTML id for container */
  id?: SelectProps['id']
  /** field name */
  name: NonNullable<SelectProps['name']>
  /** react-Select option, usually label, value */
  options: NonNullable<SelectProps['options']>
  /** currently selected value */
  value: string | null
  /** disable the select */
  disabled?: SelectProps['isDisabled']
  /** optional placeholder  */
  placeholder?: SelectProps['placeholder']
  /** menuPosition prop to send to react-select */
  menuPosition?: SelectProps['menuPosition']
  /** render function for the option label passed to react-select */
  formatOptionLabel?: SelectProps['formatOptionLabel']
  /** optional title */
  title?: ReactNode
  /** optional caption. hidden when `error` is given */
  caption?: ReactNode
  /** if included, use error style and display error instead of caption */
  error?: string | null
  /** change handler called with (name, value, actionMeta) */
  onValueChange?: (
    name: string,
    value: string,
    actionMeta: ActionMeta<SelectOption>
  ) => void
  /** blur handler called with (name) */
  onLoseFocus?: (name: string) => void
  /** optional prop to make select not searchable through typing into the search field  */
  isSearchable?: boolean
  /** optional width to specify the width of the select field and dropdown menu */
  width?: string
  dropdownType?: 'rounded' | 'neutral'
}

const CAPTION_STYLE = css`
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  padding-top: ${SPACING.spacing4};
  &.error {
    color: ${COLORS.red50};
    font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  }
`

export function SelectField(props: SelectFieldProps): JSX.Element {
  const {
    id,
    name,
    options,
    disabled,
    placeholder,
    menuPosition,
    formatOptionLabel,
    error,
    onValueChange,
    onLoseFocus,
    isSearchable = true,
    width,
    title,
    dropdownType = 'rounded',
  } = props
  const allOptions = options.flatMap(og =>
    'options' in og ? og.options : [og]
  )
  const value = find(allOptions, opt => opt.value === props.value) || null
  const caption = error != null || props.caption

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      {title != null ? (
        <LegacyStyledText
          as="label"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          paddingBottom={SPACING.spacing8}
        >
          {title}
        </LegacyStyledText>
      ) : null}
      <Select
        id={id}
        name={name}
        options={options}
        value={value}
        isDisabled={disabled}
        placeholder={placeholder}
        isSearchable={isSearchable}
        menuPosition={menuPosition}
        width={width}
        dropdownType={dropdownType}
        tabIndex={2}
        formatOptionLabel={formatOptionLabel}
        onChange={(
          opt: SingleValue<SelectOption> | MultiValue<SelectOption>,
          e: ActionMeta<SelectOption>
        ) => {
          const value = (opt as SelectOption).value
          onValueChange?.(name, value, e)
        }}
        onBlur={() => onLoseFocus?.(name)}
      />
      {caption != null && <Flex css={CAPTION_STYLE}>{caption}</Flex>}
    </Flex>
  )
}
