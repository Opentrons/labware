import { Controller } from 'react-hook-form'
import {
  CheckboxField,
  DIRECTION_COLUMN,
  Flex,
  FormGroup,
  InputField,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import styles from './styles.module.css'

import type { ReactNode } from 'react'
import type { Control } from 'react-hook-form'
import type { DisplayFieldProps, DisplayQuirkFieldProps } from './ConfigForm'

export interface FormColumnProps {
  children: ReactNode
}

export function FormColumn(props: FormColumnProps): JSX.Element {
  return <div className={styles.form_column}>{props.children}</div>
}

export interface FormValues {
  [key: string]: (string | boolean) | null | undefined
}

export interface ConfigFormGroupProps {
  groupLabel: string
  groupError?: string | null | undefined
  formFields: DisplayFieldProps[]
  control: Control<FormValues, any>
}

export function ConfigFormGroup(props: ConfigFormGroupProps): JSX.Element {
  const { groupLabel, groupError, formFields, control } = props
  const formattedError =
    groupError &&
    groupError.split('\n').map(function (item, key) {
      return (
        <span key={key}>
          {item}
          <br />
        </span>
      )
    })
  return (
    <FormGroup
      label={groupLabel}
      className={styles.form_group}
      isPipetteSettingsSlideout={true}
    >
      {groupError && <p className={styles.group_error}>{formattedError}</p>}
      {formFields.map((field, index) => {
        return (
          <ConfigInput displayField={field} key={index} control={control} />
        )
      })}
    </FormGroup>
  )
}

export interface ConfigFormRowProps {
  label: string
  labelFor: string
  children: ReactNode
}

const FIELD_ID_PREFIX = '__PipetteConfig__'
const makeId = (name: string): string => `${FIELD_ID_PREFIX}.${name}`

export function ConfigFormRow(props: ConfigFormRowProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      paddingTop={SPACING.spacing4}
      paddingBottom={SPACING.spacing4}
    >
      <LegacyStyledText
        as="label"
        id={props.labelFor}
        paddingBottom={SPACING.spacing8}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
      >
        {props.label}
      </LegacyStyledText>
      {props.children}
    </Flex>
  )
}

export interface ConfigInputProps {
  displayField: DisplayFieldProps
  control: Control<FormValues, any>
}

export function ConfigInput(props: ConfigInputProps): JSX.Element {
  const { displayField, control } = props
  const { name, units, displayName } = displayField
  const id = makeId(name)
  const _default = displayField.default.toString()

  return (
    <ConfigFormRow label={displayName} labelFor={id}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <InputField
            placeholder={_default}
            name={field.name}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            {...{
              units,
            }}
          />
        )}
      />
    </ConfigFormRow>
  )
}

export interface ConfigCheckboxProps {
  displayQuirkField: DisplayQuirkFieldProps
  control: Control<FormValues, any>
}

export function ConfigCheckbox(props: ConfigCheckboxProps): JSX.Element {
  const { displayQuirkField, control } = props
  const { name, displayName } = displayQuirkField
  const id = makeId(name)
  return (
    <Flex key={id} flexDirection="row" fontSize="11px">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <CheckboxField
            name={field.name}
            onChange={field.onChange}
            value={typeof field.value === 'boolean' ? field.value : false}
          />
        )}
      />
      <LegacyStyledText
        paddingLeft={SPACING.spacing8}
        paddingTop={SPACING.spacing2}
      >
        {displayName}
      </LegacyStyledText>
    </Flex>
  )
}

export interface ConfigQuirkGroupProps {
  quirks: DisplayQuirkFieldProps[]
  control: Control<FormValues, any>
}

export function ConfigQuirkGroup(props: ConfigQuirkGroupProps): JSX.Element {
  const { quirks, control } = props
  return (
    <FormGroup className={styles.form_group}>
      {quirks.map((field, index) => {
        return (
          <ConfigCheckbox
            displayQuirkField={field}
            key={index}
            control={control}
          />
        )
      })}
    </FormGroup>
  )
}
