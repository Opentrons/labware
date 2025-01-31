import { KeyboardReact as Keyboard } from 'react-simple-keyboard'
import { numericalKeyboardLayout, numericalCustom } from '../constants'

import type { MutableRefObject } from 'react'
import type { KeyboardReactInterface } from 'react-simple-keyboard'

import '../index.css'
import './index.css'

// Note (kk:04/05/2024) add debug to make debugging easy
interface NumericalKeyboardProps {
  onChange: (input: string) => void
  keyboardRef: MutableRefObject<KeyboardReactInterface | null>
  isDecimal?: boolean
  hasHyphen?: boolean
  debug?: boolean
  initialValue?: string
}

// the default keyboard layout intKeyboard that doesn't have decimal point and hyphen.
export function NumericalKeyboard({
  onChange,
  keyboardRef,
  isDecimal = false,
  hasHyphen = false,
  debug = false,
  initialValue = '',
}: NumericalKeyboardProps): JSX.Element {
  const layoutName = `${isDecimal ? 'float' : 'int'}${
    hasHyphen ? 'NegKeyboard' : 'Keyboard'
  }`

  return (
    /*
     *  autoUseTouchEvents: for Flex on-device app
     *  useButtonTag: this is for testing purpose that each key renders as a button
     */
    <Keyboard
      keyboardRef={r => (keyboardRef.current = r)}
      theme="hg-theme-default oddTheme1 numerical-keyboard"
      onInit={keyboard => {
        keyboard.setInput(initialValue)
      }}
      onChange={onChange}
      display={numericalCustom}
      useButtonTag={true}
      layoutName={layoutName}
      layout={numericalKeyboardLayout}
      debug={debug} // If true, <ENTER> will input a \n
    />
  )
}
