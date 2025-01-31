import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import { renderHook } from '@testing-library/react'
import {
  NINETY_SIX_CHANNEL,
  RIGHT,
  LEFT,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import {
  mock96ChannelAttachedPipetteInformation,
  mockAttachedPipetteInformation,
} from '/app/redux/pipettes/__fixtures__'
import { FLOWS } from '../constants'
import { usePipetteFlowWizardHeaderText } from '../hooks'

import type { FunctionComponent, ReactNode } from 'react'

const BASE_PROPS_FOR_RUN_SETUP = {
  flowType: FLOWS.CALIBRATE,
  selectedPipette: SINGLE_MOUNT_PIPETTES,
  hasCalData: false,
}

describe('usePipetteFlowWizardHeaderText', () => {
  let wrapper: FunctionComponent<{ children: ReactNode }>
  beforeEach(() => {
    wrapper = ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    )
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should return correct title for calibrating single mount', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.CALIBRATE,
          mount: LEFT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Calibrate Left Pipette')
  })
  it('should return correct title for calibrating single mount for right pipette', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.CALIBRATE,
          mount: RIGHT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: null,
            right: mockAttachedPipetteInformation,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Calibrate Right Pipette')
  })
  it('should return correct title for calibrating single mount with cal data', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.CALIBRATE,
          mount: LEFT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: true,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Recalibrate Left Pipette')
  })
  it('should return correct title for calibrating 96 channel', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.CALIBRATE,
          mount: LEFT,
          selectedPipette: NINETY_SIX_CHANNEL,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Calibrate 96-Channel Pipette')
  })
  it('should return correct title for attaching single mount', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.ATTACH,
          mount: LEFT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Attach Left Pipette')
  })
  it('should return correct title for attaching single mount for right pipette', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.ATTACH,
          mount: RIGHT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: null,
            right: mockAttachedPipetteInformation,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Attach Right Pipette')
  })
  it('should return correct title for attaching 96 channel', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.ATTACH,
          mount: LEFT,
          selectedPipette: NINETY_SIX_CHANNEL,
          hasCalData: false,
          isGantryEmpty: true,
          attachedPipettes: {
            left: null,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Attach 96-Channel Pipette')
  })
  it('should return correct title for attaching 96 channel with pipette attached', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.ATTACH,
          mount: LEFT,
          selectedPipette: NINETY_SIX_CHANNEL,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual(
      'Detach Flex 1-Channel 1000 μL and Attach 96-Channel Pipette'
    )
  })
  it('should return correct title for detaching single mount', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.DETACH,
          mount: LEFT,
          selectedPipette: SINGLE_MOUNT_PIPETTES,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Detach Left Pipette')
  })
  it('should return correct title for detaching 96 channel', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          flowType: FLOWS.DETACH,
          mount: LEFT,
          selectedPipette: NINETY_SIX_CHANNEL,
          hasCalData: false,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mock96ChannelAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: null,
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Detach 96-Channel Pipette')
  })
  it('should return correct title for calibrating single mount from pipette info', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_single_flex',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Calibrate Left Pipette')
  })
  it('should return correct title for detaching 96 channel from pipette info and attaching other pipette', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mock96ChannelAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_single_flex',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual(
      'Detach 96-Channel Pipette and Attach Left Pipette'
    )
  })
  it('should return correct title for attaching 96 channel from pipette info', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: true,
          attachedPipettes: {
            left: null,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_96',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Attach 96-Channel Pipette')
  })
  it('should return correct title for detaching pieptte and attaching 96 channel from pipette info on left mount', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_96',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual(
      'Detach Left Pipette and Attach 96-Channel Pipette'
    )
  })
  it('should return correct title for detaching pipette and attaching 96 channel from pipette info from right mount', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: RIGHT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: null,
            right: mockAttachedPipetteInformation,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_96',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual(
      'Detach Right Pipette and Attach 96-Channel Pipette'
    )
  })
  it('should return correct title for detaching 2 pipettes and attaching 96 channel from pipette info', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: RIGHT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: mockAttachedPipetteInformation,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p1000_96',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual(
      'Detach Pipettes and Attach 96-Channel Pipette'
    )
  })
  it('should return correct title when replacing single mount pipette with pipette info', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: false,
          attachedPipettes: {
            left: mockAttachedPipetteInformation,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p50_single_flex',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Replace Left Pipette')
  })
  it('should return correct title when attaching single mount pipette with pipette info', () => {
    const { result } = renderHook(
      () =>
        usePipetteFlowWizardHeaderText({
          ...BASE_PROPS_FOR_RUN_SETUP,
          mount: LEFT,
          isGantryEmpty: true,
          attachedPipettes: {
            left: null,
            right: null,
          },
          pipetteInfo: [
            {
              id: 'id',
              pipetteName: 'p50_single_flex',
              mount: LEFT,
            },
          ],
        }),
      {
        wrapper,
      }
    )
    expect(result.current).toEqual('Attach Left Pipette')
  })
})
