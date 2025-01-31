import { screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { InterventionTicks } from '../InterventionTicks'
import { Tick } from '../Tick'

import type { ComponentProps } from 'react'

vi.mock('../Tick')

const render = (props: ComponentProps<typeof InterventionTicks>) => {
  return renderWithProviders(<InterventionTicks {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('InterventionTicks', () => {
  let props: ComponentProps<typeof InterventionTicks>
  beforeEach(() => {
    vi.mocked(Tick).mockImplementation(({ index }) => (
      <div>MOCK TICK at index: {index}</div>
    ))
    props = {
      analysisCommands: [],
      makeHandleJumpToStep: vi.fn(),
    }
  })

  it('should show one tick for waitForResume command', () => {
    render({
      ...props,
      analysisCommands: [
        {
          id: 'fake_id1',
          key: 'fake_key1',
          commandType: 'home',
          createdAt: '2023-02-22T15:31:23.877610+00:00',
          startedAt: '2023-02-22T15:31:23.877610+00:00',
          completedAt: '2023-02-22T15:31:23.877610+00:00',
          status: 'succeeded',
          params: {},
        },
        {
          id: 'fake_id2',
          key: 'fake_key2',
          commandType: 'waitForResume',
          createdAt: '2023-02-22T15:31:23.877610+00:00',
          startedAt: '2023-02-22T15:31:23.877610+00:00',
          completedAt: '2023-02-22T15:31:23.877610+00:00',
          status: 'succeeded',
          params: {},
        },
      ],
    })
    expect(screen.getByText('MOCK TICK at index: 1')).toBeTruthy()
  })
  it('should show tick only for moveLabware commands if strategy is moveManualWithPause', () => {
    render({
      ...props,
      analysisCommands: [
        {
          id: 'fake_id1',
          key: 'fake_key1',
          commandType: 'moveLabware',
          createdAt: '2023-02-22T15:31:23.877610+00:00',
          startedAt: '2023-02-22T15:31:23.877610+00:00',
          completedAt: '2023-02-22T15:31:23.877610+00:00',
          status: 'succeeded',
          params: {
            labwareId: 'fake_labware_id',
            strategy: 'usingGripper',
            newLocation: { slotName: 'A1' },
          },
        },
        {
          id: 'fake_id2',
          key: 'fake_key2',
          commandType: 'moveLabware',
          createdAt: '2023-02-22T15:31:23.877610+00:00',
          startedAt: '2023-02-22T15:31:23.877610+00:00',
          completedAt: '2023-02-22T15:31:23.877610+00:00',
          status: 'succeeded',
          params: {
            labwareId: 'fake_labware_id',
            strategy: 'manualMoveWithoutPause',
            newLocation: { slotName: 'A2' },
          },
        },
        {
          id: 'fake_id3',
          key: 'fake_key3',
          commandType: 'moveLabware',
          createdAt: '2023-02-22T15:31:23.877610+00:00',
          startedAt: '2023-02-22T15:31:23.877610+00:00',
          completedAt: '2023-02-22T15:31:23.877610+00:00',
          status: 'succeeded',
          params: {
            labwareId: 'fake_labware_id',
            strategy: 'manualMoveWithPause',
            newLocation: { slotName: 'A3' },
          },
        },
      ],
    })
    expect(screen.getByText('MOCK TICK at index: 2')).toBeTruthy()
  })
})
