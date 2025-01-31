import type { StepFieldName, FormData } from '../../../form-types'

export interface FocusHandlers {
  focusedField: StepFieldName | null
  dirtyFields: StepFieldName[]
  // NOTE: focus & blur take a field name as an arg, unlike onFieldBlur/onFieldFocus in FieldProps
  focus: (arg0: StepFieldName) => void
  blur: (arg0: StepFieldName) => void
}
export interface FieldProps {
  disabled: boolean
  errorToShow?: string | null
  isIndeterminate?: boolean
  name: string
  onFieldBlur: () => unknown
  onFieldFocus: () => unknown
  tooltipContent?: string | null
  updateValue: (arg0: unknown) => void
  value: unknown
}
export type FieldPropsByName = Record<StepFieldName, FieldProps>
// Shared props across all step forms
export interface StepFormProps {
  formData: FormData
  focusHandlers: FocusHandlers
  propsForFields: FieldPropsByName
}
