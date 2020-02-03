// @flow
import * as React from 'react'

import { AlertModal } from '@opentrons/components'
import { Portal } from '../portal'

// TODO(mc, 2019-11-20): i18n
// buttons
const CANCEL = 'cancel'
const RESET_SOURCE = 'reset source'

// headings
const RESET_CUSTOM_LABWARE_SOURCE = 'Reset Custom Labware source directory?'

// copy
const CLICK_RESET_SOURCE_TO_RESET_YOUR_CUSTOM_LABWARE_DIRECTORY =
  'Click "Reset Source" to reset your custom labware directory to its default location.'

const LABWARE_FILES_IN_YOUR_CURRENT_DIRECTORY_WILL_NOT_BE_MOVED =
  'Labware in your current source directory will not be moved nor deleted.'

// button names
export const CANCEL_NAME = 'cancel'
export const CONFIRM_NAME = 'confirm'

export type ConfirmResetPathModalProps = {|
  onCancel: () => mixed,
  onConfirm: () => mixed,
|}

export const ConfirmResetPathModalTemplate = ({
  onCancel,
  onConfirm,
}: ConfirmResetPathModalProps) => (
  <AlertModal
    alertOverlay
    heading={RESET_CUSTOM_LABWARE_SOURCE}
    buttons={[
      { name: CANCEL_NAME, children: CANCEL, onClick: onCancel },
      { name: CONFIRM_NAME, children: RESET_SOURCE, onClick: onConfirm },
    ]}
  >
    <p>{CLICK_RESET_SOURCE_TO_RESET_YOUR_CUSTOM_LABWARE_DIRECTORY}</p>
    <p>{LABWARE_FILES_IN_YOUR_CURRENT_DIRECTORY_WILL_NOT_BE_MOVED}</p>
  </AlertModal>
)

export const ConfirmResetPathModal = (props: ConfirmResetPathModalProps) => (
  <Portal>
    <ConfirmResetPathModalTemplate {...props} />
  </Portal>
)
