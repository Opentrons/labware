import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getIsLabwareOffsetCodeSnippetsOn } from '/app/redux/config'
import { ResultsSummary } from '../ResultsSummary'
import { SECTIONS } from '../constants'
import { mockTipRackDefinition } from '/app/redux/custom-labware/__fixtures__'
import {
  mockCompletedAnalysis,
  mockExistingOffsets,
  mockWorkingOffsets,
} from '../__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof ResultsSummary>) => {
  return renderWithProviders(<ResultsSummary {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ResultsSummary', () => {
  let props: ComponentProps<typeof ResultsSummary>

  beforeEach(() => {
    props = {
      section: SECTIONS.RESULTS_SUMMARY,
      protocolData: mockCompletedAnalysis,
      workingOffsets: mockWorkingOffsets,
      existingOffsets: mockExistingOffsets,
      isApplyingOffsets: false,
      isDeletingMaintenanceRun: false,
      handleApplyOffsets: vi.fn(),
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('renders correct copy', () => {
    render(props)
    screen.getByText('New labware offset data')
    screen.getByRole('button', { name: 'Apply offsets' })
    screen.getByRole('link', { name: 'Need help?' })
    screen.getByRole('columnheader', { name: 'location' })
    screen.getByRole('columnheader', { name: 'labware' })
    screen.getByRole('columnheader', { name: 'labware offset data' })
  })
  it('calls handle apply offsets function when button is clicked', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Apply offsets' }))
    expect(props.handleApplyOffsets).toHaveBeenCalled()
  })
  it('does disables the CTA to apply offsets when offsets are already being applied', () => {
    props.isApplyingOffsets = true
    render(props)
    const button = screen.getByRole('button', { name: 'Apply offsets' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(props.handleApplyOffsets).not.toHaveBeenCalled()
  })
  it('does disables the CTA to apply offsets when the maintenance run is being deleted', () => {
    props.isDeletingMaintenanceRun = true
    render(props)
    const button = screen.getByRole('button', { name: 'Apply offsets' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(props.handleApplyOffsets).not.toHaveBeenCalled()
  })
  it('renders a row per offset to apply', () => {
    render(props)
    expect(
      screen.queryAllByRole('cell', {
        name: mockTipRackDefinition.metadata.displayName,
      })
    ).toHaveLength(2)
    screen.getByRole('cell', { name: 'Slot 1' })
    screen.getByRole('cell', { name: 'Slot 3' })
    screen.getByRole('cell', { name: 'X 1.0 Y 1.0 Z 1.0' })
    screen.getByRole('cell', { name: 'X 3.0 Y 3.0 Z 3.0' })
  })

  it('renders tabbed offset data with snippets when config option is selected', () => {
    vi.mocked(getIsLabwareOffsetCodeSnippetsOn).mockReturnValue(true)
    render(props)
    expect(screen.getByText('Table View')).toBeTruthy()
    expect(screen.getByText('Jupyter Notebook')).toBeTruthy()
    expect(screen.getByText('Command Line Interface (SSH)')).toBeTruthy()
  })
})
