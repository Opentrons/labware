import { vi, it, describe, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { getPipetteModelSpecs } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LEFT, RIGHT } from '/app/redux/pipettes'
import * as Fixtures from '/app/redux/sessions/__fixtures__'
import { RenderMountInformation } from '../RenderMountInformation'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getPipetteModelSpecs>()
  return {
    ...actual,
    getPipetteModelSpecs: vi.fn(),
  }
})

const mockSessionDetails = Fixtures.mockRobotCalibrationCheckSessionDetails

const render = (props: ComponentProps<typeof RenderMountInformation>) => {
  return renderWithProviders(<RenderMountInformation {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RenderMountInformation', () => {
  let props: ComponentProps<typeof RenderMountInformation>

  beforeEach(() => {
    props = {
      mount: LEFT,
      pipette: mockSessionDetails.instruments[0],
    }
    vi.mocked(getPipetteModelSpecs).mockReturnValue({
      displayName: 'mock pipette display name',
    } as any)
  })

  it('should render left mount with mock pipette', () => {
    render(props)
    screen.getByText('left MOUNT')
    screen.getByText('mock pipette display name')
  })

  it('should render right mount with mock pipette', () => {
    props.mount = RIGHT
    render(props)
    screen.getByText('right MOUNT')
    screen.getByText('mock pipette display name')
  })

  it('should render empty without pipette', () => {
    props.pipette = undefined
    render(props)
    screen.getByText('left MOUNT')
    screen.getByText('empty')
  })
})
