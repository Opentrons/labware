import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fixtureP10SingleV2Specs,
  getLabwareDefURI,
} from '@opentrons/shared-data'
import {
  fixture_12_trough,
  fixture_96_plate,
} from '@opentrons/shared-data/labware/fixtures/2'
import { DEST_WELL_BLOWOUT_DESTINATION } from '@opentrons/step-generation'
import {
  moveLiquidFormToArgs,
  getAirGapData,
  getMixData,
} from '../moveLiquidFormToArgs'
import { getOrderedWells } from '../../../utils'
import { DEFAULT_MM_OFFSET_FROM_BOTTOM } from '../../../../constants'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  HydratedMoveLiquidFormData,
  PathOption,
} from '../../../../form-types'

vi.mock('../../../utils')
vi.mock('assert')

const ASPIRATE_WELL = 'A2' // default source is trough for these tests
const DISPENSE_WELL = 'C3' // default dest in 96 flat for these tests

describe('move liquid step form -> command creator args', () => {
  let hydratedForm: HydratedMoveLiquidFormData
  const sourceLabwareDef = fixture_12_trough as LabwareDefinition2
  const sourceLabwareType = getLabwareDefURI(sourceLabwareDef)
  const destLabwareDef = fixture_96_plate as LabwareDefinition2
  const destLabwareType = getLabwareDefURI(destLabwareDef)
  beforeEach(() => {
    vi.mocked(getOrderedWells).mockClear()
    vi.mocked(getOrderedWells).mockImplementation(wells => wells)

    // the "base case" is a 1 to 1 transfer, single path
    hydratedForm = {
      stepType: 'moveLiquid',
      stepName: 'Test Step',
      description: null,
      pipette: {
        id: 'pipetteId',
        spec: fixtureP10SingleV2Specs,
        tiprackLabwareDef: [
          {
            parameters: {
              tipLength: 10,
              loadName: 'mockTiprack',
            },
            metadata: {
              displayName: 'mock display name',
            },
          },
        ] as any,
      } as any,
      volume: 10,
      path: 'single',
      changeTip: 'always',
      aspirate_labware: {
        id: 'sourceLabwareId',
        // @ts-expect-error(sa, 2021-6-15): type does not exist on LabwareEntity
        type: sourceLabwareType,
        def: sourceLabwareDef,
      },
      tipRack: 'mockTiprack',
      aspirate_wells: [ASPIRATE_WELL],
      aspirate_wellOrder_first: 'l2r',
      aspirate_wellOrder_second: 't2b',
      aspirate_flowRate: null,
      aspirate_mmFromBottom: null,
      aspirate_touchTip_checkbox: false,
      aspirate_touchTip_mmFromTop: null,
      aspirate_mix_checkbox: false,
      aspirate_mix_volume: null,
      aspirate_mix_times: null,
      aspirate_delay_checkbox: false,
      aspirate_delay_seconds: null,
      aspirate_delay_mmFromBottom: null,

      dispense_labware: {
        id: 'destLabwareId',
        // @ts-expect-error(sa, 2021-6-15): type does not exist on LabwareEntity
        type: destLabwareType,
        def: destLabwareDef,
      },
      dispense_wells: [DISPENSE_WELL],
      dispense_wellOrder_first: 'r2l',
      dispense_wellOrder_second: 'b2t',
      dispense_flowRate: null,
      dispense_mmFromBottom: null,
      dispense_touchTip_checkbox: false,
      dispense_touchTip_mmFromTop: null,
      dispense_mix_checkbox: false,
      dispense_mix_volume: null,
      dispense_mix_times: null,
      dispense_delay_checkbox: false,
      dispense_delay_seconds: null,
      dispense_delay_mmFromBottom: null,

      aspirate_wells_grouped: false,
      preWetTip: false,
      disposalVolume_checkbox: false,
      disposalVolume_volume: null,
      disposalVolume_location: null,
      blowout_checkbox: false,
      blowout_location: null,
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('moveLiquidFormToArgs calls getOrderedWells correctly', () => {
    moveLiquidFormToArgs(hydratedForm)

    expect(vi.mocked(getOrderedWells)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(getOrderedWells)).toHaveBeenCalledWith(
      [ASPIRATE_WELL],
      sourceLabwareDef,
      'l2r',
      't2b'
    )
    expect(vi.mocked(getOrderedWells)).toHaveBeenCalledWith(
      [DISPENSE_WELL],
      destLabwareDef,
      'r2l',
      'b2t'
    )
  })

  it('moveLiquidFormToArgs calls getOrderedWells only for aspirate when dispensing is into a waste chute', () => {
    moveLiquidFormToArgs({
      ...hydratedForm,
      dispense_labware: {
        id: 'destLabwareId',
        name: 'wasteChute',
        location: 'cutoutD3',
      },
    })

    expect(vi.mocked(getOrderedWells)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(getOrderedWells)).toHaveBeenCalledWith(
      [ASPIRATE_WELL],
      sourceLabwareDef,
      'l2r',
      't2b'
    )
  })

  it('moveLiquid form with 1:1 single transfer translated to args', () => {
    const result = moveLiquidFormToArgs(hydratedForm)

    expect(result).toMatchObject({
      pipette: 'pipetteId',
      volume: 10,
      changeTip: 'always',
      sourceLabware: 'sourceLabwareId',
      sourceWells: [ASPIRATE_WELL],
      destLabware: 'destLabwareId',
      destWells: [DISPENSE_WELL],
    })

    // no form-specific fields should be passed along
    // @ts-expect-error(sa, 2021-6-15): result might be null, need to null check
    Object.keys(result).forEach(field => {
      expect(field).toEqual(expect.not.stringMatching(/.*wellOrder.*/i))
      expect(field).toEqual(expect.not.stringMatching(/.*checkbox.*/i))
    })
  })

  const checkboxFieldCases = [
    // TOUCH TIPS
    {
      checkboxField: 'aspirate_touchTip_checkbox',
      formFields: { aspirate_touchTip_mmFromTop: -11 },
      expectedArgsUnchecked: {
        touchTipAfterAspirate: false,
        touchTipAfterAspirateOffsetMmFromTop: -11,
      },
      expectedArgsChecked: {
        touchTipAfterAspirate: true,
        touchTipAfterAspirateOffsetMmFromTop: -11,
      },
    },
    {
      checkboxField: 'dispense_touchTip_checkbox',
      formFields: { dispense_touchTip_mmFromTop: -22 },
      expectedArgsUnchecked: {
        touchTipAfterDispense: false,
        touchTipAfterDispenseOffsetMmFromTop: -22,
      },
      expectedArgsChecked: {
        touchTipAfterDispense: true,
        touchTipAfterDispenseOffsetMmFromTop: -22,
      },
    },
    // MIXES
    {
      checkboxField: 'aspirate_mix_checkbox',
      formFields: {
        aspirate_mix_volume: 5,
        aspirate_mix_times: 3,
      },
      expectedArgsUnchecked: { mixBeforeAspirate: null },
      expectedArgsChecked: { mixBeforeAspirate: { volume: 5, times: 3 } },
    },
    {
      checkboxField: 'dispense_mix_checkbox',
      formFields: {
        dispense_mix_volume: 5,
        dispense_mix_times: 3,
      },
      expectedArgsUnchecked: { mixInDestination: null },
      expectedArgsChecked: { mixInDestination: { volume: 5, times: 3 } },
    },
    // DELAYS
    {
      checkboxField: 'aspirate_delay_checkbox',
      formFields: {
        aspirate_delay_seconds: 11,
        aspirate_delay_mmFromBottom: null, // use default
      },
      expectedArgsUnchecked: { aspirateDelay: null },
      expectedArgsChecked: {
        aspirateDelay: {
          seconds: 11,
          mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
        },
      },
    },
    {
      checkboxField: 'dispense_delay_checkbox',
      formFields: {
        dispense_delay_seconds: 11,
        dispense_delay_mmFromBottom: 12,
      },
      expectedArgsUnchecked: { dispenseDelay: null },
      expectedArgsChecked: { dispenseDelay: { seconds: 11, mmFromBottom: 12 } },
    },
    // AIRGAP
    {
      checkboxField: 'aspirate_airGap_checkbox',
      formFields: {
        aspirate_airGap_volume: 20,
      },
      expectedArgsUnchecked: { aspirateAirGapVolume: null },
      expectedArgsChecked: { aspirateAirGapVolume: 20 },
    },
    {
      checkboxField: 'dispense_airGap_checkbox',
      formFields: {
        dispense_airGap_volume: 20,
      },
      expectedArgsUnchecked: { dispenseAirGapVolume: null },
      expectedArgsChecked: { dispenseAirGapVolume: 20 },
    },
  ]

  checkboxFieldCases.forEach(
    ({
      checkboxField,
      formFields,
      expectedArgsChecked,
      expectedArgsUnchecked,
    }) => {
      it(`${checkboxField} toggles dependent fields`, () => {
        expect(
          moveLiquidFormToArgs({
            ...hydratedForm,

            [checkboxField]: false,
            ...formFields,
          })
        ).toMatchObject(expectedArgsUnchecked)

        expect(
          moveLiquidFormToArgs({
            ...hydratedForm,
            [checkboxField]: true,
            ...formFields,
          })
        ).toMatchObject(expectedArgsChecked)
      })
    }
  )

  describe('distribute: disposal volume / blowout behaviors', () => {
    const blowoutLabwareId = 'blowoutLabwareId'
    const disposalVolumeFields = {
      path: 'multiDispense' as PathOption, // 'multiDispense' required to use `distribute` command creator
      blowout_location: blowoutLabwareId, // disposal volume uses `blowout_location` for the blowout
      disposalVolume_volume: 123,
      // NOTE: when spreading these in to hydratedForm fixture,
      // remember the blowout/disposalVolume checkboxes are false by default!
    }

    it('disposal volume works when checkbox true', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        disposalVolume_checkbox: true,
      })

      expect(result).toMatchObject({
        disposalVolume: 123,
      })
    })

    it('blowout location works when checkbox true', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        blowout_checkbox: true,
      })

      expect(result).toMatchObject({
        blowoutLocation: blowoutLabwareId,
      })
    })

    it('disposal volume fields ignored when checkbox false', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        disposalVolume_checkbox: false,
      })

      expect(result).toMatchObject({
        disposalVolume: null,
      })
    })

    it('disposal volume overrides blowout', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        disposalVolume_checkbox: true,
        blowout_checkbox: true,
      })

      expect(result).toMatchObject({
        disposalVolume: 123,
        blowoutLocation: blowoutLabwareId,
      })
    })

    it('fallback to blowout when disposal volume unchecked', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        disposalVolume_checkbox: false,
        blowout_checkbox: true,
      })

      expect(result).toMatchObject({
        disposalVolume: null,
        blowoutLocation: blowoutLabwareId,
      })
    })

    it('should blow out into the destination when checkbox is true and blowout location is destination', () => {
      const result = moveLiquidFormToArgs({
        ...hydratedForm,

        ...disposalVolumeFields,
        blowout_checkbox: true,
        blowout_location: DEST_WELL_BLOWOUT_DESTINATION,
      })

      expect(result).toMatchObject({
        disposalVolume: null,
        blowoutLocation: DEST_WELL_BLOWOUT_DESTINATION,
      })
    })
  })
})

