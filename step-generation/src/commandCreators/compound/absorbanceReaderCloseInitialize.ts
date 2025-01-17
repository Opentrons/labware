import { absorbanceReaderCloseLid, absorbanceReaderInitialize } from '../atomic'
import * as errorCreators from '../../errorCreators'
import { absorbanceReaderStateGetter } from '../../robotStateSelectors'
import { curryCommandCreator, reduceCommandCreators } from '../../utils'

import type {
  AbsorbanceReaderInitializeArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'

export const absorbanceReaderCloseInitialize: CommandCreator<AbsorbanceReaderInitializeArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const absorbanceReaderState = absorbanceReaderStateGetter(
    prevRobotState,
    args.module
  )

  if (args.module == null || absorbanceReaderState == null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
  const { module, mode, wavelengths, referenceWavelength } = args
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(absorbanceReaderCloseLid, {
      commandCreatorFnName: 'absorbanceReaderCloseLid',
      module,
    }),
    curryCommandCreator(absorbanceReaderInitialize, {
      commandCreatorFnName: 'absorbanceReaderInitialize',
      module,
      mode,
      wavelengths,
      referenceWavelength,
    }),
  ]
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
