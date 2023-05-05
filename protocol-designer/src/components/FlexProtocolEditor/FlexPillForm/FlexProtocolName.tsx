import * as React from 'react'
import { FormGroup, InputField } from '@opentrons/components'
import { i18n } from '../../../localization'
import { StyledText } from '../StyledText'
import styles from '../FlexComponents.css'
import { useFormikContext } from 'formik'

interface flexProtocolName {
  fields: { name: string; author: string; description: string }
  handleChange: () => void
  handleBlur: () => void
}

function FlexProtocolNameComponent(): JSX.Element {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
  } = useFormikContext<flexProtocolName>()

  return (
    <>
      <StyledText as="h2">
        {i18n.t('flex.name_and_description.heading')}
      </StyledText>
      <div className={styles.flex_sub_heading}>
        <StyledText as="h5">
          {i18n.t('flex.name_and_description.choose_name')}
        </StyledText>
      </div>

      <FormGroup className={styles.form_group}>
        <StyledText as="p">
          {i18n.t('flex.name_and_description.protocol_name')}
        </StyledText>
        <InputField
          autoFocus
          tabIndex={1}
          type="text"
          onChange={handleChange}
          onBlur={handleBlur}
          value={values.fields.name}
          name="fields.name"
        />
        {Boolean(errors?.fields?.name) && touched?.fields?.name && (
          <StyledText as="label" className={styles.error_message}>
            {errors?.fields?.name}
          </StyledText>
        )}
      </FormGroup>

      <div className={styles.flex_sub_heading}>
        <StyledText as="h5">
          {i18n.t('flex.name_and_description.add_more_information')}
        </StyledText>
      </div>

      <FormGroup className={styles.form_group}>
        <StyledText as="p">
          {i18n.t('flex.name_and_description.organization_author')}
        </StyledText>
        <InputField
          tabIndex={2}
          type="text"
          onChange={handleChange}
          onBlur={handleBlur}
          value={values.fields.author}
          name="fields.author"
        />
        {Boolean(errors?.fields?.author) && touched?.fields?.author && (
          <StyledText as="label" className={styles.error_message}>
            {errors?.fields?.author}
          </StyledText>
        )}
      </FormGroup>

      <FormGroup className={styles.form_group}>
        <StyledText as="p">
          {i18n.t('flex.name_and_description.protocol_description')}
        </StyledText>
        <textarea
          tabIndex={3}
          className={styles.textarea_input}
          rows={4}
          onChange={handleChange}
          onBlur={handleBlur}
          value={values.fields.description}
          name="fields.description"
        />
        {Boolean(errors?.fields?.description) && touched?.fields?.description && (
          <StyledText as="label" className={styles.error_message}>
            {errors?.fields?.description}
          </StyledText>
        )}
      </FormGroup>
    </>
  )
}

export const FlexProtocolName = FlexProtocolNameComponent
