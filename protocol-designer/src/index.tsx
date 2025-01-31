import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'

import { configureStore } from './configureStore'
import { initialize } from './initialize'
import { initializeMixpanel } from './analytics/mixpanel'
import { i18n } from './assets/localization'
import { App } from './App'
import { GlobalStyle } from './atoms/GlobalStyle'

// initialize Redux
const store = configureStore()
initialize(store)

// initialize analytics
initializeMixpanel(store.getState())

const container = document.getElementById('root')
if (container == null) throw new Error('Failed to find the root element')
const root = ReactDOM.createRoot(container)

const RootComponent = (): JSX.Element => {
  return (
    <>
      <GlobalStyle />
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </>
  )
}

root.render(
  <Provider store={store}>
    <RootComponent />
  </Provider>
)
