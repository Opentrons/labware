import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListButton,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import { ToggleButton } from '../../atoms/ToggleButton'

interface ToggleStepFormFieldProps {
  title: string
  isSelected: boolean
  onLabel: string
  offLabel: string
  toggleUpdateValue: (value: unknown) => void
  toggleValue: unknown
  tooltipContent: string | null
  isDisabled: boolean
}
export function ToggleStepFormField(
  props: ToggleStepFormFieldProps
): JSX.Element {
  const {
    title,
    isSelected,
    onLabel,
    offLabel,
    toggleUpdateValue,
    toggleValue,
    tooltipContent,
    isDisabled,
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()

  return (
    <>
      <ListButton
        type="noActive"
        padding={SPACING.spacing12}
        onClick={() => {
          if (!isDisabled) {
            toggleUpdateValue(!toggleValue)
          }
        }}
        disabled={isDisabled}
      >
        {tooltipContent != null ? (
          <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
        ) : null}

        <Flex width="100%" flexDirection={DIRECTION_COLUMN} {...targetProps}>
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            <StyledText
              desktopStyle="bodyDefaultRegular"
              color={isDisabled ? COLORS.grey40 : COLORS.black90}
            >
              {title}
            </StyledText>
            <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing4}>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={isDisabled ? COLORS.grey40 : COLORS.grey60}
              >
                {isSelected ? onLabel : offLabel}
              </StyledText>
              <ToggleButton
                disabled={isDisabled}
                label={isSelected ? onLabel : offLabel}
                toggledOn={isSelected}
              />
            </Flex>
          </Flex>
        </Flex>
      </ListButton>
    </>
  )
}
