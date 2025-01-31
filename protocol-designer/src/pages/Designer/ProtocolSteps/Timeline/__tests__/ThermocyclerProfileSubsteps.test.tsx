import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__testing-utils__'
import { i18n } from '../../../../../assets/localization'
import { getSavedStepForms } from '../../../../../step-forms/selectors'
import { ThermocyclerProfileSubsteps } from '../ThermocyclerProfileSubsteps'

import type { ComponentProps } from 'react'
import type { FormData } from '../../../../../form-types'

const render = (props: ComponentProps<typeof ThermocyclerProfileSubsteps>) => {
  return renderWithProviders(<ThermocyclerProfileSubsteps {...props} />, {
    i18nInstance: i18n,
  })[0]
}
vi.mock('../../../../../step-forms/selectors')
const THERMOCYCLER_STEP_ID = 'tcStep123'
const MOCK_THERMOCYCLER_ORDERED_SUBSTEP_IDS = [
  '292b0d70-fa06-4ab1-adc9-f26c589babf4',
  '0965e0de-2d01-4e4e-8fb3-1e66306fe7e5',
]
const MOCK_THERMOCYCLER_SUBSTEP_ITEMS = {
  '292b0d70-fa06-4ab1-adc9-f26c589babf4': {
    id: '292b0d70-fa06-4ab1-adc9-f26c589babf4',
    title: '',
    steps: [
      {
        durationMinutes: '00',
        durationSeconds: '30',
        id: 'f90cc374-2eeb-4205-80c6-63c5c77215a5',
        temperature: '10',
        title: 'cyclestep1',
        type: 'profileStep',
      },
      {
        durationMinutes: '1',
        durationSeconds: '30',
        id: '462b3d8f-bb8a-4e11-ae98-8f1d46e8507e',
        temperature: '55',
        title: 'cyclestep2',
        type: 'profileStep',
      },
    ],
    type: 'profileCycle',
    repetitions: '28',
  },
  '0965e0de-2d01-4e4e-8fb3-1e66306fe7e5': {
    durationMinutes: '5',
    durationSeconds: '00',
    id: '0965e0de-2d01-4e4e-8fb3-1e66306fe7e5',
    temperature: '39',
    title: 'last step',
    type: 'profileStep',
  },
}

describe('TimelineToolbox', () => {
  let props: ComponentProps<typeof ThermocyclerProfileSubsteps>
  beforeEach(() => {
    props = { stepId: THERMOCYCLER_STEP_ID }
    vi.mocked(getSavedStepForms).mockReturnValue({
      [THERMOCYCLER_STEP_ID]: ({
        orderedProfileItems: MOCK_THERMOCYCLER_ORDERED_SUBSTEP_IDS,
        profileItemsById: MOCK_THERMOCYCLER_SUBSTEP_ITEMS,
      } as unknown) as FormData,
    })
  })
  it('renders all profile steps, including cycles and steps', () => {
    render(props)
    expect(screen.getAllByText('Set block temperature to').length === 3)
    screen.getByText('10°C')
    screen.getByText('55°C')
    screen.getByText('39°C')
    screen.getByText('00:30')
    screen.getByText('1:30')
    screen.getByText('5:00')
  })
})
