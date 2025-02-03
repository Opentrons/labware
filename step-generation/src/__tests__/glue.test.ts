import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  getNextRobotStateAndWarningsSingleCommand,
  getNextRobotStateAndWarnings,
} from '../getNextRobotStateAndWarnings'
import {
  curryCommandCreator,
  reduceCommandCreators,
  commandCreatorsTimeline,
} from '../utils'
import { DEFAULT_CONFIG } from '../fixtures'
import type { InvariantContext } from '../types'
vi.mock('../getNextRobotStateAndWarnings')

let invariantContext: InvariantContext

/** This is a minimalistic toy version of step-generation command creators and timeline updaters,
 * to show, at a glance, how all this works together.
 */
interface CountState {
  count: number
}
interface CountStateAndWarnings {
  robotState: CountState
  warnings: any[]
}
interface CountParams {
  value: number
}
interface CountCommand {
  command: 'add' | 'multiply' | 'divide'
  params: {
    value: number
  }
}
const addCreator: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => ({
  commands: [{ command: 'add', params }],
  warnings: [],
})

const addCreatorWithWarning: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => {
  const { value } = params
  // adds a warning for no meaningful reason
  const result = addCreator(params, invariantContext, prevState)
  return {
    ...result,
    warnings: [
      {
        type: 'ADD_WARNING',
        message: `adding ${value} with warning example`,
      },
    ],
  }
}

const multiplyCreator: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => ({
  commands: [{ command: 'multiply', params }],
  warnings: [],
})

const divideCreator: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => {
  const { value } = params
  if (value === 0) {
    return {
      errors: [
        {
          message: 'Cannot divide by zero',
          type: 'DIVIDE_BY_ZERO',
        },
      ],
    }
  }

  return {
    commands: [{ command: 'divide', params: { value } }],
    warnings: [],
  }
}

const pythonHelloWorldCreator: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => {
  return {
    commands: [],
    warnings: [],
    python: 'print("Hello world")',
  }
}

const pythonGoodbyeWorldCreator: any = (
  params: CountParams,
  invariantContext: InvariantContext,
  prevState: CountState
) => {
  return {
    commands: [],
    warnings: [],
    python: 'print("Goodbye world")',
  }
}

function mockNextRobotStateAndWarningsSingleCommand(
  command: CountCommand,
  invariantContext: any,
  prevState: CountState
): CountStateAndWarnings {
  const prevCount = prevState.count
  let count = null
  switch (command.command) {
    case 'add': {
      count = prevCount + command.params.value
      break
    }
    case 'multiply': {
      count = prevCount * command.params.value
      break
    }
    case 'divide': {
      count = prevCount / command.params.value
      break
    }
  }
  if (count === null) {
    throw new Error(
      `unknown command: ${command.command} passed to mockNextRobotStateAndWarning`
    )
  }
  const warnings: never[] = [] // NOTE: not making a fake implementation of any nextRobotState warnings!
  return { robotState: { count }, warnings }
}

function mockNextRobotStateAndWarnings(
  commands: CountCommand[],
  invariantContext: any,
  prevState: CountState
): CountStateAndWarnings {
  const nextState = commands.reduce<CountStateAndWarnings>(
    (acc, command) =>
      mockNextRobotStateAndWarningsSingleCommand(
        command,
        invariantContext,
        acc.robotState
      ),
    { robotState: prevState, warnings: [] }
  )
  const warnings: never[] = [] // NOTE: not making a fake implementation of any nextRobotState warnings!
  return { robotState: nextState.robotState, warnings }
}

// TODO(IL, 2021-06-04): should use as jest.MockedFunction pattern
// @ts-expect-error: mock methods
getNextRobotStateAndWarningsSingleCommand.mockImplementation(
  mockNextRobotStateAndWarningsSingleCommand
)
// @ts-expect-error: mock methods
getNextRobotStateAndWarnings.mockImplementation(mockNextRobotStateAndWarnings)

beforeEach(() => {
  invariantContext = {
    labwareEntities: {},
    moduleEntities: {},
    pipetteEntities: {},
    additionalEquipmentEntities: {},
    liquidEntities: {},
    config: DEFAULT_CONFIG,
  }
})

