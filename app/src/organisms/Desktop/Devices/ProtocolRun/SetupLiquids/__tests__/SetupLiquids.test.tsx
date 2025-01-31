import { describe, it, beforeEach, vi, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { useHoverTooltip } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SetupLiquids } from '../index'
import { SetupLiquidsList } from '../SetupLiquidsList'
import { SetupLiquidsMap } from '../SetupLiquidsMap'
import { useRunHasStarted } from '/app/resources/runs'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/components', async () => {
  const actual = await vi.importActual('@opentrons/components')
  return {
    ...actual,
    useHoverTooltip: vi.fn(),
  }
})
vi.mock('../SetupLiquidsList')
vi.mock('../SetupLiquidsMap')
vi.mock('/app/resources/runs')

describe('SetupLiquids', () => {
  const render = (
    props: ComponentProps<typeof SetupLiquids> & {
      startConfirmed?: boolean
    }
  ) => {
    let isConfirmed =
      props?.startConfirmed == null ? false : props.startConfirmed
    const confirmFn = vi.fn((confirmed: boolean) => {
      isConfirmed = confirmed
    })
    return renderWithProviders(
      <SetupLiquids
        runId="123"
        protocolAnalysis={null}
        isLiquidSetupConfirmed={isConfirmed}
        setLiquidSetupConfirmed={confirmFn}
        robotName="robotName"
      />,
      {
        i18nInstance: i18n,
      }
    )
  }

  let props: ComponentProps<typeof SetupLiquids>
  beforeEach(() => {
    vi.mocked(SetupLiquidsList).mockReturnValue(
      <div>Mock setup liquids list</div>
    )
    vi.mocked(SetupLiquidsMap).mockReturnValue(
      <div>Mock setup liquids map</div>
    )
    vi.mocked(useHoverTooltip).mockReturnValue([{}, {}] as any)
    vi.mocked(useRunHasStarted).mockReturnValue(false)
  })

  it('renders the list and map view buttons and proceed button', () => {
    render(props)
    screen.getByRole('button', { name: 'List View' })
    screen.getByRole('button', { name: 'Map View' })
    screen.getByRole('button', { name: 'Confirm locations and volumes' })
  })
  it('renders the map view when you press that toggle button', () => {
    render(props)
    const mapViewButton = screen.getByRole('button', { name: 'Map View' })
    fireEvent.click(mapViewButton)
    screen.getByText('Mock setup liquids map')
  })
  it('renders the list view when you press that toggle button', () => {
    render(props)
    const mapViewButton = screen.getByRole('button', { name: 'List View' })
    fireEvent.click(mapViewButton)
    screen.getByText('Mock setup liquids list')
  })
  it('disables the confirmation button if the run has already started', () => {
    vi.mocked(useRunHasStarted).mockReturnValue(true)

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Confirm locations and volumes',
    })

    expect(btn).toBeDisabled()
  })
})
