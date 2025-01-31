// TODO(mc, 2020-05-07): move to config when we have config migration
// https://github.com/Opentrons/opentrons/issues/5587
export const U2E_DRIVER_UPDATE_URL =
  'https://www.realtek.com/en/component/zoo/category/network-interface-controllers-10-100-1000m-gigabit-ethernet-usb-3-0-software'

// driver statuses

export const NOT_APPLICABLE: 'NOT_APPLICABLE' = 'NOT_APPLICABLE'
export const UNKNOWN: 'UNKNOWN' = 'UNKNOWN'
export const UP_TO_DATE: 'UP_TO_DATE' = 'UP_TO_DATE'
export const OUTDATED: 'OUTDATED' = 'OUTDATED'

// action types

export const INITIALIZED: 'systemInfo:INITIALIZED' = 'systemInfo:INITIALIZED'

export const USB_DEVICE_ADDED: 'systemInfo:USB_DEVICE_ADDED' =
  'systemInfo:USB_DEVICE_ADDED'

export const USB_DEVICE_REMOVED: 'systemInfo:USB_DEVICE_REMOVED' =
  'systemInfo:USB_DEVICE_REMOVED'

export const NETWORK_INTERFACES_CHANGED: 'systemInfo:NETWORK_INTERFACES_CHANGED' =
  'systemInfo:NETWORK_INTERFACES_CHANGED'
