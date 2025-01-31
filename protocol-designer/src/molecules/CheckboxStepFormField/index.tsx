import {
  Checkbox,
  Flex,
  SPACING,
  TOOLTIP_TOP,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import type { ReactElement, ReactNode } from 'react'
import type { Placement } from '@opentrons/components'
import type { FieldProps } from '../../pages/Designer/ProtocolSteps/StepForm/types'

type CheckboxStepFormFieldProps = FieldProps & {
  children?: ReactElement
  label?: string
  tooltipContent?: ReactNode
  tooltipPlacement?: Placement
}

export function CheckboxStepFormField(
  props: CheckboxStepFormFieldProps
): JSX.Element {
  const {
    disabled,
    isIndeterminate,
    label,
    tooltipContent,
    updateValue,
    value,
    children,
    tooltipPlacement = TOOLTIP_TOP,
    padding = `0 ${SPACING.spacing16}`,
  } = props

  const [targetProps, tooltipProps] = useHoverTooltip({
    placement: tooltipPlacement,
  })
  return (
    <>
      {tooltipContent && (
        <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
      )}
      <Flex gridGap={SPACING.spacing8} padding={padding}>
        <Flex {...targetProps} width="100%">
          <Checkbox
            width="100%"
            type="neutral"
            isChecked={disabled ? false : Boolean(value)}
            onClick={() => {
              updateValue(!value)
            }}
            labelText={label ?? ''}
            disabled={disabled}
          />
        </Flex>
        {value && !disabled && !isIndeterminate ? children : null}
      </Flex>
    </>
  )
}
