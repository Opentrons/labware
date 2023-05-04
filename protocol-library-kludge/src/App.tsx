import { URLDeck } from './URLDeck'
import './globals.css'
import * as React from 'react'
import { hot } from 'react-hot-loader/root'

export function AppComponent(): JSX.Element {
  return <URLDeck />
}

export const App = hot(AppComponent)
