import {
  LEFT,
  SINGLE_MOUNT_PIPETTES,
  NINETY_SIX_CHANNEL,
} from '@opentrons/shared-data'
import { FLOWS, SECTIONS } from '../constants'
import { getPipetteWizardSteps } from '../getPipetteWizardSteps'
import type { PipetteWizardStep } from '../types'

describe('getPipetteWizardSteps', () => {
  it('returns the correct array of info when the flow is calibrate single channel', () => {
    const mockCalibrateFlowSteps = [
      {
        section: SECTIONS.BEFORE_BEGINNING,
        mount: LEFT,
        flowType: FLOWS.CALIBRATE,
      },
      {
        section: SECTIONS.ATTACH_PROBE,
        mount: LEFT,
        flowType: FLOWS.CALIBRATE,
      },
      {
        section: SECTIONS.DETACH_PROBE,
        mount: LEFT,
        flowType: FLOWS.CALIBRATE,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.CALIBRATE,
      },
    ] as PipetteWizardStep[]

    expect(
      getPipetteWizardSteps(FLOWS.CALIBRATE, LEFT, SINGLE_MOUNT_PIPETTES)
    ).toStrictEqual(mockCalibrateFlowSteps)
  })
  it('returns the correct array of info for attach pipette flow single channel', () => {
    const mockAttachPipetteFlowSteps = [
      {
        section: SECTIONS.BEFORE_BEGINNING,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.MOUNT_PIPETTE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.ATTACH_PROBE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.DETACH_PROBE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
    ] as PipetteWizardStep[]

    expect(
      getPipetteWizardSteps(FLOWS.ATTACH, LEFT, SINGLE_MOUNT_PIPETTES)
    ).toStrictEqual(mockAttachPipetteFlowSteps)
  })

  it('returns the correct array of info for detach pipette single channel', () => {
    const mockDetachPipetteFlowSteps = [
      {
        section: SECTIONS.BEFORE_BEGINNING,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.DETACH_PIPETTE,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
    ] as PipetteWizardStep[]

    expect(
      getPipetteWizardSteps(FLOWS.DETACH, LEFT, SINGLE_MOUNT_PIPETTES)
    ).toStrictEqual(mockDetachPipetteFlowSteps)
  })

  it('returns the corect array of info for attach pipette 96 channel', () => {
    const mockAttachPipetteFlowSteps = [
      {
        section: SECTIONS.BEFORE_BEGINNING,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.UNSCREW_CARRIAGE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.ATTACH_MOUNTING_PLATE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.MOUNT_PIPETTE,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.ATTACH,
      },
    ] as PipetteWizardStep[]

    expect(
      getPipetteWizardSteps(FLOWS.ATTACH, LEFT, NINETY_SIX_CHANNEL)
    ).toStrictEqual(mockAttachPipetteFlowSteps)
  })

  it('returns the corect array of info for detach pipette 96 channel', () => {
    const mockDetachPipetteFlowSteps = [
      {
        section: SECTIONS.BEFORE_BEGINNING,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.DETACH_PIPETTE,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.DETACH_MOUNTING_PLATE,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.REATTACH_CARRIAGE,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
      {
        section: SECTIONS.RESULTS,
        mount: LEFT,
        flowType: FLOWS.DETACH,
      },
    ] as PipetteWizardStep[]

    expect(
      getPipetteWizardSteps(FLOWS.DETACH, LEFT, NINETY_SIX_CHANNEL)
    ).toStrictEqual(mockDetachPipetteFlowSteps)
  })
})
