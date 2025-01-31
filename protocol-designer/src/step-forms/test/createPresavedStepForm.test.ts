import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
  fixtureP10SingleV2Specs,
} from '@opentrons/shared-data'
import { fixture_tiprack_10_ul } from '@opentrons/shared-data/labware/fixtures/2'
import { getStateAndContextTempTCModules } from '@opentrons/step-generation'
import {
  DEFAULT_DELAY_SECONDS,
  DEFAULT_MM_OFFSET_FROM_BOTTOM,
} from '../../constants'
import { createPresavedStepForm } from '../utils/createPresavedStepForm'
import type { CreatePresavedStepFormArgs } from '../utils/createPresavedStepForm'

const stepId = 'stepId123'
const EXAMPLE_ENGAGE_HEIGHT = '18'
let defaultArgs: any
beforeEach(() => {
  const { robotState } = getStateAndContextTempTCModules({
    temperatureModuleId: 'someTemperatureModuleId',
    thermocyclerId: 'someThermocyclerModuleId',
  })
  const leftPipette = {
    name: 'p10_single',
    id: 'leftPipetteId',
    spec: fixtureP10SingleV2Specs,
    tiprackLabwareDef: [fixture_tiprack_10_ul],
    tiprackDefURI: ['defaultTipRack'],
  }
  const labwareOnMagModule = {
    id: 'labwareOnMagModule',
    def: {
      parameters: {
        magneticModuleEngageHeight: EXAMPLE_ENGAGE_HEIGHT,
        isTiprack: false,
      },
    },
  }
  const tipRack = {
    id: 'tipRack',
    def: fixture_tiprack_10_ul,
  }
  defaultArgs = {
    stepId,
    pipetteEntities: {
      leftPipetteId: { ...leftPipette },
    },
    labwareEntities: {
      labwareOnMagModule: {
        labwareOnMagModule,
      },
    },
    additionalEquipmentEntities: {
      mockTrash: { name: 'trashBin', id: 'mockTrash', location: 'A3' },
    },
    savedStepForms: {},
    orderedStepIds: [],
    initialDeckSetup: {
      labware: {
        labwareOnMagModule: {
          ...labwareOnMagModule,
          slot: 'someMagneticModuleId',
        },
      },
      tipRack: {
        ...tipRack,
        slot: '6',
      },
      modules: {
        someMagneticModuleId: {
          id: 'someMagneticModuleId',
          type: MAGNETIC_MODULE_TYPE,
          model: MAGNETIC_MODULE_V2,
          slot: '1',
        },
        someTemperatureModuleId: {
          id: 'someTemperatureModuleId',
          type: TEMPERATURE_MODULE_TYPE,
          model: TEMPERATURE_MODULE_V2,
          slot: '3',
        },
        someThermocyclerModuleId: {
          id: 'someTemperatureModuleId',
          type: THERMOCYCLER_MODULE_TYPE,
          model: THERMOCYCLER_MODULE_V1,
          slot: '3',
        },
      },
      pipettes: {
        leftPipetteId: { ...leftPipette, mount: 'left' },
      },
    },
    robotStateTimeline: {
      timeline: [
        {
          commands: [],
          robotState,
        },
      ],
    },
  }
})
afterEach(() => {
  vi.resetAllMocks()
})
describe('createPresavedStepForm', () => {
  ;[true, false].forEach(hasTempModule => {
    it(`should populate initial values for a new pause step (with ${
      hasTempModule ? '' : 'NO'
    } temp module)`, () => {
      const args: CreatePresavedStepFormArgs = {
        ...defaultArgs,
        stepType: 'pause',
        initialDeckSetup: hasTempModule
          ? defaultArgs.initialDeckSetup
          : { ...defaultArgs.initialDeckSetup, modules: {} },
      }
      expect(createPresavedStepForm(args)).toEqual({
        id: stepId,
        stepType: 'pause',
        moduleId: hasTempModule ? 'someTemperatureModuleId' : null,
        pauseAction: null,
        pauseMessage: '',
        pauseTime: null,
        pauseTemperature: null,
        stepDetails: '',
        stepName: 'pause',
      })
    })
  })
  it(`should call handleFormChange with a default pipette and drop tip location for "moveLiquid" step`, () => {
    const args = { ...defaultArgs, stepType: 'moveLiquid' }
    expect(createPresavedStepForm(args)).toEqual({
      id: stepId,
      pipette: 'leftPipetteId',
      nozzles: null,
      stepType: 'moveLiquid',
      tipRack: null,
      // default fields
      dropTip_wellNames: undefined,
      dropTip_location: 'mockTrash',
      pickUpTip_location: undefined,
      pickUpTip_wellNames: undefined,
      aspirate_airGap_checkbox: false,
      aspirate_airGap_volume: '1',
      aspirate_delay_checkbox: false,
      aspirate_delay_mmFromBottom: null,
      aspirate_delay_seconds: '1',
      dispense_delay_checkbox: false,
      dispense_delay_seconds: '1',
      dispense_delay_mmFromBottom: null,
      aspirate_flowRate: null,
      aspirate_labware: null,
      aspirate_mix_checkbox: false,
      aspirate_mix_times: null,
      aspirate_mix_volume: null,
      aspirate_mmFromBottom: null,
      aspirate_touchTip_checkbox: false,
      aspirate_touchTip_mmFromTop: null,
      aspirate_wellOrder_first: 't2b',
      aspirate_wellOrder_second: 'l2r',
      aspirate_wells: [],
      aspirate_wells_grouped: false,
      blowout_checkbox: false,
      blowout_location: null,
      changeTip: 'always',
      dispense_airGap_checkbox: false,
      dispense_airGap_volume: '1',
      dispense_flowRate: null,
      dispense_labware: null,
      dispense_mix_checkbox: false,
      dispense_mix_times: null,
      dispense_mix_volume: null,
      dispense_mmFromBottom: null,
      dispense_touchTip_checkbox: false,
      dispense_touchTip_mmFromTop: null,
      dispense_wellOrder_first: 't2b',
      dispense_wellOrder_second: 'l2r',
      dispense_wells: [],
      disposalVolume_checkbox: true,
      disposalVolume_volume: '1',
      path: 'single',
      preWetTip: false,
      stepDetails: '',
      stepName: 'transfer',
      volume: null,
      aspirate_x_position: 0,
      aspirate_y_position: 0,
      dispense_x_position: 0,
      dispense_y_position: 0,
      blowout_z_offset: 0,
      blowout_flowRate: null,
    })
  })
  describe('mix step', () => {
    it('should call handleFormChange with a default pipette and drop tip location for mix step', () => {
      const args = { ...defaultArgs, stepType: 'mix' }
      expect(createPresavedStepForm(args)).toEqual({
        id: stepId,
        pipette: 'leftPipetteId',
        stepType: 'mix',
        // default fields
        labware: null,
        nozzles: null,
        dropTip_wellNames: undefined,
        dropTip_location: 'mockTrash',
        pickUpTip_location: undefined,
        pickUpTip_wellNames: undefined,
        wells: [],
        aspirate_delay_checkbox: false,
        aspirate_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        dispense_delay_checkbox: false,
        dispense_delay_seconds: `${DEFAULT_DELAY_SECONDS}`,
        mix_mmFromBottom: DEFAULT_MM_OFFSET_FROM_BOTTOM,
        mix_touchTip_mmFromTop: null,
        mix_wellOrder_first: 't2b',
        mix_wellOrder_second: 'l2r',
        blowout_checkbox: false,
        mix_x_position: 0,
        mix_y_position: 0,
        blowout_z_offset: 0,
        blowout_location: null,
        changeTip: 'always',
        stepDetails: '',
        stepName: 'mix',
        mix_touchTip_checkbox: false,
        times: null,
        volume: undefined,
        aspirate_flowRate: null,
        dispense_flowRate: null,
        tipRack: null,
        blowout_flowRate: null,
      })
    })
  })
  it('should set a default magnetic module for magnet step, and set engage height and magnetAction=engage, when it is the first magnet step in the timeline', () => {
    const args = { ...defaultArgs, stepType: 'magnet' }
    expect(createPresavedStepForm(args)).toEqual({
      id: stepId,
      stepType: 'magnet',
      moduleId: 'someMagneticModuleId',
      engageHeight: EXAMPLE_ENGAGE_HEIGHT,
      magnetAction: 'engage',
      // Default values
      stepName: 'magnet',
      stepDetails: '',
    })
  })
  it('should set a default magnetic module for magnet step, and set magnetAction=disengage, when the previous magnet step is an engage', () => {
    const args = {
      ...defaultArgs,
      savedStepForms: {
        prevStepId: {
          id: 'prevStepId',
          stepType: 'magnet',
          moduleId: 'someMagneticModuleId',
          engageHeight: EXAMPLE_ENGAGE_HEIGHT,
          magnetAction: 'engage',
          stepName: 'magnet',
          stepDetails: '',
        },
      },
      orderedStepIds: ['prevStepId'],
      stepType: 'magnet',
    }
    expect(createPresavedStepForm(args)).toEqual({
      id: stepId,
      stepType: 'magnet',
      moduleId: 'someMagneticModuleId',
      engageHeight: EXAMPLE_ENGAGE_HEIGHT,
      magnetAction: 'disengage',
      stepName: 'magnet',
      stepDetails: '',
    })
  })
  it('should set a default magnetic module for magnet step, and set magnetAction=engage, when the previous magnet step is a disengage', () => {
    const args = {
      ...defaultArgs,
      savedStepForms: {
        prevStepId: {
          id: 'prevStepId',
          stepType: 'magnet',
          moduleId: 'someMagneticModuleId',
          engageHeight: EXAMPLE_ENGAGE_HEIGHT,
          magnetAction: 'disengage',
          stepName: 'magnet',
          stepDetails: '',
        },
      },
      orderedStepIds: ['prevStepId'],
      stepType: 'magnet',
    }
    expect(createPresavedStepForm(args)).toEqual({
      id: stepId,
      stepType: 'magnet',
      moduleId: 'someMagneticModuleId',
      engageHeight: EXAMPLE_ENGAGE_HEIGHT,
      magnetAction: 'engage',
      stepName: 'magnet',
      stepDetails: '',
    })
  })
  it('should set a default temperature module when a Temperature step is added', () => {
    const args = { ...defaultArgs, stepType: 'temperature' }
    expect(createPresavedStepForm(args)).toEqual({
      id: stepId,
      stepType: 'temperature',
      moduleId: 'someTemperatureModuleId',
      // Default fields
      setTemperature: null,
      targetTemperature: null,
      stepName: 'temperature',
      stepDetails: '',
    })
  })
  ;[true, false].forEach(timelineHasErrors => {
    ;[true, false].forEach(isFirstThermocyclerStep => {
      const testName = `should set a default thermocycler module and set TC state defaults when ${
        isFirstThermocyclerStep
          ? 'the first Thermocycler step is added'
          : 'a following Thermocycler step is added'
      }${timelineHasErrors ? ' and timeline has errors' : ''}`
      it(testName, () => {
        // mutate robot state in defaultArgs
        if (timelineHasErrors) {
          defaultArgs.robotStateTimeline = {
            errors: ['OH NO!'],
            timeline: [],
          }
        } else {
          const thermocyclerModuleState =
            defaultArgs.robotStateTimeline.timeline[0].robotState.modules
              .someThermocyclerModuleId
          thermocyclerModuleState.moduleState = {
            ...thermocyclerModuleState.moduleState,
            blockTargetTemp: 42,
            lidTargetTemp: 43,
            lidOpen: true,
          }
        }

        const args = { ...defaultArgs, stepType: 'thermocycler' }

        if (isFirstThermocyclerStep) {
          args.savedStepForms = {
            prevStepId: {
              stepType: 'thermocycler',
              // TC Default fields (should all be ignored, robotState is used to populate the form)
              stepName: 'thermocycler',
              stepDetails: '',
              thermocyclerFormType: 'thermocyclerState',
              blockIsActive: false,
              blockTargetTemp: null,
              lidIsActive: false,
              lidTargetTemp: null,
              lidOpen: null,
              profileVolume: null,
              profileTargetLidTemp: null,
              orderedProfileItems: [],
              profileItemsById: {},
              blockIsActiveHold: false,
              blockTargetTempHold: null,
              lidIsActiveHold: false,
              lidTargetTempHold: null,
              lidOpenHold: null,
            },
          }
          args.orderedStepIds = ['prevStepId']
        }

        expect(createPresavedStepForm(args)).toEqual({
          blockIsActive: !timelineHasErrors,
          blockIsActiveHold: false,
          blockTargetTemp: timelineHasErrors ? null : 42,
          blockTargetTempHold: null,
          id: stepId,
          lidIsActive: !timelineHasErrors,
          lidIsActiveHold: false,
          lidOpen: !timelineHasErrors,
          lidOpenHold: null,
          lidTargetTemp: timelineHasErrors ? null : 43,
          lidTargetTempHold: null,
          moduleId: 'someThermocyclerModuleId',
          orderedProfileItems: [],
          profileItemsById: {},
          profileTargetLidTemp: null,
          profileVolume: null,
          stepDetails: '',
          stepName: 'thermocycler',
          stepType: 'thermocycler',
          thermocyclerFormType: 'thermocyclerState',
        })
      })
    })
  })
  it('should default movdLabware form useGripper value to `true` if gripper is added', () => {
    const args = {
      ...defaultArgs,
      additionalEquipmentEntities: {
        gripperId: { name: 'gripper', id: 'gripperId' },
      },
      stepType: 'moveLabware',
    }
    expect(createPresavedStepForm(args)).toHaveProperty('useGripper', true)
  })
})
