// mock rpc session
// based on api/opentrons/api/session.py
export function MockSession() {
  return {
    name: 'MOCK SESSION',
    protocol_text: '# mock protocol text',
    commands: [],
    command_log: {},
    state: 'loaded',
    stateInfo: {
      message: null,
      userMessage: null,
      changedAt: null,
      estimatedDuration: null,
    },
    instruments: [],
    containers: [],

    // TODO(mc, 2018-07-16): THIS IS A MOCK
    modules: [],

    run: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    refresh: jest.fn(),
  }
}
