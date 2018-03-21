// @flow
import {createRobotState} from './fixtures'
import dispense from '../dispense'

import updateLiquidState from '../dispenseUpdateLiquidState'

jest.mock('../dispenseUpdateLiquidState')

describe('dispense', () => {
  let initialRobotState
  let robotStateWithTip
  beforeEach(() => {
    initialRobotState = createRobotState({
      sourcePlateType: 'trough-12row',
      destPlateType: '96-flat',
      fillTiprackTips: true,
      fillPipetteTips: false,
      tipracks: [200, 200]
    })

    robotStateWithTip = {
      ...initialRobotState,
      tipState: {
        ...initialRobotState.tipState,
        pipettes: {
          ...initialRobotState.tipState.pipettes,
          p300SingleId: true
        }
      }
    }

    // $FlowFixMe: mock methods
    updateLiquidState.mockClear()
    // $FlowFixMe: mock methods
    updateLiquidState.mockReturnValue(initialRobotState.liquidState)
  })

  describe('tip tracking & commands:', () => {
    beforeEach(() => {
      // updateLiquidState acts as pass-thru for non-liquid-tracking tests

      // $FlowFixMe: mock methods
      // _updateLiquidState.mockClear()
      // $FlowFixMe: mock methods
      // _updateLiquidState.mockReturnValue(initialRobotState.liquidState)
    })

    test('dispense with tip', () => {
      const result = dispense({
        pipette: 'p300SingleId',
        volume: 50,
        labware: 'sourcePlateId',
        well: 'A1'
      })(robotStateWithTip)

      expect(result.commands).toEqual([{
        command: 'dispense',
        pipette: 'p300SingleId',
        volume: 50,
        labware: 'sourcePlateId',
        well: 'A1'
      }])
    })

    test('dispensing without tip should throw error', () => {
      expect(() => dispense({
        pipette: 'p300SingleId',
        volume: 50,
        labware: 'sourcePlateId',
        well: 'A1'
      })(initialRobotState)).toThrow(/Attempted to dispense with no tip on pipette/)
    })

    // TODO Ian 2018-02-12... what is excessive volume?
    // Is it OK to dispense vol > pipette max vol?
    // LATER: shouldn't dispense > volume of liquid in pipette
    test.skip('dispense with excessive volume should... ?')
  })

  describe('liquid tracking', () => {
    test('dispense calls dispenseUpdateLiquidState with specified volume of pipette', () => {
      dispense({
        pipette: 'p300SingleId',
        labware: 'sourcePlateId',
        well: 'A1',
        volume: 152
      })(robotStateWithTip)

      expect(updateLiquidState).toHaveBeenCalledWith(
        {
          pipetteId: 'p300SingleId',
          labwareId: 'sourcePlateId',
          volume: 152, // TODO IMMEDIATELY
          well: 'A1',
          labwareType: 'trough-12row',
          pipetteData: robotStateWithTip.instruments.p300SingleId
        },
        robotStateWithTip.liquidState
      )
    })
  })
})
