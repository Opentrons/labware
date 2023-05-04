// TODO(IL, 2021-03-01): refactor these fragmented style rules (see #7402)
import styles from '../StepEditForm/StepEditForm.css'
import { Box } from '@opentrons/components'
import * as React from 'react'

export interface FormColumnProps {
  children?: React.ReactNode
  sectionHeader?: React.ReactNode
}
export const FormColumn = (props: FormColumnProps): JSX.Element => {
  return (
    <Box className={styles.section_column}>
      <Box className={styles.section_header}>
        <span className={styles.section_header_text}>
          {props.sectionHeader}
        </span>
      </Box>
      {props.children}
    </Box>
  )
}
