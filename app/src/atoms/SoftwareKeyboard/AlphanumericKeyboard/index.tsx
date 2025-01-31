import { useState } from 'react'
import Keyboard from 'react-simple-keyboard'
import { useSelector } from 'react-redux'
import { getAppLanguage } from '/app/redux/config'
import {
  alphanumericKeyboardLayout,
  layoutCandidates,
  customDisplay,
} from '../constants'

import type { MutableRefObject } from 'react'
import type { KeyboardReactInterface } from 'react-simple-keyboard'

import '../index.css'
import './index.css'

// TODO (kk:04/05/2024) add debug to make debugging easy
interface AlphanumericKeyboardProps {
  onChange: (input: string) => void
  keyboardRef: MutableRefObject<KeyboardReactInterface | null>
  debug?: boolean
}

export function AlphanumericKeyboard({
  onChange,
  keyboardRef,
  debug = false, // If true, <ENTER> will input a \n
}: AlphanumericKeyboardProps): JSX.Element {
  const [layoutName, setLayoutName] = useState<string>('default')
  const appLanguage = useSelector(getAppLanguage)
  const onKeyPress = (button: string): void => {
    if (button === '{ABC}') handleShift()
    if (button === '{numbers}') handleNumber()
    if (button === '{abc}') handleUnShift()
  }

  const handleShift = (): void => {
    setLayoutName(layoutName === 'default' ? 'shift' : 'default')
  }

  const handleNumber = (): void => {
    setLayoutName(
      layoutName === 'default' || layoutName === 'shift' ? 'numbers' : 'default'
    )
  }

  const handleUnShift = (): void => {
    setLayoutName('default')
  }

  return (
    <Keyboard
      keyboardRef={r => (keyboardRef.current = r)}
      theme="hg-theme-default oddTheme1 alphanumericKeyboard"
      onChange={onChange}
      onKeyPress={onKeyPress}
      layoutName={layoutName}
      layout={alphanumericKeyboardLayout}
      layoutCandidates={
        appLanguage != null ? layoutCandidates[appLanguage] : undefined
      }
      display={customDisplay}
      mergeDisplay={true}
      useButtonTag={true}
      width="100%"
      debug={debug} // If true, <ENTER> will input a \n
    />
  )
}
