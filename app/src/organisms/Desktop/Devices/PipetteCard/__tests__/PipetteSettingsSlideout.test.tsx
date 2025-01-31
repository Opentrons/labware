import { when } from 'vitest-when'
import { fireEvent, waitFor, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  useHost,
  useUpdatePipetteSettingsMutation,
} from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { PipetteSettingsSlideout } from '../PipetteSettingsSlideout'

import {
  mockLeftSpecs,
  mockPipetteSettingsFieldsMap,
} from '/app/redux/pipettes/__fixtures__'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof PipetteSettingsSlideout>) => {
  return renderWithProviders(<PipetteSettingsSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockRobotName = 'mockRobotName'

describe('PipetteSettingsSlideout', () => {
  let props: ComponentProps<typeof PipetteSettingsSlideout>
  let mockUpdatePipetteSettings: Mock

  beforeEach(() => {
    props = {
      pipetteId: 'id',
      settings: mockPipetteSettingsFieldsMap,
      robotName: mockRobotName,
      pipetteName: mockLeftSpecs.displayName,
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
    vi.mocked(useHost).mockReturnValue({} as any)

    mockUpdatePipetteSettings = vi.fn()

    when(useUpdatePipetteSettingsMutation)
      .calledWith(props.pipetteId, expect.anything())
      .thenReturn({
        updatePipetteSettings: mockUpdatePipetteSettings,
        isLoading: false,
        error: null,
      } as any)
  })

  it('renders correct heading and number of text boxes', () => {
    render(props)

    screen.getByRole('heading', { name: 'Left Pipette Settings' })
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBe(13)
  })

  it('renders close button that calls props.onCloseClick when clicked', () => {
    render(props)

    const button = screen.getByRole('button', { name: /exit/i })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })

  it('renders confirm button and calls dispatchApiRequest with updatePipetteSettings action object when clicked', async () => {
    render(props)
    const button = screen.getByRole('button', { name: 'Confirm' })

    fireEvent.click(button)
    await waitFor(() => {
      expect(mockUpdatePipetteSettings).toHaveBeenCalledWith({
        fields: expect.objectContaining({
          blowout: { value: 2 },
          bottom: { value: 3 },
          dropTip: { value: 1 },
          dropTipCurrent: null,
          dropTipSpeed: null,
          pickUpCurrent: null,
          pickUpDistance: null,
          plungerCurrent: null,
          top: { value: 4 },
        }),
      })
    })
  })
})
