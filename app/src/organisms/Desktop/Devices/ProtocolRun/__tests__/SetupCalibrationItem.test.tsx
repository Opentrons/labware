import { screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { describe, it, beforeEach, vi, afterEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useRunHasStarted } from '/app/resources/runs'
import { formatTimestamp } from '/app/transformations/runs'
import { SetupCalibrationItem } from '../SetupCalibrationItem'

import type { ComponentProps } from 'react'

vi.mock('/app/resources/runs')
vi.mock('/app/transformations/runs')

const RUN_ID = '1'

describe('SetupCalibrationItem', () => {
  const render = ({
    subText = undefined,
    calibratedDate = null,
    title = 'stub title',
    button = <button>stub button</button>,
    runId = RUN_ID,
  }: Partial<ComponentProps<typeof SetupCalibrationItem>> = {}) => {
    return renderWithProviders(
      <SetupCalibrationItem
        {...{ subText, calibratedDate, title, button, runId }}
      />,
      { i18nInstance: i18n }
    )[0]
  }

  beforeEach(() => {
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(false)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders all nodes with prop contents', () => {
    render({ subText: 'stub subtext' })
    screen.getByText('stub title')
    screen.getByText('stub subtext')
    screen.getByRole('button', { name: 'stub button' })
  })
  it('renders calibrated date if there is no subtext', () => {
    when(vi.mocked(formatTimestamp))
      .calledWith('Thursday, September 9, 2021')
      .thenReturn('09/09/2021 00:00:00')
    render({
      calibratedDate: 'Thursday, September 9, 2021',
    })
    screen.getByText('Last calibrated: 09/09/2021 00:00:00')
  })
  it('renders not calibrated if there is no subtext or cal date', () => {
    render()
    screen.getByText('Not calibrated yet')
  })
  it('renders calibration data not available if run has started', () => {
    when(vi.mocked(useRunHasStarted)).calledWith(RUN_ID).thenReturn(true)
    render()
    screen.getByText('Calibration data not available once run has started')
  })
})