describe('getMixData', () => {
  it('return null if checkbox field is false', () => {
    expect(
      getMixData(
        { checkboxField: false, volumeField: 30, timesField: 2 },
        'checkboxField',
        'volumeField',
        'timesField'
      )
    ).toBe(null)
  })

  it('return null if either number fields <= 0 / null', () => {
    const cases = [
      [0, 5],
      [null, 5],
      [10, 0],
      [10, null],
      [-1, 2],
      [2, -1],
    ]

    cases.forEach(testCase => {
      const [volumeValue, timesValue] = testCase
      expect(
        getMixData(
          {
            checkboxField: true,
            volumeField: volumeValue,
            timesField: timesValue,
          },
          'checkboxField',
          'volumeField',
          'timesField'
        )
      ).toBe(null)
    })
  })

  it('return volume & times if checkbox is checked', () => {
    expect(
      getMixData(
        { checkboxField: true, volumeField: 30, timesField: 2 },
        'checkboxField',
        'volumeField',
        'timesField'
      )
    ).toEqual({ volume: 30, times: 2 })
  })
})

describe('getAirGapData', () => {
  it('should return null when the checkbox field is false', () => {
    expect(
      getAirGapData(
        // @ts-expect-error(sa, 2021-6-15): missing properties on hydrated form data
        { aspirate_airGap_checkbox: false, aspirate_airGap_volume: 20 },
        'aspirate_airGap_checkbox',
        'aspirate_airGap_volume'
      )
    ).toBe(null)
  })
  it('should return the air gap volume when the air gap checkbox is true', () => {
    expect(
      getAirGapData(
        // @ts-expect-error(sa, 2021-6-15): missing properties on hydrated form data
        { aspirate_airGap_checkbox: true, aspirate_airGap_volume: 20 },
        'aspirate_airGap_checkbox',
        'aspirate_airGap_volume'
      )
    ).toBe(20)
  })
})
