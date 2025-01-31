import chineseLayout from 'simple-keyboard-layouts/build/layouts/chinese'

type LayoutCandidates =
  | {
      [key: string]: string
    }
  | undefined

export const customDisplay = {
  '{numbers}': '123',
  '{shift}': 'ABC',
  '{space}': 'space',
  '{backspace}': 'del',
  '{abc}': 'abc',
  '{ABC}': 'ABC',
  '{symbols}': '#+=',
}

// keyboard layout for Alphanumeric Keyboard
export const alphanumericKeyboardLayout = {
  default: [
    'q w e r t y u i o p',
    '{numbers} a s d f g h j k l',
    '{ABC} z x c v b n m {backspace}',
  ],
  shift: [
    'Q W E R T Y U I O P',
    '{numbers} A S D F G H J K L',
    '{abc} Z X C V B N M {backspace}',
  ],
  numbers: ['1 2 3', '4 5 6', '7 8 9', '{abc} 0 {backspace}'],
}

// keyboard layout for Full Keyboard
export const fullKeyboardLayout = {
  default: [
    'q w e r t y u i o p',
    '{numbers} a s d f g h j k l',
    '{shift} z x c v b n m {backspace}',
    '{space}',
  ],
  shift: [
    'Q W E R T Y U I O P',
    '{numbers} A S D F G H J K L',
    '{abc} Z X C V B N M {backspace}',
    '{space}',
  ],
  symbols: [
    '[ ] { } % ^ +',
    '{abc} _ \\ | < > # =',
    "{numbers} . , ? ! ' * ~ {backspace}",
    '{space}',
  ],
  numbers: [
    '1 2 3 4 5 6 7 8 9 0',
    '{abc} - / : ; ( ) $ & @ "',
    "{symbols} . , ? ! ' * ~ {backspace}",
    '{space}',
  ],
}

// Numerical keyboard layout
export const numericalKeyboardLayout = {
  // int without negative value
  intKeyboard: ['1 2 3', '4 5 6', '7 8 9', '0 {backspace}'],

  // int with negative value
  intNegKeyboard: ['1 2 3', '4 5 6', '7 8 9', '0 - {backspace}'],

  // float without negative value,
  floatKeyboard: ['1 2 3', '4 5 6', '7 8 9', '0 . {backspace}'],

  // float with negative value
  floatNegKeyboard: ['1 2 3', '4 5 6', '7 8 9', '0 . - {backspace}'],
}

export const numericalCustom = {
  '{backspace}': 'del',
}

export const layoutCandidates: {
  [key: string]: LayoutCandidates
} = {
  // @ts-expect-error layout candidates exists but is not on the type
  // in the simple-keyboard-layouts package
  'zh-CN': chineseLayout.layoutCandidates,
  'en-US': undefined,
}
