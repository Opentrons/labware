import { KeyboardReact as Keyboard } from 'react-simple-keyboard'

import type { MutableRefObject } from 'react'
import type { KeyboardReactInterface } from 'react-simple-keyboard'

import '../index.css'
import './index.css'

const customDisplay = {
  '{backspace}': 'del',
}

// TODO (kk:04/05/2024) add debug to make debugging easy
interface IndividualKeyProps {
  onChange: (input: string) => void
  keyboardRef: MutableRefObject<KeyboardReactInterface | null>
  keyText: string
  debug?: boolean
}

export function IndividualKey({
  onChange,
  keyboardRef,
  keyText,
  debug = false,
}: IndividualKeyProps): JSX.Element {
  const numericalKeyboard = {
    layout: {
      default: [`${keyText}`],
    },
  }
  return (
    /*
     *  autoUseTouchEvents: for Flex on-device app
     *  useButtonTag: this is for testing purpose that each key renders as a button
     */
    <Keyboard
      keyboardRef={r => (keyboardRef.current = r)}
      theme="hg-theme-default oddTheme1 individual-key"
      onChange={onChange}
      layoutName="default"
      display={customDisplay}
      useButtonTag={true}
      {...numericalKeyboard}
      width="100%"
      debug={debug} // If true, <ENTER> will input a \n
    />
  )
}
