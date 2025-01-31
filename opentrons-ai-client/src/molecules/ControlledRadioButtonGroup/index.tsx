import {
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { Controller } from 'react-hook-form'

interface ControlledRadioButtonGroupProps {
  id?: string
  name: string
  title?: string
  defaultValue?: string
  rules?: any
  radioButtons: Array<{
    id?: string
    buttonLabel: string
    buttonValue: string
  }>
}

export function ControlledRadioButtonGroup({
  id,
  name,
  title = '',
  defaultValue = '',
  rules,
  radioButtons,
}: ControlledRadioButtonGroupProps): JSX.Element {
  return (
    <Flex id={id} flexDirection={DIRECTION_COLUMN} gap={SPACING.spacing8}>
      {title !== '' && (
        <StyledText color={COLORS.grey60} desktopStyle="bodyDefaultSemiBold">
          {title}
        </StyledText>
      )}
      <Controller
        defaultValue={defaultValue}
        name={name}
        rules={rules}
        render={({ field }) => {
          return (
            <Flex flexDirection={DIRECTION_ROW} gap={SPACING.spacing8}>
              {radioButtons.map((radioButton, index) => (
                <RadioButton
                  key={index}
                  {...radioButton}
                  radioButtonType="small"
                  isSelected={field.value === radioButton.buttonValue}
                  onChange={e => {
                    field.onChange(e)
                  }}
                />
              ))}
            </Flex>
          )
        }}
      />
    </Flex>
  )
}
