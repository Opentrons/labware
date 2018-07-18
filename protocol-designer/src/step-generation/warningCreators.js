// @flow
import type {CommandCreatorWarning} from './types'

export function aspirateMoreThanWellContents (): CommandCreatorWarning {
  return {
    type: 'ASPIRATE_MORE_THAN_WELL_CONTENTS',
    message: 'Not enough liquid in well(s)'
  }
}

export function aspirateFromPristineWell (): CommandCreatorWarning {
  return {
    type: 'ASPIRATE_FROM_PRISTINE_WELL',
    message: 'Source well is empty'
  }
}
