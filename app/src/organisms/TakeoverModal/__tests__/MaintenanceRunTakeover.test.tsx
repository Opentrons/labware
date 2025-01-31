import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { useMaintenanceRunTakeover } from '../useMaintenanceRunTakeover'
import { MaintenanceRunTakeover } from '../MaintenanceRunTakeover'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'

import type { ComponentProps } from 'react'
import type { MaintenanceRunStatus } from '../MaintenanceRunStatusProvider'

vi.mock('../useMaintenanceRunTakeover')
vi.mock('/app/resources/maintenance_runs')

const MOCK_MAINTENANCE_RUN: MaintenanceRunStatus = {
  getRunIds: () => ({
    currentRunId: null,
    oddRunId: null,
  }),
  setOddRunIds: () => null,
}

const render = (props: ComponentProps<typeof MaintenanceRunTakeover>) => {
  return renderWithProviders(<MaintenanceRunTakeover {...props} />, {
    i18nInstance: i18n,
  })
}

describe('MaintenanceRunTakeover', () => {
  let props: ComponentProps<typeof MaintenanceRunTakeover>
  const testComponent = <div>{'Test Component'}</div>

  beforeEach(() => {
    props = { children: [testComponent] }
    vi.mocked(useMaintenanceRunTakeover).mockReturnValue(MOCK_MAINTENANCE_RUN)
    vi.mocked(useNotifyCurrentMaintenanceRun).mockReturnValue({
      data: {
        data: {
          id: 'test',
        },
      },
    } as any)
  })

  it('renders child components successfuly', () => {
    render(props)
    screen.getByText('Test Component')
  })

  it('does not render a takeover modal if no maintenance run has been initiated', () => {
    render(props)

    expect(screen.queryByText('Robot is busy')).not.toBeInTheDocument()
  })

  it('does not render a takeover modal if a maintenance run has been initiated by the ODD', () => {
    const MOCK_ODD_RUN = {
      ...MOCK_MAINTENANCE_RUN,
      getRunIds: () => ({
        currentRunId: 'testODD',
        oddRunId: 'testODD',
      }),
    }

    vi.mocked(useMaintenanceRunTakeover).mockReturnValue(MOCK_ODD_RUN)

    render(props)
    expect(screen.queryByText('Robot is busy')).not.toBeInTheDocument()
  })

  it('renders a takeover modal if a maintenance run has been initiated by the desktop', () => {
    const MOCK_DESKTOP_RUN = {
      ...MOCK_MAINTENANCE_RUN,
      getRunIds: () => ({
        currentRunId: 'testRunDesktop',
        oddRunId: null,
      }),
    }

    vi.mocked(useMaintenanceRunTakeover).mockReturnValue(MOCK_DESKTOP_RUN)

    render(props)
  })
})
