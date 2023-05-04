import styles from './styles.css'
import * as React from 'react'

export interface LowercaseTextProps {
  /** text to display in lowercase */
  children: React.ReactNode
}

/**
 * LowercaseText - <span> that transforms all text to lowercase
 */
export function LowercaseText(props: LowercaseTextProps): JSX.Element {
  return <span className={styles.lowercase_text}>{props.children}</span>
}
