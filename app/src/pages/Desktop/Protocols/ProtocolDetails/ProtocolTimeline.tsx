import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Icon,
  Box,
  SPACING,
  ProtocolTimelineScrubber,
} from '@opentrons/components'
import { fetchProtocols, getStoredProtocol } from '/app/redux/protocol-storage'

import type { Dispatch, State } from '/app/redux/types'
import type { DesktopRouteParams } from '/app/App/types'

export function ProtocolTimeline(): JSX.Element {
  const { protocolKey } = useParams<
    keyof DesktopRouteParams
  >() as DesktopRouteParams
  const dispatch = useDispatch<Dispatch>()
  const storedProtocol = useSelector((state: State) =>
    getStoredProtocol(state, protocolKey)
  )

  useEffect(() => {
    dispatch(fetchProtocols())
  }, [])

  return storedProtocol != null && storedProtocol.mostRecentAnalysis != null ? (
    <Box padding={SPACING.spacing16}>
      <ProtocolTimelineScrubber analysis={storedProtocol.mostRecentAnalysis} />
    </Box>
  ) : (
    <Icon size="8rem" name="ot-spinner" spin />
  )
}
