import * as React from 'react'
import { MemoryRouter, Route } from 'react-router-dom'

import { renderWithProviders } from '@opentrons/components'

import { i18n } from '../../../../i18n'
import { CalibrationDashboard } from '..'

import { useGenerateTaskList } from '../../../../organisms/Devices/hooks'
import { expectedTaskList } from '../../../../organisms/Devices/hooks/__fixtures__/taskListFixtures'

jest.mock('../../../../organisms/Devices/hooks')

const mockUseGenerateTaskList = useGenerateTaskList as jest.MockedFunction<
  typeof useGenerateTaskList
>

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <Route path="/devices/:robotName/robot-settings/calibration/dashboard">
        <CalibrationDashboard />
      </Route>
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CalibrationDashboard', () => {
  beforeEach(() => {
    mockUseGenerateTaskList.mockReturnValue(expectedTaskList)
  })

  it('renders a robot calibration dashboard title', () => {
    const [{ getByText }] = render(
      '/devices/otie/robot-settings/calibration/dashboard'
    )

    getByText(`otie Calibration Dashboard`)
  })
})
