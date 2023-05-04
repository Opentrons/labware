// TODO(mc, 2018-08-08): figure out type exports from app
import type { Logger } from '@opentrons/app/src/logger'
import type {
  Action,
  Error as PlainError,
} from '@opentrons/app/src/redux/types'

export type { Action, PlainError }

export type Dispatch = (action: Action) => void

export type { Logger }
