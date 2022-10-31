import _protocolWithMagTempTC from '@opentrons/shared-data/protocol/fixtures/6/transferSettings.json'
import _protocolWithMultipleTemps from '@opentrons/shared-data/protocol/fixtures/6/multipleTempModules.json'
import _standardDeckDef from '@opentrons/shared-data/deck/definitions/3/ot2_standard.json'
import { getModuleInitialLoadInfo } from '../getModuleInitialLoadInfo'
import { ProtocolAnalysisFile } from '@opentrons/shared-data'
import { LoadModuleRunTimeCommand } from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'

const protocolWithMagTempTC = (_protocolWithMagTempTC as unknown) as ProtocolAnalysisFile

describe('getModuleInitialLoadInfo', () => {
  it('should gather protocol module info for tc if id in params', () => {
    const TC_ID: keyof typeof _protocolWithMagTempTC.modules =
      '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType'

    const LOAD_TC_COMMAND = {
      id: '4',
      commandType: 'loadModule',
      params: {
        moduleId: '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType',
        location: {
          slotName: '7',
        },
      },
      result: {
        moduleId: '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType',
      },
    }

    expect(
      getModuleInitialLoadInfo(TC_ID, protocolWithMagTempTC.commands)
    ).toEqual({
      location: LOAD_TC_COMMAND.params.location,
      protocolLoadOrder: 2,
    })
  })
  it('should gather protocol module info for tc if id not in params', () => {
    const TC_ID: keyof typeof _protocolWithMagTempTC.modules =
      '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType'

    const LOAD_TC_COMMAND: LoadModuleRunTimeCommand = {
      id: '4',
      commandType: 'loadModule',
      params: { location: { slotName: '7' } },
      result: {
        moduleId: '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType',
      },
    } as any

    expect(getModuleInitialLoadInfo(TC_ID, [LOAD_TC_COMMAND])).toEqual({
      location: LOAD_TC_COMMAND.params.location,
      protocolLoadOrder: 0,
    })
  })
})
