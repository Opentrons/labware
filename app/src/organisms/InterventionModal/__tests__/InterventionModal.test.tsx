import { fireEvent, renderHook, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { RUN_STATUS_RUNNING, RUN_STATUS_STOPPED } from '@opentrons/api-client'
import { getLabwareDefURI } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockTipRackDefinition } from '/app/redux/custom-labware/__fixtures__'
import { i18n } from '/app/i18n'
import {
  mockPauseCommandWithoutStartTime,
  mockPauseCommandWithStartTime,
  mockMoveLabwareCommandFromSlot,
  mockMoveLabwareCommandFromModule,
  truncatedCommandMessage,
} from '../__fixtures__'
import { InterventionModal, useInterventionModal } from '..'
import { useIsFlex } from '/app/redux-resources/robots'

import type { ComponentProps } from 'react'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { RunData } from '@opentrons/api-client'

const ROBOT_NAME = 'Otie'

const mockOnResumeHandler = vi.fn()

vi.mock('/app/redux-resources/robots')

describe('useInterventionModal', () => {
  const defaultProps = {
    runData: { id: 'run1' } as RunData,
    lastRunCommand: mockPauseCommandWithStartTime,
    runStatus: RUN_STATUS_RUNNING,
    robotName: 'TestRobot',
    analysis: null,
    doorIsOpen: false,
  }

  it('should return showModal true when conditions are met', () => {
    const { result } = renderHook(() => useInterventionModal(defaultProps))

    expect(result.current.showModal).toBe(true)
    expect(result.current.modalProps).not.toBeNull()
  })

  it('should return showModal false when runStatus is terminal', () => {
    const props = { ...defaultProps, runStatus: RUN_STATUS_STOPPED }

    const { result } = renderHook(() => useInterventionModal(props))

    expect(result.current.showModal).toBe(false)
    expect(result.current.modalProps).toBeNull()
  })

  it('should return showModal false when lastRunCommand is null', () => {
    const props = { ...defaultProps, lastRunCommand: null }

    const { result } = renderHook(() => useInterventionModal(props))

    expect(result.current.showModal).toBe(false)
    expect(result.current.modalProps).toBeNull()
  })

  it('should return showModal false when robotName is null', () => {
    const props = { ...defaultProps, robotName: null }

    const { result } = renderHook(() => useInterventionModal(props))

    expect(result.current.showModal).toBe(false)
    expect(result.current.modalProps).toBeNull()
  })

  it('should return correct modalProps when showModal is true', () => {
    const { result } = renderHook(() => useInterventionModal(defaultProps))

    expect(result.current.modalProps).toEqual({
      command: mockPauseCommandWithStartTime,
      run: defaultProps.runData,
      robotName: 'TestRobot',
      analysis: null,
    })
  })
  it('should return showModal true and an alternate footer when door is open', () => {
    const { result } = renderHook(() =>
      useInterventionModal({ ...defaultProps, doorIsOpen: true })
    )
    expect(result.current.showModal).toBe(true)
    expect(result.current.modalProps?.alternateFooterContent).toBeTruthy()
  })
})

const render = (props: ComponentProps<typeof InterventionModal>) => {
  return renderWithProviders(<InterventionModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('InterventionModal', () => {
  let props: ComponentProps<typeof InterventionModal>
  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
      command: mockPauseCommandWithStartTime,
      onResume: mockOnResumeHandler,
      run: { labware: [], modules: [] } as any,
      analysis: {
        commands: [
          {
            commandType: 'loadLabware',
            result: { definition: mockTipRackDefinition },
          },
        ],
      } as CompletedProtocolAnalysis,
    }
    vi.mocked(useIsFlex).mockReturnValue(true)
  })

  it('renders an InterventionModal with the robot name in the header and confirm button', () => {
    render(props)
    screen.getByText('Pause on Otie')
    // getByText('Learn more about manual steps')
    screen.getByRole('button', { name: 'Confirm and resume' })
  })

  it('renders a pause intervention modal given a pause-type command', () => {
    render(props)
    screen.getByText(truncatedCommandMessage)
    screen.getByText('Paused for')
    screen.getByText(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)
  })

  it('renders a pause intervention modal with an empty timestamp when no start time given', () => {
    props = { ...props, command: mockPauseCommandWithoutStartTime }
    render(props)
    screen.getByText('Paused for')
    screen.getByText('--:--:--')
  })

  it('clicking "Confirm and resume" triggers the resume handler', () => {
    render(props)
    fireEvent.click(screen.getByText('Confirm and resume'))
    expect(mockOnResumeHandler).toHaveBeenCalled()
  })

  it('renders a move labware intervention modal given a move labware command - slot starting point', () => {
    props = {
      ...props,
      command: mockMoveLabwareCommandFromSlot,
      run: {
        labware: [
          {
            id: mockMoveLabwareCommandFromSlot.params.labwareId,
            displayName: 'mockLabware',
            location: { slotName: 'A1' },
            definitionUri: getLabwareDefURI(mockTipRackDefinition),
          },
          {
            id: 'fixedTrash',
            location: { slotName: 'A3' },
            loadName: 'opentrons_1_trash_3200ml_fixed',
          },
        ],
        modules: [],
      } as any,
    }
    render(props)
    screen.getByText('Move labware on Otie')
    screen.getByText('Labware name')
    screen.getByText('mockLabware')
    screen.queryAllByText('A1')
    screen.queryAllByText('D3')
  })

  it('renders a move labware intervention modal given a move labware command - between staging area slots', () => {
    props = {
      ...props,
      command: {
        id: 'mockMoveLabwareCommandId',
        key: 'mockMoveLabwareCommandKey',
        commandType: 'moveLabware',
        params: {
          labwareId: 'mockLabwareId',
          newLocation: {
            addressableAreaName: 'C4',
          },
          strategy: 'manualMoveWithPause',
        },
        startedAt: 'fake_timestamp',
        completedAt: 'fake_timestamp',
        createdAt: 'fake_timestamp',
        status: 'succeeded',
      },
      run: {
        labware: [
          {
            id: 'mockLabwareId',
            displayName: 'mockLabwareInStagingArea',
            location: { slotName: 'B4' },
            definitionUri: getLabwareDefURI(mockTipRackDefinition),
          },
        ],
        modules: [],
      } as any,
    }
    render(props)
    screen.getByText('Move labware on Otie')
    screen.getByText('Labware name')
    screen.getByText('mockLabwareInStagingArea')
    screen.queryAllByText('B4')
    screen.queryAllByText('C4')
  })

  it('renders a move labware intervention modal given a move labware command - module starting point', () => {
    props = {
      ...props,
      command: mockMoveLabwareCommandFromModule,
      run: {
        labware: [
          {
            id: mockMoveLabwareCommandFromModule.params.labwareId,
            displayName: 'mockLabware',
            location: { moduleId: 'mockModuleId' },
            definitionUri: getLabwareDefURI(mockTipRackDefinition),
          },
          {
            id: 'fixedTrash',
            location: { slotName: 'A3' },
            loadName: 'opentrons_1_trash_3200ml_fixed',
          },
        ],
        modules: [
          {
            id: 'mockModuleId',
            model: 'heaterShakerModuleV1',
            location: { slotName: 'C3' },
          },
        ],
      } as any,
    }
    render(props)
    screen.getByText('Move labware on Otie')
    screen.getByText('Labware name')
    screen.getByText('mockLabware')
    screen.queryAllByText('A1')
    screen.queryAllByText('C1')
  })
})
