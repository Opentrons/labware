import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach } from 'vitest'

import { useInstrumentsQuery } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { PipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import { SetupFlexPipetteCalibrationItem } from '../SetupFlexPipetteCalibrationItem'
import { modifiedSimpleV6Protocol as _uncastedModifiedSimpleV6Protocol } from '/app/resources/runs/__fixtures__'

import type { ComponentProps } from 'react'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/PipetteWizardFlows')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/analysis')

const RUN_ID = '1'
const modifiedSimpleV6Protocol = ({
  ..._uncastedModifiedSimpleV6Protocol,
  pipettes: [
    {
      id: 'pipetteId',
      pipetteName: 'p10_single',
    },
  ],
} as any) as CompletedProtocolAnalysis

describe('SetupFlexPipetteCalibrationItem', () => {
  const render = ({
    mount = 'left',
    runId = RUN_ID,
  }: Partial<ComponentProps<typeof SetupFlexPipetteCalibrationItem>> = {}) => {
    return renderWithProviders(
      <MemoryRouter>
        <SetupFlexPipetteCalibrationItem
          {...{
            mount,
            runId,
          }}
        />
      </MemoryRouter>,
      { i18nInstance: i18n }
    )[0]
  }

  beforeEach(() => {
    vi.mocked(PipetteWizardFlows).mockReturnValue(
      <div>pipette wizard flows</div>
    )
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue(
      modifiedSimpleV6Protocol
    )
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [],
      },
    } as any)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the mount and pipette name', () => {
    render()
    screen.getByText('Left Mount')
    screen.getByText('P10 Single-Channel GEN1')
  })

  it('renders an attach button if on a Flex and pipette is not attached', () => {
    render()
    screen.getByText('Left Mount')
    screen.getByText('P10 Single-Channel GEN1')
    const attach = screen.getByRole('button', { name: 'Attach Pipette' })
    fireEvent.click(attach)
    screen.getByText('pipette wizard flows')
  })

  it('renders a calibrate button if on a Flex and pipette is not calibrated', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            instrumentType: 'pipette',
            mount: 'left',
            ok: true,
            firmwareVersion: 12,
            instrumentName: 'p10_single',
            data: {},
          } as any,
        ],
      },
    } as any)
    render()
    screen.getByText('Left Mount')
    screen.getByText('P10 Single-Channel GEN1')
    const attach = screen.getByRole('button', { name: 'Calibrate now' })
    fireEvent.click(attach)
    screen.getByText('pipette wizard flows')
  })

  it('renders calibrated text if on a Flex and pipette is calibrated', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            instrumentType: 'pipette',
            mount: 'left',
            ok: true,
            firmwareVersion: 12,
            instrumentName: 'p10_single',
            data: {
              calibratedOffset: {
                last_modified: 'today',
              },
            },
          } as any,
        ],
      },
    } as any)
    render()
    screen.getByText('Left Mount')
    screen.getByText('P10 Single-Channel GEN1')
    screen.getByText('Last calibrated: today')
  })
})
