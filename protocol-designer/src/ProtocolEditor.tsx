import { scan } from 'react-scan'
import { DndProvider } from 'react-dnd'
import { HashRouter } from 'react-router-dom'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useSelector } from 'react-redux'
import {
  Box,
  DIRECTION_COLUMN,
  Flex,
  OVERFLOW_AUTO,
} from '@opentrons/components'
import { ProtocolRoutes } from './ProtocolRoutes'
import { PortalRoot } from './organisms'
import { getEnableReactScan } from './feature-flags/selectors'

export function ProtocolEditor(): JSX.Element {
  // note for react-scan
  const enableReactScan = useSelector(getEnableReactScan)
  if (typeof window !== 'undefined') {
    scan({
      enabled: enableReactScan,
      log: true,
    })
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box
        width="100%"
        height="100vh"
        overflow={OVERFLOW_AUTO}
        id="protocol-editor"
      >
        <PortalRoot />
        <Flex flexDirection={DIRECTION_COLUMN}>
          <HashRouter>
            <ProtocolRoutes />
          </HashRouter>
        </Flex>
      </Box>
    </DndProvider>
  )
}
