import { css } from 'styled-components'
import { TYPOGRAPHY, RESPONSIVENESS } from '@opentrons/components'

export const SECTIONS = {
  BEFORE_BEGINNING: 'BEFORE_BEGINNING',
  ATTACH_PROBE: 'ATTACH_PROBE',
  DETACH_PROBE: 'DETACH_PROBE',
  RESULTS: 'RESULTS',
  MOUNT_PIPETTE: 'MOUNT_PIPETTE',
  DETACH_PIPETTE: 'DETACH_PIPETTE',
  MOUNTING_PLATE: 'MOUNTING_PLATE',
  CARRIAGE: 'CARRIAGE',
  FIRMWARE_UPDATE: 'FIRMWARE_UPDATE',
} as const

export const FLOWS = {
  ATTACH: 'ATTACH',
  DETACH: 'DETACH',
  CALIBRATE: 'CALIBRATE',
}

// note: we will not be translating these item titles to be consistent with manuals
export const CALIBRATION_PROBE_DISPLAY_NAME = 'Calibration Probe'
export const HEX_SCREWDRIVER_DISPLAY_NAME = '2.5 mm Hex Screwdriver'
export const PIPETTE_DISPLAY_NAME = '1- or 8-Channel Pipette'
export const NINETY_SIX_CHANNEL_DISPLAY_NAME = '96-Channel Pipette'
export const NINETY_SIX_CHANNEL_MOUNTING_PLATE_DISPLAY_NAME =
  '96-Channel Mounting Plate'

//  required equipment list
export const CALIBRATION_PROBE = {
  loadName: 'calibration_probe',
  displayName: CALIBRATION_PROBE_DISPLAY_NAME,
}
export const HEX_SCREWDRIVER = {
  loadName: 'hex_screwdriver',
  displayName: HEX_SCREWDRIVER_DISPLAY_NAME,
}
export const PIPETTE = {
  loadName: 'flex_pipette',
  displayName: PIPETTE_DISPLAY_NAME,
}
export const NINETY_SIX_CHANNEL_PIPETTE = {
  loadName: 'pipette_96',
  displayName: NINETY_SIX_CHANNEL_DISPLAY_NAME,
}
export const NINETY_SIX_CHANNEL_MOUNTING_PLATE = {
  loadName: 'mounting_plate_96_channel',
  displayName: NINETY_SIX_CHANNEL_MOUNTING_PLATE_DISPLAY_NAME,
}

export const BODY_STYLE = css`
  ${TYPOGRAPHY.pRegular};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.275rem;
    line-height: 1.75rem;
  }
`
