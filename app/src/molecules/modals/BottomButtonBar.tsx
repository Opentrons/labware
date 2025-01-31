// bottom button bar for modals
// TODO(mc, 2018-08-18): maybe make this the default AlertModal behavior
import cx from 'classnames'

import { OutlineButton } from '@opentrons/components'
import styles from './styles.module.css'

import type { ReactNode } from 'react'
import type { ButtonProps } from '@opentrons/components'

type MaybeButtonProps = ButtonProps | null | undefined
interface Props {
  buttons: MaybeButtonProps[]
  className?: string | null
  description?: ReactNode | null
}

export function BottomButtonBar(props: Props): JSX.Element {
  const buttons = props.buttons.filter(Boolean)
  const className = cx(styles.bottom_button_bar, props.className)

  return (
    <div className={className}>
      {props.description}
      <div>
        {buttons.map((button, index) => (
          <OutlineButton
            {...button}
            key={index}
            // @ts-expect-error button is possibly null
            className={cx(styles.bottom_button, button.className)}
          />
        ))}
      </div>
    </div>
  )
}
