import { describe, it, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import {
  getSavedStepForms,
  getUnsavedForm,
} from '../../../../step-forms/selectors'
import {
  getSelectedStepId,
  getSelectedSubstep,
  getSelectedTerminalItemId,
} from '../../../../ui/steps/selectors'
import {
  getDesignerTab,
  getRobotStateTimeline,
} from '../../../../file-data/selectors'
import { getEnableHotKeysDisplay } from '../../../../feature-flags/selectors'
import { DeckSetupContainer } from '../../DeckSetup'
import { OffDeck } from '../../Offdeck'
import { SubStepsToolbox } from '../Timeline'
import { DraggableSidebar } from '../DraggableSidebar'
import { ProtocolSteps } from '..'

import type { SavedStepFormState } from '../../../../step-forms'

vi.mock('../../Offdeck')
vi.mock('../../../../step-forms/selectors')
vi.mock('../../../../ui/steps/selectors')
vi.mock('../../../../ui/labware/selectors')
vi.mock('../StepForm')
vi.mock('../../DeckSetup')
vi.mock('../StepSummary.tsx')
vi.mock('../Timeline')
vi.mock('../DraggableSidebar')
vi.mock('../../../../feature-flags/selectors')
vi.mock('../../../../file-data/selectors')
vi.mock('../../../../organisms/Alerts')
const render = () => {
  return renderWithProviders(<ProtocolSteps />, {
    i18nInstance: i18n,
  })[0]
}

const MOCK_STEP_FORMS = {
  '0522fde8-25a3-4840-b84a-af7282bd80d5': {
    moduleId: '781599b2-1eff-4594-8c96-06fcd54f4faa:heaterShakerModuleType',
    pauseAction: 'untilTime',
    pauseHour: '22',
    pauseMessage: 'sdfg',
    pauseMinute: '22',
    pauseSecond: '11',
    pauseTemperature: null,
    pauseTime: null,
    id: '0522fde8-25a3-4840-b84a-af7282bd80d5',
    stepType: 'pause',
    stepName: 'custom pause',
    stepDetails: '',
  },
}

describe('ProtocolSteps', () => {
  beforeEach(() => {
    vi.mocked(getDesignerTab).mockReturnValue('protocolSteps')
    vi.mocked(getRobotStateTimeline).mockReturnValue({
      timeline: [],
      errors: [],
    })
    vi.mocked(DraggableSidebar).mockReturnValue(
      <div>mock DraggableSidebar</div>
    )
    vi.mocked(DeckSetupContainer).mockReturnValue(
      <div>mock DeckSetupContainer</div>
    )
    vi.mocked(getSelectedTerminalItemId).mockReturnValue(null)
    vi.mocked(OffDeck).mockReturnValue(<div>mock OffDeck</div>)
    vi.mocked(getUnsavedForm).mockReturnValue(null)
    vi.mocked(getSelectedSubstep).mockReturnValue(null)
    vi.mocked(SubStepsToolbox).mockReturnValue(<div>mock SubStepsToolbox</div>)
    vi.mocked(getEnableHotKeysDisplay).mockReturnValue(true)
    vi.mocked(getSavedStepForms).mockReturnValue(
      MOCK_STEP_FORMS as SavedStepFormState
    )
    vi.mocked(getSelectedStepId).mockReturnValue(
      '0522fde8-25a3-4840-b84a-af7282bd80d5'
    )
  })

  it('renders each component in ProtocolSteps', () => {
    render()
    screen.getByText('mock DraggableSidebar')
    screen.getByText('mock DeckSetupContainer')
  })

  it('renders the toggle when formData is null', () => {
    render()
    screen.getByText('mock DeckSetupContainer')
    fireEvent.click(screen.getByText('Off deck'))
    screen.getByText('mock OffDeck')
  })

  it('renders the substepToolbox when selectedSubstep is not null', () => {
    vi.mocked(getSelectedSubstep).mockReturnValue('mockId')
    render()
    screen.getByText('mock SubStepsToolbox')
  })

  it('renders the hot keys display', () => {
    render()
    screen.getByText('Double-click to edit')
    screen.getByText('Shift + click to select range')
    screen.getByText('Command + click to select multiple')
  })

  it('renders the current step name', () => {
    render()
    screen.getByText('Custom pause')
  })
})