describe('reduceCommandCreators', () => {
  it('basic command creators', () => {
    const initialState: any = { count: 0 }
    const result: any = reduceCommandCreators(
      [
        curryCommandCreator(addCreator, { value: 1 }),
        curryCommandCreator(multiplyCreator, { value: 2 }),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      commands: [
        { command: 'add', params: { value: 1 } },
        { command: 'multiply', params: { value: 2 } },
      ],
      warnings: [],
      // Note no `python` field here.
      // Existing CommandCreators that don't emit Python should behave exactly the same as before.
      // This test makes sure we do NOT produce results like `python:'undefined'` or `python:''` or `python:'\n'`.
    })
  })

  it('error in a command short-circuits the command creation pipeline', () => {
    const initialState: any = { count: 5 }
    const result = reduceCommandCreators(
      [
        curryCommandCreator(addCreator, { value: 4 }),
        curryCommandCreator(divideCreator, { value: 0 }),
        curryCommandCreator(multiplyCreator, { value: 3 }),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      errors: [
        {
          message: 'Cannot divide by zero',
          type: 'DIVIDE_BY_ZERO',
        },
      ],
    })
  })

  it('warnings accumulate in a flat array across the command chain', () => {
    const initialState: any = { count: 5 }
    const result = reduceCommandCreators(
      [
        curryCommandCreator(addCreatorWithWarning, { value: 3 }),
        curryCommandCreator(multiplyCreator, { value: 2 }),
        curryCommandCreator(addCreatorWithWarning, { value: 1 }),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      commands: [
        { command: 'add', params: { value: 3 } },
        { command: 'multiply', params: { value: 2 } },
        { command: 'add', params: { value: 1 } },
      ],
      warnings: [
        { type: 'ADD_WARNING', message: 'adding 3 with warning example' },
        { type: 'ADD_WARNING', message: 'adding 1 with warning example' },
      ],
    })
  })

  it('Python commands are joined together', () => {
    const initialState: any = {}
    const result: any = reduceCommandCreators(
      [
        curryCommandCreator(pythonHelloWorldCreator, {}),
        curryCommandCreator(pythonGoodbyeWorldCreator, {}),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      commands: [],
      warnings: [],
      python: 'print("Hello world")\nprint("Goodbye world")',
    })
  })

  it('Python commands mixed with non-Python commands', () => {
    const initialState: any = {}
    const result: any = reduceCommandCreators(
      [
        curryCommandCreator(addCreator, { value: 1 }),
        curryCommandCreator(pythonHelloWorldCreator, {}),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      commands: [{ command: 'add', params: { value: 1 } }],
      warnings: [],
      python: 'print("Hello world")',
      // should only get 1 line of Python with no stray newlines or `undefined`s.
    })
  })
})

describe('commandCreatorsTimeline', () => {
  it('any errors short-circuit the timeline chain', () => {
    const initialState: any = { count: 5 }
    const result = commandCreatorsTimeline(
      [
        curryCommandCreator(addCreatorWithWarning, { value: 4 }),
        curryCommandCreator(divideCreator, { value: 0 }),
        curryCommandCreator(multiplyCreator, { value: 3 }),
        curryCommandCreator(pythonHelloWorldCreator, {}),
      ],
      invariantContext,
      initialState
    )

    expect(result).toEqual({
      // error-creating "divide by zero" commands's index in the command creators array
      errors: [
        {
          message: 'Cannot divide by zero',
          type: 'DIVIDE_BY_ZERO',
        },
      ],

      timeline: [
        // add 4 step
        {
          robotState: { count: 5 + 4 },
          commands: [{ command: 'add', params: { value: 4 } }],
          warnings: [
            {
              message: 'adding 4 with warning example',
              type: 'ADD_WARNING',
            },
          ],
        },
        // no more steps in the timeline, stopped by error
        // python output is suppressed too
      ],
    })
  })

  it('warnings are indexed in an indexed command chain', () => {
    const initialState: any = { count: 5 }

    const result = commandCreatorsTimeline(
      [
        curryCommandCreator(addCreatorWithWarning, { value: 3 }),
        curryCommandCreator(multiplyCreator, { value: 2 }),
        curryCommandCreator(addCreatorWithWarning, { value: 1 }),
        curryCommandCreator(pythonHelloWorldCreator, {}),
      ],
      invariantContext,
      initialState
    )

    expect(result.timeline).toEqual([
      // add 3 w/ warning
      {
        robotState: { count: 8 },
        commands: [{ command: 'add', params: { value: 3 } }],
        warnings: [
          {
            message: 'adding 3 with warning example',
            type: 'ADD_WARNING',
          },
        ],
      },
      // multiply by 2
      {
        robotState: { count: 16 },
        commands: [{ command: 'multiply', params: { value: 2 } }],
        warnings: [],
      },
      // add 1 w/ warning
      {
        robotState: { count: 17 },
        commands: [{ command: 'add', params: { value: 1 } }],
        warnings: [
          {
            message: 'adding 1 with warning example',
            type: 'ADD_WARNING',
          },
        ],
      },
      // Python hello world
      {
        robotState: { count: 17 },
        commands: [],
        warnings: [],
        python: 'print("Hello world")',
      },
    ])
  })
})
