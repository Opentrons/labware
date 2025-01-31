import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Check,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import type { ReactNode } from 'react'

interface CheckboxExpandStepFormFieldProps {
  title: string
  checkboxUpdateValue: (value: unknown) => void
  checkboxValue: unknown
  isChecked: boolean
  children?: ReactNode
  tooltipText?: string | null
  disabled?: boolean
}
export function CheckboxExpandStepFormField(
  props: CheckboxExpandStepFormFieldProps
): JSX.Element {
  const {
    checkboxUpdateValue,
    checkboxValue,
    children,
    isChecked,
    title,
    tooltipText,
    disabled = false,
  } = props

  const [targetProps, tooltipProps] = useHoverTooltip()
  return (
    <>
      <ListItem type={disabled ? 'unavailable' : 'noActive'}>
        <Flex
          padding={SPACING.spacing12}
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
        >
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            <StyledText desktopStyle="bodyDefaultRegular" {...targetProps}>
              {title}
            </StyledText>
            <Btn
              onClick={() => {
                checkboxUpdateValue(!checkboxValue)
              }}
              disabled={disabled}
            >
              <Check
                color={COLORS.blue50}
                isChecked={isChecked}
                disabled={disabled}
              />
            </Btn>
          </Flex>
          {children}
        </Flex>
      </ListItem>
      {tooltipText != null ? (
        <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
      ) : null}
    </>
  )
}
