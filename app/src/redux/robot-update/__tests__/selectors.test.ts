import { vi, describe, it, expect, beforeEach } from 'vitest'

import * as selectors from '../selectors'
import * as Constants from '../constants'
import { mockReachableRobot } from '../../discovery/__fixtures__'
import { HEALTH_STATUS_NOT_OK } from '../../discovery'
import * as discoSelectors from '../../discovery/selectors'

import type { State } from '../../types'

vi.mock('../../discovery/selectors')

describe('robot update selectors', () => {
  beforeEach(() => {
    vi.mocked(discoSelectors.getViewableRobots).mockReturnValue([])
    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue(null)
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue(null)
  })

  it('should get robot update info for an ot2', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = {
      robotUpdate: {
        ot2: { releaseNotes: 'some release notes', version: '1.0.0' },
      },
    } as any
    const result = selectors.getRobotUpdateInfo(state, 'some-ot2')

    expect(result).toEqual({
      releaseNotes: 'some release notes',
      version: '1.0.0',
      target: 'ot2',
    })
  })

  it('should get robot update info for an flex', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = {
      robotUpdate: {
        flex: { releaseNotes: 'some release notes', version: '1.0.0' },
      },
    } as any
    const result = selectors.getRobotUpdateInfo(state, 'some-flex')

    expect(result).toEqual({
      releaseNotes: 'some release notes',
      version: '1.0.0',
      target: 'flex',
    })
  })

  it('should get the update version from the auto-downloaded file for a flex', () => {
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const result = selectors.getRobotUpdateTargetVersion(state, 'some-flex')

    expect(result).toBe('1.0.0')
  })

  it('should get the update version from the auto-downloaded file for an ot2', () => {
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const result = selectors.getRobotUpdateTargetVersion(state, 'some-ot2')

    expect(result).toBe('1.0.0')
  })

  it('should get the update version from the user-provided file for flex', () => {
    const state: State = {
      robotUpdate: {
        flex: { version: '1.0.0' },
        session: { fileInfo: { version: '1.0.1' } },
      },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const result = selectors.getRobotUpdateTargetVersion(state, 'some-flex')

    expect(result).toBe('1.0.1')
  })

  it('should get the update version from the user-provided file for ot2', () => {
    const state: State = {
      robotUpdate: {
        version: { ot2: { version: '1.0.0' } },
        session: { fileInfo: { version: '1.0.1' } },
      },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const result = selectors.getRobotUpdateTargetVersion(state, 'some-ot2')

    expect(result).toBe('1.0.1')
  })

  it('should get the update download error for an flex', () => {
    const state: State = {
      robotUpdate: { flex: { downloadError: 'error with download' } },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const result = selectors.getRobotUpdateDownloadError(state, 'some-flex')

    expect(result).toBe('error with download')
  })

  it('should get the update download error for an ot2', () => {
    const state: State = {
      robotUpdate: { ot2: { downloadError: 'error with download' } },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const result = selectors.getRobotUpdateDownloadError(state, 'some-ot2')

    expect(result).toBe('error with download')
  })

  it('should get the update download progress for an ot2', () => {
    const state: State = {
      robotUpdate: { ot2: { downloadProgress: 10 } },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const result = selectors.getRobotUpdateDownloadProgress(state, 'some-ot2')

    expect(result).toBe(10)
  })

  it('should get the update download progress for a flex', () => {
    const state: State = {
      robotUpdate: { flex: { downloadProgress: 10 } },
    } as any
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const result = selectors.getRobotUpdateDownloadProgress(state, 'flex')

    expect(result).toBe(10)
  })

  it('should return "upgrade" update type when an ot2 is behind the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockImplementation(
      inputRobot => {
        expect(inputRobot).toBe(robot)
        return '0.9.9'
      }
    )

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('upgrade')
  })

  it('should return "upgrade" update type when a flex is behind the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockImplementation(
      inputRobot => {
        expect(inputRobot).toBe(robot)
        return '0.9.9'
      }
    )

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('upgrade')
  })

  it('should return "downgrade" update type when an ot2 is ahead of the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.1')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('downgrade')
  })

  it('should return "downgrade" update type when a flex is ahead of the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.1')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('downgrade')
  })

  it('should get "reinstall" update type when ot-2 matches the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.0')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('reinstall')
  })

  it('should get "reinstall" update type when flex matches the update', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.0')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe('reinstall')
  })

  it('should return null update type when no update available for an ot2', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = { robotUpdate: { ot2: { version: null } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.0')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe(null)
  })

  it('should return null update type when no update available for a flex', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = { robotUpdate: { flex: { version: null } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.0')

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe(null)
  })

  it('should return null update type when no robot version available for ot2', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-2 Standard' },
    } as any)
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue(null)

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe(null)
  })

  it('should return null update type when no robot version available for flex', () => {
    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      serverHealth: { robotModel: 'OT-3 Standard' },
    } as any)
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    const robot = { name: 'robot-name' } as any

    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue(null)

    const result = selectors.getRobotUpdateAvailable(state, robot)

    expect(result).toBe(null)
  })

  it('should get the robot update session', () => {
    const state: State = {
      robotUpdate: {
        session: { robotName: 'robot-name', token: null, pathPrefix: null },
      },
    } as any
    const result = selectors.getRobotUpdateSession(state)

    expect(result).toEqual({
      robotName: 'robot-name',
      token: null,
      pathPrefix: null,
    })
  })

  it('should get the robot name from the update session', () => {
    const state: State = {
      robotUpdate: {
        session: { robotName: 'robot-name', token: null, pathPrefix: null },
      },
    } as any
    const result = selectors.getRobotUpdateSessionRobotName(state)

    expect(result).toBe('robot-name')
  })

  it('should get the full robot from the update session', () => {
    const state: State = {
      robotUpdate: {
        session: { robotName: 'robot-name' },
      },
    } as any

    vi.mocked(discoSelectors.getViewableRobots).mockImplementation(
      inputState => {
        expect(inputState).toBe(state)
        return [
          { name: 'other-robot-name', host: '10.10.0.1', port: 31950 },
          { name: 'robot-name', host: '10.10.0.0', port: 31950 },
          { name: 'another-robot-name', host: '10.10.0.2', port: 31950 },
        ] as any
      }
    )

    const result = selectors.getRobotUpdateRobot(state)
    expect(result).toEqual({
      name: 'robot-name',
      host: '10.10.0.0',
      port: 31950,
    })
  })

  it('should get whether the robot is updated via a manual file', () => {
    const state: State = {
      robotUpdate: {
        session: { fileInfo: { isManualFile: true } },
      },
    } as any
    const result = selectors.getRobotSessionIsManualFile(state)

    expect(result).toBeTruthy()
  })

  it('should get the robot from session after migration with opentrons- name prefix', () => {
    const state: State = {
      robotUpdate: {
        session: { robotName: 'opentrons-robot-name' },
      },
    } as any

    vi.mocked(discoSelectors.getViewableRobots).mockReturnValue([
      { name: 'other-robot-name', host: '10.10.0.1', port: 31950 },
      {
        name: 'robot-name',
        host: '10.10.0.0',
        port: 31950,
        serverHealth: { capabilities: { buildrootUpdate: '/' } },
      },
      { name: 'another-robot-name', host: '10.10.0.2', port: 31950 },
    ] as any[])

    const result = selectors.getRobotUpdateRobot(state)
    expect(result).toEqual({
      name: 'robot-name',
      host: '10.10.0.0',
      port: 31950,
      serverHealth: { capabilities: { buildrootUpdate: '/' } },
    })
  })

  it('should be able to say if an update is in progress for a robot', () => {
    const robot = {
      name: 'robot-name',
      host: '10.10.0.0',
      port: 31950,
      serverHealth: { capabilities: { buildrootUpdate: '/' } },
    } as any

    vi.mocked(discoSelectors.getViewableRobots).mockReturnValue([
      { name: 'other-robot-name', host: '10.10.0.1', port: 31950 },
      robot,
      { name: 'another-robot-name', host: '10.10.0.2', port: 31950 },
    ] as any[])

    expect(
      selectors.getRobotUpdateInProgress(
        {
          robotUpdate: {
            session: {
              robotName: 'opentrons-robot-name',
              step: Constants.RESTART,
              error: null,
            },
          },
        } as any,
        robot
      )
    ).toBe(true)

    expect(
      selectors.getRobotUpdateInProgress(
        {
          robotUpdate: {
            session: {
              robotName: 'opentrons-robot-name',
              step: Constants.RESTART,
              error: { message: 'oh no!' },
            },
          },
        } as any,
        robot
      )
    ).toBe(false)

    expect(
      selectors.getRobotUpdateInProgress(
        {
          robotUpdate: {
            session: {
              robotName: 'opentrons-robot-name',
              step: Constants.FINISHED,
              error: null,
            },
          },
        } as any,
        robot
      )
    ).toBe(false)

    expect(
      selectors.getRobotUpdateInProgress(
        { robotUpdate: { session: null } } as any,
        robot
      )
    ).toBe(false)
  })

  it('should return update disabled because not responding if no robot', () => {
    const state: State = { robotUpdate: {} } as any
    const robotName = 'robot-name'

    vi.mocked(discoSelectors.getRobotByName).mockImplementation(
      (inputState, inputName) => {
        expect(inputState).toBe(state)
        expect(inputName).toBe(robotName)
        return null
      }
    )

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toMatchObject({
      autoUpdateDisabledReason: expect.stringMatching(
        /update_server_unavailable/
      ),
      updateFromFileDisabledReason: expect.stringMatching(
        /update_server_unavailable/
      ),
    })
  })

  it('should return update disabled if robot has unhealthy update sever', () => {
    const state: State = { robotUpdate: {} } as any
    const robotName = 'robot-name'

    vi.mocked(discoSelectors.getRobotByName).mockReturnValue({
      ...mockReachableRobot,
      serverHealthStatus: HEALTH_STATUS_NOT_OK,
    })

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toMatchObject({
      autoUpdateDisabledReason: expect.stringMatching(
        /update_server_unavailable/
      ),
      updateFromFileDisabledReason: expect.stringMatching(
        /update_server_unavailable/
      ),
    })
  })

  it('should return update disabled because other robot updating', () => {
    const state: State = {
      robotUpdate: { session: { robotName: 'other-name' } },
    } as any
    const robotName = 'robot-name'
    const robot = { ...mockReachableRobot, name: robotName }
    const otherRobot = { ...mockReachableRobot, name: 'other-name' }

    vi.mocked(discoSelectors.getRobotByName).mockReturnValue(robot)
    vi.mocked(discoSelectors.getViewableRobots).mockReturnValue([
      robot,
      otherRobot,
    ])
    vi.mocked(discoSelectors.getRobotApiVersion).mockImplementation(
      inputRobot => {
        expect(inputRobot).toBe(robot)
        return '1.0.0'
      }
    )

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toMatchObject({
      autoUpdateDisabledReason: expect.stringMatching(/other_robot_updating/),
      updateFromFileDisabledReason: expect.stringMatching(
        /other_robot_updating/
      ),
    })
  })

  it('should return auto-update disabled but from-file enabled if no downloaded files', () => {
    const state: State = { robotUpdate: {} } as any
    const robotName = 'robot-name'
    const robot = { ...mockReachableRobot, name: robotName }

    vi.mocked(discoSelectors.getRobotByName).mockReturnValue(robot)
    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('1.0.0')

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toEqual({
      autoUpdateAction: expect.stringMatching(/unavailable/i),
      autoUpdateDisabledReason: expect.stringMatching(/no_update_files/i),
      updateFromFileDisabledReason: null,
    })
  })

  it('should return all updates allowed if update files exist and ot-2 is healthy', () => {
    const state: State = { robotUpdate: { ot2: { version: '1.0.0' } } } as any
    const robotName = 'robot-name'
    const robot = {
      ...mockReachableRobot,
      name: robotName,
      serverHealth: {
        ...mockReachableRobot.serverHealth,
        robotModel: 'OT-2 Standard',
      },
    } as any

    vi.mocked(discoSelectors.getRobotByName).mockReturnValue(robot)
    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('0.9.9')

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toEqual({
      autoUpdateAction: expect.stringMatching(/upgrade/i),
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
  })

  it('should return all updates allowed if update files exist and flex is healthy', () => {
    const state: State = { robotUpdate: { flex: { version: '1.0.0' } } } as any
    const robotName = 'robot-name'
    const robot = {
      ...mockReachableRobot,
      name: robotName,
      serverHealth: {
        ...mockReachableRobot.serverHealth,
        robotModel: 'OT-3 Standard',
      },
    }

    vi.mocked(discoSelectors.getRobotByName).mockReturnValue(robot as any)
    vi.mocked(discoSelectors.getRobotApiVersion).mockReturnValue('0.9.9')

    const result = selectors.getRobotUpdateDisplayInfo(state, robotName)

    expect(result).toEqual({
      autoUpdateAction: expect.stringMatching(/upgrade/i),
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
  })
})
