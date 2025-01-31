import { describe, it, expect, vi } from 'vitest'
import { ingredients, ingredLocations } from '../reducers'
vi.mock('../../labware-defs/utils')

describe('DUPLICATE_LABWARE action', () => {
  it('duplicate ingredient locations from cloned container', () => {
    const copyLabwareAction = {
      type: 'DUPLICATE_LABWARE',
      payload: {
        templateLabwareId: 'myTrough',
        duplicateLabwareId: 'newContainer',
        toSlot: '5',
      },
    }

    const prevIngredState = {
      ingred3: {
        name: 'Buffer',
        wellDetailsByLocation: null,
        concentration: '50 mol/ng',
        description: '',
        liquidClass: null,
        displayColor: '#b925ff',
        serialize: false,
      },
      ingred4: {
        name: 'Other Ingred',
        wellDetailsByLocation: null,
        concentration: '100%',
        description: '',
        liquidClass: null,
        displayColor: '#ffd600',
        serialize: false,
      },
    }

    const prevLocationsState = {
      myTrough: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      otherContainer: {
        D4: { ingred3: { volume: 201 } },
        E4: { ingred3: { volume: 202 } },
        A4: { ingred4: { volume: 301 } },
        B4: { ingred4: { volume: 302 } },
      },
    }

    expect(ingredients(prevIngredState, copyLabwareAction)).toEqual(
      prevIngredState
    )

    expect(ingredLocations(prevLocationsState, copyLabwareAction)).toEqual({
      myTrough: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      // this is newly copied
      newContainer: {
        A1: { ingred3: { volume: 101 } },
        A2: { ingred3: { volume: 102 } },
        A3: { ingred3: { volume: 103 } },
      },
      otherContainer: {
        D4: { ingred3: { volume: 201 } },
        E4: { ingred3: { volume: 202 } },
        A4: { ingred4: { volume: 301 } },
        B4: { ingred4: { volume: 302 } },
      },
    })
  })
})
