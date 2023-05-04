import { i18n } from '../localization'
import styles from './WellSelectionInstructions.css'
import { Icon } from '@opentrons/components'
import * as React from 'react'

export function WellSelectionInstructions(): JSX.Element {
  return (
    <div className={styles.wrapper}>
      <Icon className={styles.click_drag_icon} name="ot-click-and-drag" />
      <div className={styles.instructional_text}>
        <p>{i18n.t('well_selection.select_instructions')}</p>
        <p>{i18n.t('well_selection.deselect_instructions')}</p>
      </div>
    </div>
  )
}
