import get from 'lodash/get'

import { dismissedHintsPersist } from './tutorial/reducers'
import type { Store } from 'redux'
import type { DismissedHintReducerState } from './tutorial/reducers'
export interface RehydratePersistedAction {
  type: 'REHYDRATE_PERSISTED'
  payload: {
    'tutorial.dismissedHints'?: Record<string, any>
    'featureFlags.flags'?: Record<string, any>
    'analytics.hasOptedIn'?: {
      hasOptedIn: boolean
      appVersion?: string
    }
  }
}
export const getLocalStorageItem = (path: string): unknown => {
  try {
    const persisted = global.localStorage.getItem(_addStoragePrefix(path))
    return persisted ? JSON.parse(persisted) : undefined
  } catch (e) {
    console.error('Could not rehydrate:', e)
  }

  return undefined
}
// The `path` should match where the reducer lives in the Redux state tree
export const _rehydrate = (path: string): any => {
  console.assert(
    PERSISTED_PATHS.includes(path),
    `Path "${path}" is missing from PERSISTED_PATHS! The changes to this reducer will not be persisted.`
  )
  return getLocalStorageItem(path)
}
export const _rehydrateAll = (): RehydratePersistedAction['payload'] => {
  return PERSISTED_PATHS.reduce((acc, path) => {
    const persistedData = _rehydrate(path)

    if (typeof persistedData !== 'undefined') {
      // @ts-expect-error(sa, 2021-6-20): this gets any typed bcuz {}, the initial value in reduce, has no keys
      acc[path] = persistedData
    }

    return acc
  }, {})
}
export const rehydratePersistedAction = (): RehydratePersistedAction => {
  return {
    type: 'REHYDRATE_PERSISTED',
    payload: _rehydrateAll(),
  }
}

function _addStoragePrefix(path: string): string {
  return `root.${path}`
}

export const localStorageAnnouncementKey = 'announcementKey'
// paths from Redux root to all persisted reducers
const PERSISTED_PATHS = [
  'analytics.hasOptedIn',
  'tutorial.dismissedHints',
  'featureFlags.flags',
]

function transformBeforePersist(
  path: string,
  reducerState: any
): Record<string, any> {
  switch (path) {
    case 'tutorial.dismissedHints':
      return dismissedHintsPersist(reducerState as DismissedHintReducerState)

    default:
      return reducerState
  }
}

export const setLocalStorageItem = (path: string, value: any): void => {
  try {
    global.localStorage.setItem(
      _addStoragePrefix(path),
      JSON.stringify(transformBeforePersist(path, value))
    )
  } catch (e) {
    console.error(`error attempting to persist ${path}:`, e)
  }
}
export const getPrereleaseFeatureFlag = (value: string): boolean => {
  const ffData: any = getLocalStorageItem('featureFlags.flags')
  return Boolean(ffData?.[value])
}

/** Subscribe this fn to the Redux store to persist selected substates */
type PersistSubscriber = () => void
export const makePersistSubscriber = (
  store: Store<any, any>
): PersistSubscriber => {
  const prevReducerStates = {}
  return () => {
    const state = store.getState()
    PERSISTED_PATHS.forEach(path => {
      const nextReducerState = get(state, path)
      // @ts-expect-error(sa, 2021-6-20): this gets any typed because {} has no keys
      if (prevReducerStates[path] !== nextReducerState) {
        setLocalStorageItem(path, nextReducerState)
        // @ts-expect-error(sa, 2021-6-20): this gets any typed because {} has no keys
        prevReducerStates[path] = nextReducerState
      }
    })
  }
}
