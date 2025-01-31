import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { when } from 'vitest-when'
import { i18n } from '/app/i18n'
import { ModuleInfo } from '../ModuleInfo'
import { useRunHasStarted } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type { ModuleModel, ModuleType } from '@opentrons/shared-data'

vi.mock('/app/resources/runs')

const render = (props: ComponentProps<typeof ModuleInfo>) => {
  return renderWithProviders(<ModuleInfo {...props} />, {
    i18nInstance: i18n,
  })[0]
}
const mockTCModule = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'TCModuleId',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
}

const MOCK_RUN_ID = '1'

describe('ModuleInfo', () => {
  let props: ComponentProps<typeof ModuleInfo>
  beforeEach(() => {
    props = {
      moduleModel: mockTCModule.model,
      isAttached: false,
      physicalPort: null,
    }
    when(useRunHasStarted).calledWith(MOCK_RUN_ID).thenReturn(false)
  })

  it('should show module not connected', () => {
    render(props)
    screen.getByText('Not connected')
  })

  it('should show module connected and no USB number', () => {
    props = { ...props, isAttached: true }
    render(props)
    screen.getByText('Connected')
    screen.getByText('USB Port Connected')
  })

  it('should show module connected and USB number', () => {
    props = {
      ...props,
      physicalPort: { port: 1, hub: false, portGroup: 'unknown', path: '' },
      isAttached: true,
    }
    render(props)
    screen.getByText('Connected')
    screen.getByText('USB Port 1')
  })

  it('should not show module connected when run has started', () => {
    props = {
      ...props,
      physicalPort: { port: 1, hub: false, portGroup: 'unknown', path: '' },
      isAttached: true,
      runId: MOCK_RUN_ID,
    }
    when(useRunHasStarted).calledWith(MOCK_RUN_ID).thenReturn(true)
    render(props)
    expect(screen.queryByText('Connected')).toBeNull()
    screen.getByText('Connection info not available once run has started')
  })

  it('should show the correct information when the magnetic block is in the protocol', () => {
    props = {
      ...props,
      moduleModel: 'magneticBlockV1',
    }
    render(props)
    screen.getByText('No USB required')
    expect(screen.queryByText('Connected')).toBeNull()
  })
})
