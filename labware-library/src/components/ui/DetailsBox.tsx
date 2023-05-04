import styles from './styles.css'
import * as React from 'react'

export interface DetailsBoxProps {
  children: React.ReactNode
  aside: React.ReactNode
}

export function DetailsBox(props: DetailsBoxProps): JSX.Element {
  const { children, aside } = props

  return (
    <section className={styles.details_box}>
      <div className={styles.details_box_contents}>{children}</div>
      <aside className={styles.details_box_aside}>{aside}</aside>
    </section>
  )
}
