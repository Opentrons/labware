import { Controller } from 'react-hook-form'
import { TextAreaField } from '../TextAreaField'

interface ControlledTextAreaFieldProps {
  id?: string
  name: string
  rules?: any
  title?: string
  caption?: string
  height?: string
}

export function ControlledTextAreaField({
  id,
  name,
  rules,
  title,
  caption,
  height,
}: ControlledTextAreaFieldProps): JSX.Element {
  return (
    <Controller
      name={name}
      rules={rules}
      render={({ field }) => (
        <TextAreaField
          title={title}
          caption={caption}
          id={id}
          name={name}
          onChange={field.onChange}
          value={field.value}
          onBlur={field.onBlur}
          height={height}
        />
      )}
    />
  )
}
