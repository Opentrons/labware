// collapsable side panel
import styles from './SidePanel.module.css'

import type { ReactNode } from 'react'

export interface SidePanelProps {
  title?: string
  children?: ReactNode
}

export function SidePanel(props: SidePanelProps): JSX.Element {
  return (
    <div className={styles.panel}>
      {props.title != null ? (
        <div className={styles.title_bar}>
          <h2 className={styles.title}>{props.title}</h2>
        </div>
      ) : null}
      <div className={styles.panel_contents}>{props.children}</div>
    </div>
  )
}
