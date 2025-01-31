import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockPipetteData1Channel } from '/app/redux/pipettes/__fixtures__'
import { PipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import { GripperWizardFlows } from '/app/organisms/GripperWizardFlows'
import { InstrumentInfo } from '..'

import type { ComponentProps } from 'react'
import type * as ReactRouterDom from 'react-router-dom'
import type { GripperData } from '@opentrons/api-client'

const mockNavigate = vi.fn()

vi.mock('/app/organisms/PipetteWizardFlows')
vi.mock('/app/organisms/GripperWizardFlows')
vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<typeof ReactRouterDom>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof InstrumentInfo>) => {
  return renderWithProviders(<InstrumentInfo {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockGripperData: GripperData = {
  data: {
    jawState: 'mockJawState',
    calibratedOffset: {
      offset: { x: 1, y: 2, z: 1 },
      source: 'mockSource',
    },
  },
  firmwareVersion: '12',
  instrumentModel: 'gripperModel_v1',
  instrumentType: 'gripper',
  mount: 'extension',
  serialNumber: '123',
  subsystem: 'gripper',
  ok: true,
}

const mockGripperDataWithCalData: GripperData = {
  data: {
    jawState: 'mockJawState',
    calibratedOffset: {
      offset: { x: 1, y: 2, z: 1 },
      source: 'mockSource',
      last_modified: '2023-08-15T20:25',
    },
  },
  firmwareVersion: '12',
  instrumentModel: 'gripperModel_v1',
  instrumentType: 'gripper',
  mount: 'extension',
  serialNumber: '123',
  subsystem: 'gripper',
  ok: true,
}

describe('InstrumentInfo', () => {
  let props: ComponentProps<typeof InstrumentInfo>
  beforeEach(() => {
    vi.mocked(PipetteWizardFlows).mockReturnValue(
      <div>mock PipetteWizardFlows</div>
    )
    vi.mocked(GripperWizardFlows).mockReturnValue(
      <div>mock GripperWizardFlows</div>
    )
    props = {
      instrument: mockGripperData,
    }
  })
  it('returns the correct information for a gripper with no cal data', () => {
    render(props)
    screen.getByText('last calibrated')
    screen.getByText('No calibration data')
    screen.getByText('firmware version')
    screen.getByText('12')
    screen.getByText('serial number')
    screen.getByText('123')
    fireEvent.click(screen.getByRole('button', { name: 'detach' }))
    screen.getByText('mock GripperWizardFlows')
    fireEvent.click(screen.getByRole('button', { name: 'calibrate' }))
    screen.getByText('mock GripperWizardFlows')
  })

  it('returns the correct information for a gripper with cal data', () => {
    props = {
      instrument: mockGripperDataWithCalData,
    }
    render(props)
    screen.getByText('last calibrated')
    screen.getByText('8/15/23 20:25 UTC')
    screen.getByText('firmware version')
    screen.getByText('12')
    screen.getByText('serial number')
    screen.getByText('123')
    fireEvent.click(screen.getByRole('button', { name: 'detach' }))
    screen.getByText('mock GripperWizardFlows')
    fireEvent.click(screen.getByRole('button', { name: 'recalibrate' }))
    screen.getByText('mock GripperWizardFlows')
  })

  it('returns the correct information for a pipette with cal data and no firmware version', () => {
    props = {
      instrument: mockPipetteData1Channel,
    }
    render(props)
    screen.getByText('last calibrated')
    screen.getByText('8/25/20 20:25 UTC')
    screen.getByText('serial number')
    screen.getByText('abc')
    fireEvent.click(screen.getByRole('button', { name: 'detach' }))
    screen.getByText('mock PipetteWizardFlows')
    expect(screen.queryByText('Calibrate')).not.toBeInTheDocument()
  })
})
