import { useState } from 'react'
import { KeyboardReact as Keyboard } from 'react-simple-keyboard'
import { useSelector } from 'react-redux'
import { getAppLanguage } from '/app/redux/config'
import {
  customDisplay,
  layoutCandidates,
  fullKeyboardLayout,
} from '../constants'

import type { MutableRefObject } from 'react'
import type { KeyboardReactInterface } from 'react-simple-keyboard'

import '../index.css'
import './index.css'

// TODO (kk:04/05/2024) add debug to make debugging easy
interface FullKeyboardProps {
  onChange: (input: string) => void
  keyboardRef: MutableRefObject<KeyboardReactInterface | any>
  debug?: boolean
}

export function FullKeyboard({
  onChange,
  keyboardRef,
  debug = false,
}: FullKeyboardProps): JSX.Element {
  const [layoutName, setLayoutName] = useState<string>('default')
  const appLanguage = useSelector(getAppLanguage)
  const handleShift = (button: string): void => {
    switch (button) {
      case '{shift}':
        setLayoutName(layoutName === 'default' ? 'shift' : 'default')
        break
      case '{numbers}':
        setLayoutName('numbers')
        break
      case '{symbols}':
        setLayoutName('symbols')
        break
      case '{abc}':
        setLayoutName('default')
        break
      default:
        break
    }
  }

  const onKeyPress = (button: string): void => {
    if (
      button === '{numbers}' ||
      button === '{abc}' ||
      button === '{shift}' ||
      button === '{symbols}'
    )
      handleShift(button)
  }

  return (
    <Keyboard
      keyboardRef={r => (keyboardRef.current = r)}
      theme="hg-theme-default oddTheme1"
      onChange={onChange}
      onKeyPress={onKeyPress}
      layoutName={layoutName}
      layout={fullKeyboardLayout}
      layoutCandidates={
        appLanguage != null ? layoutCandidates[appLanguage] : undefined
      }
      display={customDisplay}
      mergeDisplay={true}
      useButtonTag={true}
      debug={debug} // If true, <ENTER> will input a \n
      baseClass="fullKeyboard"
    />
  )
}
