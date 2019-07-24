// @flow
import * as React from 'react'
import compact from 'lodash/compact'
import uniq from 'lodash/uniq'
import { connect } from 'formik'
import { AlertItem } from '@opentrons/components'
import { getIsAutopopulated } from '../formikStatus'
import LinkOut from './LinkOut'
import styles from './Section.css'
import { IRREGULAR_LABWARE_ERROR, type LabwareFields } from '../fields'

// TODO: Make this DRY, don't require fields (in children) and also fieldList.
type Props = {|
  label: string,
  formik: any, // TODO IMMEDIATELY type this??
  additionalAlerts?: React.Node,
  fieldList?: Array<$Keys<LabwareFields>>,
  children?: React.Node,
|}
const Section = connect((props: Props) => {
  const fieldList = props.fieldList || []
  if (props.fieldList != null && fieldList.length > 0) {
    const numFieldsAutopopulated = props.fieldList
      .map(field => getIsAutopopulated(field, props.formik.status))
      .filter(Boolean).length

    if (numFieldsAutopopulated === fieldList.length) {
      // all fields are autopopulated
      return null
    }
    if (
      numFieldsAutopopulated > 0 &&
      numFieldsAutopopulated !== fieldList.length
    ) {
      console.error(
        `section "${
          props.label
        }" has fields where some but not all are autofilled - this shouldn't happen?!`
      )
    }
  }

  // show Formik errors (from Yup) as WARNINGs for all dirty fields within this Section
  const dirtyFieldNames = fieldList.filter(
    name => props.formik?.touched?.[name]
  )
  const allErrors: Array<string> = uniq(
    compact(dirtyFieldNames.map(name => props.formik.errors[name]))
  )
  const allErrorAlerts = allErrors.map(error => {
    if (error === IRREGULAR_LABWARE_ERROR) {
      // TODO IMMEDIATELY get real link to labware request form
      return (
        <AlertItem
          key={error}
          type="error"
          title={
            <>
              Your labware is not compatible with the Labware Creator. Please
              fill out{' '}
              <LinkOut href="https://opentrons-ux.typeform.com/to/xi8h0W">
                this form
              </LinkOut>{' '}
              to request a custom labware definition.
            </>
          }
        />
      )
    }
    return <AlertItem key={error} type="warning" title={error} />
  })

  return (
    <div className={styles.section_wrapper}>
      <h2 className={styles.section_header}>{props.label}</h2>
      <div>
        {allErrorAlerts}
        {props.additionalAlerts}
      </div>
      {props.children}
    </div>
  )
})

export default Section
