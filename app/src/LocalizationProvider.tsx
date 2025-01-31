import { I18nextProvider } from 'react-i18next'
import { useSelector } from 'react-redux'
import reduce from 'lodash/reduce'

import { resources } from '/app/assets/localization'
import { i18n, i18nCb, i18nConfig } from '/app/i18n'
import { getAppLanguage } from '/app/redux/config'
import { useIsOEMMode } from '/app/resources/robot-settings/hooks'

import type { ReactNode } from 'react'

export interface LocalizationProviderProps {
  children?: ReactNode
}

export const BRANDED_RESOURCE = 'branded'
export const ANONYMOUS_RESOURCE = 'anonymous'

export function LocalizationProvider(
  props: LocalizationProviderProps
): JSX.Element | null {
  const isOEMMode = useIsOEMMode()

  const language = useSelector(getAppLanguage)

  // iterate through language resources, nested files, substitute anonymous file for branded file for OEM mode
  const anonResources = reduce(
    resources,
    (acc, resource, language) => {
      const anonFiles = reduce(
        resource,
        (acc, file, fileName) => {
          if (fileName === BRANDED_RESOURCE && isOEMMode) {
            return acc
          } else if (fileName === ANONYMOUS_RESOURCE) {
            return isOEMMode ? { ...acc, [BRANDED_RESOURCE]: file } : acc
          } else {
            return { ...acc, [fileName]: file }
          }
        },
        {}
      )
      return { ...acc, [language]: anonFiles }
    },
    {}
  )

  const anonI18n = i18n.createInstance(
    {
      ...i18nConfig,
      lng: language ?? 'en',
      resources: anonResources,
    },
    i18nCb
  )

  return <I18nextProvider i18n={anonI18n}>{props.children}</I18nextProvider>
}
