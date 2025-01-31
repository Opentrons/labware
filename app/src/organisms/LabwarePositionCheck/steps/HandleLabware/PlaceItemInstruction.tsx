import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { TYPOGRAPHY, LegacyStyledText } from '@opentrons/components'

import {
  selectActiveAdapterDisplayName,
  selectSelectedLwDisplayName,
} from '/app/redux/protocol-runs'

import type { SelectedLabwareInfo } from '/app/redux/protocol-runs'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

interface PlaceItemInstructionProps extends LPCWizardContentProps {
  isLwTiprack: boolean
  slotOnlyDisplayLocation: string
  fullDisplayLocation: string
  labwareInfo: SelectedLabwareInfo
}

export function PlaceItemInstruction({
  runId,
  isLwTiprack,
  slotOnlyDisplayLocation,
  fullDisplayLocation,
  labwareInfo,
}: PlaceItemInstructionProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const { adapterId } = labwareInfo.offsetLocationDetails ?? { adapterId: null }
  const labwareDisplayName = useSelector(selectSelectedLwDisplayName(runId))
  const adapterDisplayName = useSelector(selectActiveAdapterDisplayName(runId))

  if (isLwTiprack) {
    return (
      <Trans
        t={t}
        i18nKey="place_a_full_tip_rack_in_location"
        tOptions={{
          tip_rack: labwareDisplayName,
          location: fullDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  } else if (adapterId != null) {
    return (
      <Trans
        t={t}
        i18nKey="place_labware_in_adapter_in_location"
        tOptions={{
          adapter: adapterDisplayName,
          labware: labwareDisplayName,
          location: slotOnlyDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  } else {
    return (
      <Trans
        t={t}
        i18nKey="place_labware_in_location"
        tOptions={{
          labware: labwareDisplayName,
          location: fullDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  }
}
