import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { PipetteOverflowMenu } from '../PipetteOverflowMenu'
import {
  mockLeftProtoPipette,
  mockPipetteSettingsFieldsMap,
} from '/app/redux/pipettes/__fixtures__'
import { isFlexPipette } from '@opentrons/shared-data'

import type { ComponentProps } from 'react'
import type * as SharedData from '@opentrons/shared-data'
import type { Mount } from '/app/redux/pipettes/types'

vi.mock('/app/redux/config')
vi.mock('@opentrons/shared-data', async importOriginal => {
  const actualSharedData = await importOriginal<typeof SharedData>()
  return {
    ...actualSharedData,
    isFlexPipette: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof PipetteOverflowMenu>) => {
  return renderWithProviders(<PipetteOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const LEFT = 'left' as Mount
describe('PipetteOverflowMenu', () => {
  let props: ComponentProps<typeof PipetteOverflowMenu>

  beforeEach(() => {
    props = {
      pipetteSpecs: mockLeftProtoPipette.modelSpecs,
      pipetteSettings: mockPipetteSettingsFieldsMap,
      mount: LEFT,
      handleDropTip: vi.fn(),
      handleChangePipette: vi.fn(),
      handleAboutSlideout: vi.fn(),
      handleSettingsSlideout: vi.fn(),
      isRunActive: false,
    }
  })

  it('renders information with a pipette attached', () => {
    render(props)
    const detach = screen.getByRole('button', { name: 'Detach pipette' })
    const settings = screen.getByRole('button', { name: 'Pipette Settings' })
    const about = screen.getByRole('button', { name: 'About pipette' })
    const dropTip = screen.getByRole('button', { name: 'Drop tips' })
    fireEvent.click(detach)
    expect(props.handleChangePipette).toHaveBeenCalled()
    fireEvent.click(settings)
    expect(props.handleSettingsSlideout).toHaveBeenCalled()
    fireEvent.click(about)
    expect(props.handleAboutSlideout).toHaveBeenCalled()
    fireEvent.click(dropTip)
    expect(props.handleDropTip).toHaveBeenCalled()
  })
  it('renders information with no pipette attached', () => {
    props = {
      ...props,
      pipetteSpecs: null,
    }
    render(props)
    const btn = screen.getByRole('button', { name: 'Attach pipette' })
    fireEvent.click(btn)
    expect(props.handleChangePipette).toHaveBeenCalled()
  })

  it('does not render the pipette settings button if the pipette has no settings', () => {
    vi.mocked(isFlexPipette).mockReturnValue(false)
    props = {
      ...props,
      pipetteSettings: null,
    }
    render(props)
    const settings = screen.queryByRole('button', { name: 'Pipette Settings' })

    expect(settings).not.toBeInTheDocument()
  })

  it('should disable certain menu items if a run is active for OT-2 pipette', () => {
    vi.mocked(isFlexPipette).mockReturnValue(false)
    props = {
      ...props,
      isRunActive: true,
    }
    render(props)
    expect(
      screen.getByRole('button', {
        name: 'Detach pipette',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Drop tips',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Pipette Settings',
      })
    ).toBeDisabled()
  })
})
