import {
  DEFAULT_CHANGE_TIP_OPTION,
  DEFAULT_MM_FROM_BOTTOM_DISPENSE,
  DEFAULT_WELL_ORDER_FIRST_OPTION,
  DEFAULT_WELL_ORDER_SECOND_OPTION,
  DEFAULT_DELAY_SECONDS,
  DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
} from '../../constants'
import type { StepType, StepFieldName } from '../../form-types'
export function getDefaultsForStepType(
  stepType: StepType
): Record<StepFieldName, any> {
  switch (stepType) {
    case 'mix':
      return {
        // For now, unlike the other mmFromBottom fields, it's initializing to a constant instead of
        // NOTE(IL, 2021-03-12): mix uses dispense for both asp + disp, unless its falsey.
        // using null to represent default (because null becomes 1mm asp, 0.5mm dispense -- see #7470.)
        aspirate_delay_checkbox: false,
        aspirate_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        aspirate_flowRate: null,
        blowout_checkbox: false,
        blowout_flowRate: null,
        blowout_location: null,
        blowout_z_offset: DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
        changeTip: DEFAULT_CHANGE_TIP_OPTION,
        dispense_delay_checkbox: false,
        dispense_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        dispense_flowRate: null,
        dropTip_location: null,
        dropTip_wellNames: undefined,
        labware: null,
        mix_mmFromBottom: DEFAULT_MM_FROM_BOTTOM_DISPENSE,
        mix_touchTip_checkbox: false,
        mix_touchTip_mmFromBottom: null,
        mix_wellOrder_first: DEFAULT_WELL_ORDER_FIRST_OPTION,
        mix_wellOrder_second: DEFAULT_WELL_ORDER_SECOND_OPTION,
        mix_x_position: 0,
        mix_y_position: 0,
        nozzles: null,
        pickUpTip_location: undefined,
        pickUpTip_wellNames: undefined,
        pipette: null,
        times: null,
        tipRack: null,
        volume: undefined,
        wells: [],
      }

    case 'moveLiquid':
      return {
        aspirate_airGap_checkbox: false,
        aspirate_airGap_volume: null,
        aspirate_delay_checkbox: false,
        aspirate_delay_mmFromBottom: null,
        aspirate_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        aspirate_flowRate: null,
        aspirate_labware: null,
        aspirate_mix_checkbox: false,
        aspirate_mix_times: null,
        aspirate_mix_volume: null,
        aspirate_mmFromBottom: null,
        aspirate_touchTip_checkbox: false,
        aspirate_touchTip_mmFromBottom: null,
        aspirate_wellOrder_first: DEFAULT_WELL_ORDER_FIRST_OPTION,
        aspirate_wellOrder_second: DEFAULT_WELL_ORDER_SECOND_OPTION,
        aspirate_wells_grouped: false,
        aspirate_wells: [],
        aspirate_x_position: 0,
        aspirate_y_position: 0,
        blowout_checkbox: false,
        blowout_flowRate: null,
        blowout_location: null,
        blowout_z_offset: DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP,
        changeTip: DEFAULT_CHANGE_TIP_OPTION,
        dispense_airGap_checkbox: false,
        dispense_airGap_volume: null,
        dispense_delay_checkbox: false,
        dispense_delay_mmFromBottom: null,
        dispense_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        dispense_flowRate: null,
        dispense_labware: null,
        dispense_mix_checkbox: false,
        dispense_mix_times: null,
        dispense_mix_volume: null,
        dispense_mmFromBottom: null,
        dispense_touchTip_checkbox: false,
        dispense_touchTip_mmFromBottom: null,
        dispense_wellOrder_first: DEFAULT_WELL_ORDER_FIRST_OPTION,
        dispense_wellOrder_second: DEFAULT_WELL_ORDER_SECOND_OPTION,
        dispense_wells: [],
        dispense_x_position: 0,
        dispense_y_position: 0,
        disposalVolume_checkbox: false,
        disposalVolume_volume: null,
        dropTip_location: null,
        dropTip_wellNames: undefined,
        nozzles: null,
        path: 'single',
        pickUpTip_location: undefined,
        pickUpTip_wellNames: undefined,
        pipette: null,
        preWetTip: false,
        tipRack: null,
        volume: null,
      }

    case 'comment':
      return {
        message: null,
      }
    case 'moveLabware':
      return {
        labware: null,
        newLocation: null,
        useGripper: false,
      }

    case 'pause':
      return {
        moduleId: null,
        pauseAction: null,
        pauseMessage: '',
        pauseTemperature: null,
        pauseTime: null,
      }

    case 'manualIntervention':
      return {
        labwareLocationUpdate: {},
        moduleLocationUpdate: {},
        pipetteLocationUpdate: {},
      }

    case 'magnet':
      return {
        engageHeight: null,
        magnetAction: null,
        moduleId: null,
      }

    case 'temperature':
      return {
        moduleId: null,
        setTemperature: null,
        targetTemperature: null,
      }
    case 'heaterShaker':
      return {
        heaterShakerSetTimer: null,
        heaterShakerTimer: null,
        latchOpen: false,
        moduleId: null,
        setHeaterShakerTemperature: null,
        setShake: null,
        targetHeaterShakerTemperature: null,
        targetSpeed: null,
      }
    case 'thermocycler':
      return {
        blockIsActive: false,
        blockIsActiveHold: false,
        blockTargetTemp: null,
        blockTargetTempHold: null,
        lidIsActive: false,
        lidIsActiveHold: false,
        lidOpen: false,
        lidOpenHold: null,
        lidTargetTemp: null,
        lidTargetTempHold: null,
        moduleId: null,
        orderedProfileItems: [],
        profileItemsById: {},
        profileTargetLidTemp: null,
        profileVolume: null,
        thermocyclerFormType: 'thermocyclerState',
      }

    default:
      return {}
  }
}
