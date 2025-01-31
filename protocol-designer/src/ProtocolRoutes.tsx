import { Route, Navigate, Routes, useNavigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { Box } from '@opentrons/components'
import {
  CreateNewProtocolWizard,
  Designer,
  Landing,
  Liquids,
  ProtocolOverview,
  Settings,
} from './pages'
import {
  FileUploadMessagesModal,
  GateModal,
  Kitchen,
  LabwareUploadModal,
  Navigation,
} from './organisms'
import { ProtocolDesignerAppFallback } from './resources/ProtocolDesignerAppFallback'

import type { RouteProps } from './types'

const pdRoutes: RouteProps[] = [
  {
    Component: ProtocolOverview,
    name: 'Protocol overview',
    navLinkTo: '/overview',
    path: '/overview',
  },
  {
    Component: Liquids,
    name: 'Liquids',
    navLinkTo: '/liquids',
    path: '/liquids',
  },
  {
    Component: Designer,
    name: 'Edit protocol',
    navLinkTo: '/designer',
    path: '/designer',
  },
  {
    Component: CreateNewProtocolWizard,
    name: 'Create new protocol',
    navLinkTo: '/createNew',
    path: '/createNew',
  },
  {
    Component: Settings,
    name: 'Settings',
    navLinkTo: '/settings',
    path: '/settings',
  },
]

export function ProtocolRoutes(): JSX.Element {
  const landingPage: RouteProps = {
    Component: Landing,
    name: 'Landing',
    navLinkTo: '/',
    path: '/',
  }
  const allRoutes: RouteProps[] = [...pdRoutes, landingPage]
  const navigate = useNavigate()
  const handleReset = (): void => {
    navigate('/', { replace: true })
  }

  return (
    <ErrorBoundary
      FallbackComponent={ProtocolDesignerAppFallback}
      onReset={handleReset}
    >
      <Navigation />
      <Kitchen>
        <Box width="100%" height="100%">
          <GateModal />
          <LabwareUploadModal />
          <FileUploadMessagesModal />
          <Routes>
            {allRoutes.map(({ Component, path }: RouteProps) => {
              return <Route key={path} path={path} element={<Component />} />
            })}
            <Route path="*" element={<Navigate to={landingPage.path} />} />
          </Routes>
        </Box>
      </Kitchen>
    </ErrorBoundary>
  )
}
