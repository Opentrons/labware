import { Component } from 'react'
import { useLogger } from '../../logger'
import { LabwarePositionCheckComponent } from './LabwarePositionCheckComponent'
import { FatalErrorModal } from './FatalErrorModal'
import { getIsOnDevice } from '/app/redux/config'
import { useSelector } from 'react-redux'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import type { ErrorInfo, ReactNode } from 'react'
import type {
  CompletedProtocolAnalysis,
  RobotType,
} from '@opentrons/shared-data'
import type { LabwareOffset } from '@opentrons/api-client'

interface LabwarePositionCheckModalProps {
  onCloseClick: () => void
  runId: string
  maintenanceRunId: string
  robotType: RobotType
  existingOffsets: LabwareOffset[]
  mostRecentAnalysis: CompletedProtocolAnalysis | null
  protocolName: string
  caughtError?: Error
  setMaintenanceRunId: (id: string | null) => void
  isDeletingMaintenanceRun: boolean
}

// We explicitly wrap LabwarePositionCheckComponent in an ErrorBoundary because an error might occur while pulling in
// the component's dependencies (like useLabwarePositionCheck). If we wrapped the contents of LabwarePositionCheckComponent
// in an ErrorBoundary as part of its return value (render), an error could occur before this point, meaning the error boundary
// would never get invoked
export const LegacyLabwarePositionCheck = (
  props: LabwarePositionCheckModalProps
): JSX.Element => {
  const logger = useLogger(new URL('', import.meta.url).pathname)
  const isOnDevice = useSelector(getIsOnDevice)
  return (
    <ErrorBoundary
      logger={logger}
      ErrorComponent={FatalErrorModal}
      shouldUseMetalProbe={props.robotType === FLEX_ROBOT_TYPE}
      onClose={props.onCloseClick}
      isOnDevice={isOnDevice}
    >
      <LabwarePositionCheckComponent {...props} />
    </ErrorBoundary>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  onClose: () => void
  shouldUseMetalProbe: boolean
  logger: ReturnType<typeof useLogger>
  ErrorComponent: (props: {
    errorMessage: string
    shouldUseMetalProbe: boolean
    onClose: () => void
    isOnDevice: boolean
  }) => JSX.Element
  isOnDevice: boolean
}
class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.logger.error(`LPC error message: ${error.message}`)
    this.props.logger.error(
      `LPC error component stack: ${errorInfo.componentStack}`
    )
    this.setState({
      error,
    })
  }

  render(): ErrorBoundaryProps['children'] | JSX.Element {
    const {
      ErrorComponent,
      children,
      shouldUseMetalProbe,
      isOnDevice,
    } = this.props
    const { error } = this.state
    if (error != null)
      return (
        <ErrorComponent
          errorMessage={error.message}
          shouldUseMetalProbe={shouldUseMetalProbe}
          onClose={this.props.onClose}
          isOnDevice={isOnDevice}
        />
      )
    // Normally, just render children
    return children
  }
}
