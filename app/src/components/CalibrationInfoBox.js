// @flow
import * as React from 'react'
import classnames from 'classnames'
import {Icon, type IconName} from '@opentrons/components'
import styles from './calibration-info.css'

type Props = {
  title: string,
  panel: React.Node,
  iconName: IconName,
  className?: string
}

export default function CalibrationInfoBox (props: Props) {
  const {className, iconName, title, panel} = props

  return (
    <section className={classnames(styles.info_box, className)}>
      <div className={styles.info_header}>
        <Icon name={iconName} className={styles.info_header_icon} />
        <h2 className={styles.info_header_title}>{title}</h2>
      </div>
      {panel}
    </section>
  )
}
